# Ultra Run Planner — PROJECT.md

> **Scope**: A personal web app to plan long‑distance runs (single user; no sign‑in).  
> **Core**: Sleek dashboard with collapsible sidebar, GPX/TCX ingestion, route mapping, planning maths (including elevation and fatigue adjustments), printable plan, Postgres backend (PostGIS + pgvector), and an “Ask AI” tile backed by local documents + web.

---

## Table of Contents

1. [Functional Overview](#functional-overview)  
2. [Non‑Goals](#non-goals)  
3. [Tech Stack](#tech-stack)  
4. [UI/UX Spec](#uiux-spec)  
5. [Data Model (Postgres)](#data-model-postgres)  
6. [Backend APIs (suggested)](#backend-apis-suggested)  
7. [Calculations & Algorithms](#calculations--algorithms)  
8. [Actual vs Plan](#actual-vs-plan)  
9. [“Ask AI” (RAG)](#ask-ai-rag)  
10. [Map & Elevation](#map--elevation)  
11. [Printing & Export](#printing--export)  
12. [Performance & Reliability](#performance--reliability)  
13. [Accessibility & Internationalisation](#accessibility--internationalisation)  
14. [Acceptance Criteria](#acceptance-criteria)  
15. [Example Compute Pseudocode](#example-compute-pseudocode)  
16. [Developer Notes](#developer-notes)  
17. [Open Questions](#open-questions)  
18. [Implementation Milestones](#implementation-milestones)  
19. [Repository Structure](#repository-structure)  
20. [Local Development (Docker)](#local-development-docker)  
21. [Appendices](#appendices)

---

## Functional Overview

1. **Load a route**
   - Import a GPX file (primary) for a planned event; later allow TCX for *actuals*.
   - Store the original file compactly (gzip). Precompute a simplified polyline for rendering/analysis.
   - Plot the route on an interactive map.

2. **Plan**
   - Add user points snapped to the route (types: *checkpoint, food, water, rest*).
   - Enter event metadata: **planned date**, **name**, **total distance**, **target duration**, **start time**, and **units** (mi/km).
   - For each user point, set **name**, **comment**, and **stop time (0–600 min)**.
   - Set global tuning: elevation gain/descent adjustments and a fatigue slow‑down factor.
   - System computes paces per leg (following the route, not straight line), ETA at each point, stop time, and departure time.
   - Preserve the exact calculations used for each saved **Plan Version**.

3. **Dashboard**
   - Tiled layout (grid). Each tile has a **pop‑out** to enlarge (modal/drawer).
   - Tiles: **Map**, **Elevation Profile**, **Plan Table**, **Stats**, **Ask AI**, **Comparison** (when actuals exist).

4. **Print / Export**
   - Print‑friendly plan (A4). Optionally export to PDF and CSV.

5. **Actual vs Plan**
   - Import “actual” GPX or TCX post‑race.
   - Overlay on the map; compute leg deltas and variance; side‑by‑side tables and charts.

6. **Ask AI**
   - Sidebar fields for **OpenAI** and **OpenRouter** API keys (stored in browser local storage).
   - Vector store with **pgvector** using **text‑embedding‑3‑small** (1536‑dim).
   - Ingestion supports `.txt` and `.pdf`. Strategy: embed both a **document‑level summary** and **chunk‑level** text.

---

## Non‑Goals

- No multi‑user authentication/authorisation beyond basic hygiene.
- No complex collaboration or cloud sharing.
- No paid tile providers by default; prefer open options.

---

## Tech Stack

- **Frontend**: TypeScript + React (Vite), minimal component lib, TailwindCSS (or equivalent).
- **Map**: MapLibre GL JS + open tiles (e.g. OSM/MapTiler; provide key if required).
- **Backend**: FastAPI (Python) *or* Node/Express with TypeScript — pick one and stay consistent.
- **Database**: PostgreSQL 15+ with **PostGIS** and **pgvector**.
- **Parsing**:
  - GPX/TCX: robust parser (`gpxpy` in Python, or GPX→GeoJSON in JS).
  - PDF: `pypdf` / `pdfminer.six` (Python) or `pdf-parse` (Node).
- **Background tasks** (optional): Celery/RQ (Python) or BullMQ (Node) for heavy file processing.
- **Testing**: Unit tests for maths and leg logic; light E2E for critical flows.

---

## UI/UX Spec

### Layout

- **Header**: event selector; event name, date, total distance, target duration; actions (Print, Save Plan Version, Load Actual).
- **Sidebar (collapsible)**:
  - **Routes**: Load GPX, Reprocess, Delete.
  - **Event**: Name, Date, Start Time, Units (mi/km), Target Duration.
  - **Adjustments**:
    - Uphill penalty % (per 100 m gain per km of leg).
    - Downhill benefit % (per 100 m descent per km; benefit capped).
    - Fatigue slow‑down % (linear from start to finish).
  - **Points**: add/rename type, comment, stop minutes (0–600).
  - **AI**: OpenAI and/or OpenRouter keys; add TXT/PDF to vector store.
  - **Utilities**: Print Plan, Export PDF, Export CSV.

- **Main Grid (tiles)** *(each tile has “expand”)*:
  1) **Map** — route polyline, user points, snapping aid; toggle layers (planned vs actual).
  2) **Elevation Profile** — hover links to map position; shows gain/descent per leg.
  3) **Plan Table** — leg distance, moving pace, moving time, arrival, stop, departure; cumulative columns.
  4) **Stats** — totals, total stops, average moving pace, GAP‑like pace, total gain/descent.
  5) **Ask AI** — RAG chat (vector store → web → model fallback).
  6) **Comparison** (post‑race) — leg deltas, variance plots, split chart.

### Interactions

- **Add point**: click on map → snap to nearest route position; choose type; set name/comment/stop.
- **Order**: points auto‑ordered by “along‑route” measure (not by creation time).
- **Validation**: warn if target duration ≤ total stops; prevent negative moving time.
- **Units**: switchable; internal SI; display converts with correct pace formatting.

---

## Data Model (Postgres)

> Use **PostGIS** for geometry and **pgvector** for embeddings. Keep original files compact (gzip), and store simplified geometry for rendering/analysis.

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- for gen_random_uuid()

-- Core
CREATE TABLE events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  planned_date      DATE NOT NULL,
  start_time_local  TIME NOT NULL DEFAULT '06:00',
  units             TEXT NOT NULL CHECK (units IN ('mi','km')),
  target_duration_s INTEGER NOT NULL CHECK (target_duration_s > 0),
  total_distance_m  INTEGER NOT NULL CHECK (total_distance_m > 0),
  up_penalty_pct_per_100m   NUMERIC(5,2) NOT NULL DEFAULT 0,
  down_benefit_pct_per_100m NUMERIC(5,2) NOT NULL DEFAULT 0,
  fatigue_pct       NUMERIC(5,2) NOT NULL DEFAULT 0, -- e.g. 5.00
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE routes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  original_gpx_gz    BYTEA NOT NULL,                 -- gzip-compressed GPX
  original_size_b    INTEGER NOT NULL,
  simplified_geom    geometry(LineString, 4326) NOT NULL,
  length_m           INTEGER NOT NULL,               -- geodesic length
  elevation_profile  JSONB NOT NULL,                 -- [{d_m, ele_m}] decimated
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE point_kind AS ENUM ('checkpoint','food','water','rest');

CREATE TABLE route_points (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  kind           point_kind NOT NULL,
  comment        TEXT,
  stop_min       INTEGER NOT NULL CHECK (stop_min BETWEEN 0 AND 600),
  geom           geometry(Point, 4326) NOT NULL,
  -- linear referencing along the route: 0..1 fraction
  route_measure  NUMERIC(10,8) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Preserved plan outputs (immutable per version)
CREATE TABLE plan_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label             TEXT NOT NULL, -- e.g. "v1 baseline"
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  params_snapshot   JSONB NOT NULL, -- copies of adjustments, etc.
  table_snapshot    JSONB NOT NULL  -- rows with legs and cumulatives
);

-- Actual track import
CREATE TABLE actuals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  source_kind       TEXT NOT NULL CHECK (source_kind IN ('gpx','tcx')),
  file_gz           BYTEA NOT NULL,
  simplified_geom   geometry(LineString, 4326) NOT NULL,
  length_m          INTEGER NOT NULL,
  elevation_profile JSONB NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vector store
CREATE TABLE ai_docs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename      TEXT NOT NULL,
  mime          TEXT NOT NULL,
  doc_text      TEXT,             -- for txt; OCR text for pdf if extracted
  summary       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Embeddings: OpenAI text-embedding-3-small has 1536 dimensions
CREATE TABLE ai_chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id        UUID NOT NULL REFERENCES ai_docs(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  chunk_text    TEXT NOT NULL,
  chunk_embed   vector(1536) NOT NULL,
  summary_embed vector(1536) NOT NULL
);

-- Indexes
CREATE INDEX ON route_points (event_id, route_measure);
CREATE INDEX ON ai_chunks USING ivfflat (chunk_embed vector_cosine_ops);
CREATE INDEX ON ai_chunks USING ivfflat (summary_embed vector_cosine_ops);
