# Ultra Running Planner - Application Specification

## Overview
A personal web-based application for planning and analyzing long-distance running events. The app enables route planning with GPX files, pace calculations with elevation and fatigue adjustments, waypoint management, and post-race analysis with AI-assisted planning support.

## Technology Stack

### Backend
- **Framework**: Python (FastAPI or Flask) or Node.js (Express)
- **Database**: PostgreSQL with PGVector extension
- **Container**: Docker with docker-compose

### Frontend
- **Framework**: React, Vue, or Svelte (recommend React for component library ecosystem)
- **Mapping**: Leaflet.js or Mapbox GL JS
- **Styling**: Tailwind CSS or Material-UI for sleek, modern UI
- **Charts**: Chart.js or Recharts for data visualization

### AI/ML
- **Embeddings**: Opera text embedding small
- **LLM APIs**: OpenAI (ChatGPT) and OpenRouter
- **Vector Store**: PGVector

---

## Application Architecture

### Database Schema

#### `events` Table
```sql
- id (UUID, primary key)
- name (VARCHAR, not null)
- planned_date (TIMESTAMP, not null)
- distance (DECIMAL) -- in user's preferred unit
- target_duration_minutes (INTEGER)
- elevation_gain_adjustment_percent (DECIMAL, default 0)
- elevation_descent_adjustment_percent (DECIMAL, default 0)
- fatigue_slowdown_percent (DECIMAL, default 0)
- gpx_route (JSONB) -- optimized storage of coordinates
- gpx_metadata (JSONB) -- elevation, total distance, etc.
- actual_gpx_data (JSONB) -- post-race actual route
- actual_tcx_data (JSONB) -- alternative format
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `waypoints` Table
```sql
- id (UUID, primary key)
- event_id (UUID, foreign key)
- name (VARCHAR)
- waypoint_type (ENUM: 'checkpoint', 'food', 'water', 'rest')
- latitude (DECIMAL)
- longitude (DECIMAL)
- elevation (DECIMAL, nullable)
- stop_time_minutes (INTEGER, 0-600)
- comments (TEXT)
- order_index (INTEGER) -- sequence along route
- distance_from_start (DECIMAL) -- cumulative distance
- created_at (TIMESTAMP)
```

#### `calculated_legs` Table
```sql
- id (UUID, primary key)
- event_id (UUID, foreign key)
- leg_number (INTEGER)
- start_waypoint_id (UUID, nullable for leg 1)
- end_waypoint_id (UUID)
- leg_distance (DECIMAL)
- elevation_gain (DECIMAL)
- elevation_loss (DECIMAL)
- base_pace (DECIMAL) -- minutes per distance unit
- adjusted_pace (DECIMAL) -- with elevation/fatigue
- expected_arrival_time (TIMESTAMP)
- stop_time_minutes (INTEGER)
- exit_time (TIMESTAMP)
- cumulative_distance (DECIMAL)
- cumulative_time_minutes (INTEGER)
- created_at (TIMESTAMP)
```

#### `documents` Table (for AI Vector Store)
```sql
- id (UUID, primary key)
- filename (VARCHAR)
- file_type (VARCHAR) -- 'txt', 'pdf'
- content (TEXT)
- summary (TEXT) -- full document summary for embedding
- uploaded_at (TIMESTAMP)
```

#### `document_chunks` Table
```sql
- id (UUID, primary key)
- document_id (UUID, foreign key)
- chunk_index (INTEGER)
- chunk_text (TEXT)
- chunk_with_summary (TEXT) -- chunk + document summary
- embedding (VECTOR(dimension)) -- PGVector embedding
- created_at (TIMESTAMP)
```

#### `user_settings` Table
```sql
- id (UUID, primary key)
- distance_unit (ENUM: 'miles', 'kilometers', default 'miles')
- pace_format (VARCHAR, default 'mm:ss')
- elevation_unit (ENUM: 'meters', 'feet', default 'feet')
- openai_api_key (VARCHAR, encrypted)
- openrouter_api_key (VARCHAR, encrypted)
- style_preferences (JSONB)
```

---

## GPX Optimization Strategy

### Storage Approach
1. **Simplify coordinates**: Use Douglas-Peucker algorithm to reduce points while maintaining route accuracy
2. **Store as JSONB**: Compress coordinate arrays
3. **Metadata extraction**: Pre-calculate total distance, elevation profile, bounding box
4. **Separate storage**: Keep raw GPX file optional (compressed binary) and working data as optimized JSON

### Example Optimized Structure
```json
{
  "coordinates": [[lat, lon, ele], ...],
  "total_distance_meters": 50000,
  "elevation_gain_meters": 1200,
  "elevation_loss_meters": 1180,
  "min_elevation": 250,
  "max_elevation": 890,
  "bounding_box": [[min_lat, min_lon], [max_lat, max_lon]]
}
```

---

## Core Features

### 1. Dashboard Layout

#### Main Dashboard
- **Tiled layout** with the following tiles (each expandable via click):
  - **Map View** (primary, largest tile)
  - **Pace Calculator** (input fields for target time, adjustments)
  - **Leg-by-Leg Table** (scrollable results table)
  - **Event Summary** (name, date, distance, target)
  - **Actual vs. Planned Comparison** (after race analysis)
  - **Ask AI** (chat interface)
  - **Statistics Dashboard** (charts: elevation profile, pace distribution)

#### Sidebar (Collapsible)
- **Toggle button** to show/hide
- **Sections**:
  - **File Operations**
    - Load GPX file
    - Load Actual GPX/TCX
    - Export/Print Plan
  - **Event Settings**
    - Event name, date, distance
    - Target duration
  - **Pace Adjustments**
    - Elevation gain % adjustment (slider/input)
    - Elevation descent % adjustment
    - Fatigue slowdown % (applied linearly from mile 1 to final mile)
  - **Units & Display**
    - Distance unit (Miles/KM toggle)
    - Pace format (mm:ss per mile/km)
    - Elevation unit (meters/feet)
  - **AI Assistant Settings**
    - OpenAI API key input
    - OpenRouter API key input
    - Upload documents (txt/pdf)
    - Manage vector store
  - **Style Preferences**
    - Upload style guide JSON or image

---

### 2. Map Functionality

#### GPX Route Visualization
- Plot GPX route on interactive map (Leaflet/Mapbox)
- Show elevation profile overlay/tooltip on hover
- Color-code route by elevation or pace zones

#### Waypoint Management
- **Add waypoints** by clicking on map
- **Waypoint types**: Checkpoint, Food, Water, Rest (different icons/colors)
- **Edit waypoint**: Click to open modal with:
  - Name input
  - Type selector
  - Stop time (0-600 minutes slider/input)
  - Comments textarea
- **Drag waypoints** to reposition
- **Delete waypoints**
- **Auto-order**: Calculate distance from start and sequence

#### Route Statistics Overlay
- Total distance
- Total elevation gain/loss
- Number of waypoints
- Estimated total time

---

### 3. Pace Calculation Engine

#### Base Calculations
1. **Overall Average Pace** = Target Duration / Total Distance
2. **Moving Average Pace** = (Target Duration - Total Stop Time) / Total Distance
3. **Leg Distance**: Calculate distance between waypoints along GPX route (not straight line)

#### Elevation Adjustments
- **Gain Adjustment**: For every X feet/meters of gain, add Y% to pace
  - Formula: `adjusted_pace = base_pace * (1 + (elevation_gain / distance) * gain_adjustment_percent)`
- **Descent Adjustment**: Similar formula for descent (typically negative adjustment, i.e., faster)

#### Fatigue Slowdown
- **Linear degradation** from mile/km 1 to final mile/km
- If slowdown = 5%, final mile is 5% slower than first mile
- Each leg's pace multiplier = `1 + (leg_position / total_legs) * (slowdown_percent / 100)`
- Distribute slowdown linearly across all legs

#### Leg-by-Leg Table Columns
| Leg | Waypoint Name | Leg Distance | Elevation +/- | Base Pace | Adjusted Pace | Leg Duration | ETA | Stop Time | Exit Time | Cumulative Distance | Cumulative Time |
|-----|---------------|--------------|---------------|-----------|---------------|--------------|-----|-----------|-----------|--------------------|--------------------|

- **Export options**: CSV, PDF, Print-friendly view

---

### 4. Actual vs. Planned Analysis

#### Upload Actual Data
- Load actual GPX or TCX file post-race
- Parse actual time stamps, coordinates, heart rate (if available)

#### Comparison View
- **Overlay routes**: Planned (blue) vs Actual (red) on map
- **Side-by-side table**:
  - Planned ETA vs Actual Time for each waypoint
  - Planned pace vs Actual pace per leg
  - Deviations (early/late, faster/slower)
- **Summary statistics**:
  - Total time difference
  - Average pace difference
  - Biggest deviation leg
  - On-time percentage

#### Visualizations
- **Pace comparison chart**: Line graph of planned vs actual pace over distance
- **Elevation profile comparison**: Planned route elevation vs actual
- **Time deviation graph**: Bar chart showing early/late at each waypoint

---

### 5. AI Assistant

#### Vector Store Setup
1. **Document upload**: txt and pdf files via sidebar
2. **Processing pipeline**:
   - Extract text from pdf (pypdf or pdfplumber)
   - Generate full document summary using LLM
   - Chunk document (500-1000 tokens per chunk)
   - Create embeddings: `chunk_text + "\n\nDocument Context: " + document_summary`
   - Store in `document_chunks` table with PGVector

3. **Embedding Model**: Opera text embedding small (via OpenRouter or local)

#### Chat Interface ("Ask AI" Tile)
- **Chat UI**: Message input, conversation history
- **Query pipeline**:
  1. **Vector search**: Query vector store for relevant chunks (top 5)
  2. **Web search**: If vector results insufficient or query seems to need current info
  3. **LLM reasoning**: Use ChatGPT or OpenRouter with context:
     - Retrieved document chunks
     - Web search results
     - Conversation history
     - Event data (current plan, route details)

#### Example Queries
- "What's a good fueling strategy for a 50-mile race?"
- "Based on my documents, what was my average pace in past ultras?"
- "What's the elevation gain on the Western States course?"
- "Recommend a training plan for this event"

---

### 6. Units & Settings

#### User Preferences (Persistent)
- **Distance**: Miles or Kilometers
- **Pace**: mm:ss per mile, mm:ss per km, mph, kph
- **Elevation**: Feet or Meters
- **Date/Time Format**: 12hr or 24hr
- **Theme**: Light/Dark mode (optional)

#### Style Guide Support
- Allow upload of JSON with color scheme, fonts, spacing
- Or upload an image reference for styling direction
- Apply across dashboard tiles

---

## API Endpoints (Backend)

### Events
- `POST /api/events` - Create new event
- `GET /api/events` - List all events
- `GET /api/events/{id}` - Get event details
- `PUT /api/events/{id}` - Update event
- `DELETE /api/events/{id}` - Delete event

### GPX/Route
- `POST /api/events/{id}/upload-gpx` - Upload and process GPX file
- `POST /api/events/{id}/upload-actual` - Upload actual GPX/TCX
- `GET /api/events/{id}/route` - Get optimized route data

### Waypoints
- `POST /api/events/{id}/waypoints` - Add waypoint
- `PUT /api/waypoints/{id}` - Update waypoint
- `DELETE /api/waypoints/{id}` - Delete waypoint
- `GET /api/events/{id}/waypoints` - List all waypoints for event

### Calculations
- `POST /api/events/{id}/calculate` - Trigger pace calculation
- `GET /api/events/{id}/legs` - Get leg-by-leg breakdown
- `GET /api/events/{id}/comparison` - Get planned vs actual analysis

### AI Assistant
- `POST /api/documents/upload` - Upload document to vector store
- `DELETE /api/documents/{id}` - Remove document
- `POST /api/chat` - Send chat message, get AI response
- `GET /api/chat/history` - Get conversation history

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings

---

## Docker Setup

### docker-compose.yml Structure
```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: ultraplanner
      POSTGRES_USER: runner
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://runner:${DB_PASSWORD}@db:5432/ultraplanner
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
    depends_on:
      - db
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend
    environment:
      VITE_API_URL: http://localhost:8000
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  pgdata:
```

### Environment Variables
- `DB_PASSWORD`
- `OPENAI_API_KEY` (optional, can be set in UI)
- `OPENROUTER_API_KEY` (optional, can be set in UI)

---

## Implementation Priorities

### Phase 1 - Core Functionality
1. Database setup with PostgreSQL
2. GPX upload and optimization
3. Map visualization with Leaflet
4. Basic waypoint creation/editing
5. Simple pace calculation (no adjustments)
6. Leg-by-leg table display

### Phase 2 - Advanced Calculations
1. Elevation gain/descent adjustments
2. Fatigue slowdown implementation
3. Accurate distance calculation along route between waypoints
4. Export/print functionality

### Phase 3 - Post-Race Analysis
1. Actual GPX/TCX upload
2. Route comparison visualization
3. Pace deviation analysis
4. Statistics and charts

### Phase 4 - AI Assistant
1. PGVector setup
2. Document upload and embedding
3. Chat interface
4. RAG pipeline with web search integration

### Phase 5 - Polish
1. Units and settings persistence
2. Style guide implementation
3. UI/UX refinements
4. Dashboard tile expand/collapse animations
5. Responsive design

---

## Key Technical Considerations

### GPX Distance Calculation
- Use Haversine formula for distance between coordinates
- Account for elevation in 3D distance calculation
- Implement route snapping to find waypoint positions on GPX track

### Pace Adjustment Algorithm
```python
def calculate_adjusted_pace(
    base_pace, 
    elevation_gain, 
    elevation_loss, 
    leg_distance,
    gain_adjustment_pct,
    loss_adjustment_pct,
    leg_position,
    total_legs,
    fatigue_slowdown_pct
):
    # Elevation adjustment
    gain_factor = (elevation_gain / leg_distance) * (gain_adjustment_pct / 100)
    loss_factor = (elevation_loss / leg_distance) * (loss_adjustment_pct / 100)
    elevation_adjusted_pace = base_pace * (1 + gain_factor - loss_factor)
    
    # Fatigue adjustment (linear degradation)
    fatigue_factor = (leg_position / total_legs) * (fatigue_slowdown_pct / 100)
    final_pace = elevation_adjusted_pace * (1 + fatigue_factor)
    
    return final_pace
```

### Vector Store Query
```python
async def query_vector_store(query_text, limit=5):
    # Generate embedding for query
    query_embedding = await generate_embedding(query_text)
    
    # PGVector similarity search
    results = await db.execute(
        """
        SELECT c.chunk_text, c.chunk_with_summary, d.filename,
               1 - (c.embedding <=> $1) as similarity
        FROM document_chunks c
        JOIN documents d ON c.document_id = d.id
        ORDER BY c.embedding <=> $1
        LIMIT $2
        """,
        query_embedding, limit
    )
    
    return results
```

---

## Testing Strategy

### Unit Tests
- Distance calculations
- Pace adjustment formulas
- GPX parsing and optimization
- Elevation profile generation

### Integration Tests
- API endpoints
- Database operations
- GPX upload pipeline
- Vector store embedding and retrieval

### E2E Tests
- Complete workflow: create event → upload GPX → add waypoints → calculate → view results
- Actual vs planned comparison flow
- AI assistant query flow

---

## Missing Areas / Questions

### To Consider:
1. **Weather integration**: Should the app pull weather data for the event date/location?
2. **Training plan integration**: Track training leading up to event?
3. **Nutrition calculator**: Auto-suggest fueling based on duration/intensity?
4. **Crew/pacer tracking**: Add crew access points or pacer exchanges?
5. **Multi-lap courses**: Support for repeated loop courses?
6. **Sharing/Export**: Generate shareable links or PDFs for crew?
7. **Historical events**: Archive of past races with notes and lessons learned?
8. **Backup/Restore**: Export entire database for backup?
9. **Mobile responsiveness**: Primary mobile UI or desktop-first?
10. **Offline mode**: Service worker for offline access during race?

### Performance Optimization:
- **Map rendering**: Lazy load map tiles, throttle waypoint updates
- **Large GPX files**: Handle 10,000+ point routes efficiently
- **Vector search**: Index strategy for fast retrieval
- **Caching**: Redis layer for calculated results?

### Security Notes:
- Even for personal use, encrypt API keys in database
- Use environment variables for sensitive config
- HTTPS recommended if exposed beyond localhost
- Consider backup strategy for race day (offline capability)

---

## Next Steps

1. Review this specification for completeness
2. Refine any ambiguous requirements
3. Choose specific tech stack (recommend: React + FastAPI + PostgreSQL)
4. Set up development environment
5. Initialize Git repository
6. Begin Phase 1 implementation
