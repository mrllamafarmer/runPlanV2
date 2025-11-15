# Database Schema

## Overview

The Ultra Running Planner uses PostgreSQL with the PGVector extension for vector embeddings. All tables are automatically created when the application starts using SQLAlchemy ORM.

## Automatic Table Creation

### How It Works

When you run `docker-compose up`, the backend automatically:

1. **Enables Extensions** (`init.sql`):
   - `vector` - For PGVector embeddings
   - `uuid-ossp` - For UUID generation

2. **Creates Enum Types** (`init.sql`):
   - `waypoint_type` - checkpoint, food, water, rest
   - `distance_unit` - miles, kilometers
   - `elevation_unit` - meters, feet

3. **Creates All Tables** (`database.py` → `init_db()`):
   - Uses SQLAlchemy's `Base.metadata.create_all()`
   - Imports all model classes
   - Creates tables with proper foreign keys and indexes

### No Manual Setup Required

✅ New installations work out of the box  
✅ Tables are created automatically on first run  
✅ Schema updates happen when models change  
✅ Foreign keys and indexes are created automatically

## Database Tables

### 1. events
Stores ultra running events/races.

```sql
CREATE TABLE events (
    id UUID PRIMARY KEY,
    name VARCHAR NOT NULL,
    planned_date TIMESTAMP NOT NULL,
    distance FLOAT,
    target_duration_minutes INTEGER,
    elevation_gain_adjustment_percent FLOAT DEFAULT 0,
    elevation_descent_adjustment_percent FLOAT DEFAULT 0,
    fatigue_slowdown_percent FLOAT DEFAULT 0,
    gpx_route JSON,
    gpx_metadata JSON,
    actual_gpx_data JSON,
    actual_tcx_data JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);
```

**Purpose:** Main event entity containing route data and planning parameters.

### 2. waypoints
Checkpoints, aid stations, and markers along the route.

```sql
CREATE TABLE waypoints (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR,
    waypoint_type waypoint_type ENUM,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    elevation FLOAT,
    stop_time_minutes INTEGER DEFAULT 0,
    comments TEXT,
    order_index INTEGER,
    distance_from_start FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose:** Waypoints along the route (START, FINISH, and custom waypoints).

**Special Waypoints:**
- `START` - Auto-created at beginning of route
- `FINISH` - Auto-created at end of route

### 3. calculated_legs
Calculated pace and timing for each leg between waypoints.

```sql
CREATE TABLE calculated_legs (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    leg_number INTEGER NOT NULL,
    start_waypoint_id UUID REFERENCES waypoints(id) ON DELETE SET NULL,
    end_waypoint_id UUID REFERENCES waypoints(id) ON DELETE CASCADE,
    leg_distance FLOAT,
    elevation_gain FLOAT,
    elevation_loss FLOAT,
    base_pace FLOAT,
    adjusted_pace FLOAT,
    expected_arrival_time TIMESTAMP,
    stop_time_minutes INTEGER,
    exit_time TIMESTAMP,
    cumulative_distance FLOAT,
    cumulative_time_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose:** Stores pace calculations with elevation and fatigue adjustments.

### 4. documents
User-uploaded training documents for RAG.

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    filename VARCHAR NOT NULL,
    file_type VARCHAR,
    content TEXT,
    summary TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose:** Store training documents for AI assistant context.

### 5. document_chunks
Text chunks with vector embeddings for RAG search.

```sql
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT,
    chunk_with_summary TEXT,
    embedding VECTOR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose:** Chunked text with embeddings for semantic search.

**Vector Dimension:** 512 (Opera text embedding small)

### 6. user_settings
Application settings including encrypted API keys.

```sql
CREATE TABLE user_settings (
    id UUID PRIMARY KEY,
    distance_unit distance_unit ENUM DEFAULT 'miles',
    pace_format VARCHAR DEFAULT 'mm:ss',
    elevation_unit elevation_unit ENUM DEFAULT 'feet',
    openai_api_key VARCHAR,  -- encrypted
    openrouter_api_key VARCHAR,  -- encrypted
    style_preferences JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);
```

**Purpose:** User preferences and encrypted API keys.

**Security:** API keys are encrypted using Fernet (symmetric encryption).

### 7. chat_sessions (NEW)
AI assistant chat sessions, one per conversation.

```sql
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    title VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);
```

**Purpose:** Organize chat conversations per event.

**Features:**
- Linked to events (optional)
- Title auto-generated from first message
- Updated timestamp on new messages

### 8. chat_messages (NEW)
Individual messages in chat conversations.

```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR NOT NULL,  -- 'user' or 'assistant'
    content TEXT NOT NULL,
    sources JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose:** Store all chat messages with timestamps.

**Fields:**
- `role` - Either "user" (human) or "assistant" (AI)
- `content` - Message text
- `sources` - Citations/references (for assistant messages)

## Entity Relationships

```
events (1) ──→ (N) waypoints
events (1) ──→ (N) calculated_legs
events (1) ──→ (N) chat_sessions

waypoints (1) ──→ (N) calculated_legs (start_waypoint)
waypoints (1) ──→ (N) calculated_legs (end_waypoint)

documents (1) ──→ (N) document_chunks

chat_sessions (1) ──→ (N) chat_messages
```

### Cascade Deletion

When you delete:
- **Event** → All waypoints, legs, and chat sessions are deleted
- **Waypoint** → End waypoint legs are deleted, start waypoint legs set to NULL
- **Document** → All chunks are deleted
- **Chat Session** → All messages are deleted

## Indexes

SQLAlchemy automatically creates:
- Primary key indexes on all `id` columns
- Foreign key indexes for relationships
- Order indexes for `waypoints.order_index` and `calculated_legs.leg_number`

## Vector Search

The `document_chunks.embedding` column uses PGVector for semantic search:

```sql
-- Find similar chunks using cosine distance
SELECT chunk_text 
FROM document_chunks 
ORDER BY embedding <=> '[...]' 
LIMIT 5;
```

**Operators:**
- `<=>` - Cosine distance
- `<->` - L2 distance
- `<#>` - Inner product

## Data Types

### PostgreSQL Types Used
- `UUID` - All primary keys (generated by Python `uuid.uuid4()`)
- `VARCHAR` - String fields without length limit
- `TEXT` - Long text content
- `FLOAT` - Decimal numbers (distance, elevation, pace)
- `INTEGER` - Whole numbers (duration, stop time)
- `JSON` - Structured data (GPX routes, metadata, preferences)
- `TIMESTAMP WITH TIME ZONE` - Dates and times
- `VECTOR(512)` - PGVector embeddings

### Custom Enum Types
- `waypoint_type` - checkpoint | food | water | rest
- `distance_unit` - miles | kilometers
- `elevation_unit` - meters | feet

## Database Initialization

### First Time Setup

1. Docker Compose starts PostgreSQL container
2. `init.sql` runs (creates extensions and enums)
3. Backend starts and calls `init_db()`
4. SQLAlchemy creates all tables
5. Application is ready to use

### Code Reference

**backend/database.py:**
```python
def init_db():
    """Initialize database tables"""
    from models import (
        Event, Waypoint, CalculatedLeg, 
        Document, DocumentChunk, UserSettings,
        ChatSession, ChatMessage  # Added for chat persistence
    )
    Base.metadata.create_all(bind=engine)
```

**backend/main.py:**
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()  # Called on startup
    yield
```

## Manual Database Access

### Connect to Database

```bash
docker-compose exec db psql -U runner -d ultraplanner
```

### Useful Commands

```sql
-- List all tables
\dt

-- Describe a table
\d table_name

-- List all enums
\dT

-- List extensions
\dx

-- Check PGVector installation
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Count records
SELECT 
    'events' as table, COUNT(*) FROM events
UNION ALL SELECT 'waypoints', COUNT(*) FROM waypoints
UNION ALL SELECT 'chat_sessions', COUNT(*) FROM chat_sessions
UNION ALL SELECT 'chat_messages', COUNT(*) FROM chat_messages;

-- View chat sessions for an event
SELECT cs.id, cs.title, cs.created_at, COUNT(cm.id) as message_count
FROM chat_sessions cs
LEFT JOIN chat_messages cm ON cm.session_id = cs.id
WHERE cs.event_id = 'your-event-uuid'
GROUP BY cs.id, cs.title, cs.created_at
ORDER BY cs.updated_at DESC;
```

## Backup and Restore

### Backup

```bash
# Backup all data
docker-compose exec db pg_dump -U runner ultraplanner > backup.sql

# Backup specific table
docker-compose exec db pg_dump -U runner -t chat_sessions ultraplanner > chat_backup.sql
```

### Restore

```bash
# Restore from backup
docker-compose exec -T db psql -U runner ultraplanner < backup.sql
```

### Automatic Backups

The `./data/postgres` directory contains all database files:
- Backup this directory for complete data preservation
- Survives `docker-compose down --rmi all`
- Can be copied to another machine

## Migration Notes

### Adding New Tables

1. Add model to `backend/models.py`
2. Import model in `init_db()` in `backend/database.py`
3. Restart backend (tables are created automatically)

### Modifying Existing Tables

SQLAlchemy doesn't auto-migrate schema changes. For production:
1. Use Alembic for migrations
2. Or manually write SQL migration scripts

For development:
```bash
# Nuclear option: drop and recreate
docker-compose down -v
docker-compose up --build
```

## Performance Considerations

### Indexes
- Primary keys are automatically indexed
- Foreign keys are automatically indexed
- Consider adding indexes on frequently queried columns

### Vector Search
- PGVector uses HNSW or IVFFlat indexes for fast search
- Current setup uses exact search (fine for small datasets)
- For production with many documents, add:
  ```sql
  CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops);
  ```

### Query Optimization
- Use `JOIN` instead of multiple queries
- Limit results with `LIMIT` and pagination
- Use `EXPLAIN ANALYZE` to debug slow queries

## Security

### Encrypted Fields
- `user_settings.openai_api_key` - Encrypted with Fernet
- `user_settings.openrouter_api_key` - Encrypted with Fernet

### Environment Variable
```bash
ENCRYPTION_KEY=your-base64-encoded-key
```

Set in `docker-compose.yml` for consistent encryption across restarts.

### Database Password
```bash
DB_PASSWORD=ultrarunner2024  # Change for production!
```

## Troubleshooting

### Tables Not Created

```bash
# Check backend logs
docker-compose logs backend | grep -i error

# Manually trigger creation
docker-compose exec backend python -c "from database import init_db; init_db()"
```

### Foreign Key Errors

```bash
# Check relationships
\d+ table_name

# Verify parent record exists
SELECT id FROM events WHERE id = 'your-uuid';
```

### PGVector Errors

```bash
# Verify extension is installed
docker-compose exec db psql -U runner -d ultraplanner -c "SELECT * FROM pg_extension WHERE extname = 'vector';"

# Reinstall if needed
docker-compose exec db psql -U runner -d ultraplanner -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

## Summary

✅ **8 tables** total (2 new for chat persistence)  
✅ **Automatic creation** on first startup  
✅ **No manual SQL** required  
✅ **Foreign keys** properly configured  
✅ **Cascade deletion** for data integrity  
✅ **Vector embeddings** for AI search  
✅ **Encrypted API keys** for security  

The database schema is production-ready and fully automated for new installations!

