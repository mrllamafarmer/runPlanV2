-- ============================================================================
-- Ultra Running Planner - Complete Database Initialization Script
-- ============================================================================
-- This script ensures all tables, columns, enums, and extensions exist
-- Safe for both new installations and existing databases (idempotent)
-- ============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Waypoint types (checkpoint, food, water, rest)
DO $$ BEGIN
    CREATE TYPE waypoint_type AS ENUM ('checkpoint', 'food', 'water', 'rest');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Distance units (miles, kilometers)
DO $$ BEGIN
    CREATE TYPE distance_unit AS ENUM ('miles', 'kilometers');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Elevation units (meters, feet)
DO $$ BEGIN
    CREATE TYPE elevation_unit AS ENUM ('meters', 'feet');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLE: events
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================================================
-- TABLE: waypoints
-- ============================================================================
CREATE TABLE IF NOT EXISTS waypoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR,
    waypoint_type waypoint_type,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    elevation FLOAT,
    stop_time_minutes INTEGER DEFAULT 0,
    comments TEXT,
    order_index INTEGER,
    distance_from_start FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waypoints_event_id ON waypoints(event_id);
CREATE INDEX IF NOT EXISTS idx_waypoints_order_index ON waypoints(order_index);

-- ============================================================================
-- TABLE: calculated_legs
-- ============================================================================
CREATE TABLE IF NOT EXISTS calculated_legs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE INDEX IF NOT EXISTS idx_calculated_legs_event_id ON calculated_legs(event_id);
CREATE INDEX IF NOT EXISTS idx_calculated_legs_leg_number ON calculated_legs(leg_number);

-- ============================================================================
-- TABLE: documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR NOT NULL,
    file_type VARCHAR,
    content TEXT,
    summary TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: document_chunks
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT,
    chunk_with_summary TEXT,
    embedding VECTOR(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);

-- ============================================================================
-- TABLE: user_settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distance_unit distance_unit DEFAULT 'miles',
    pace_format VARCHAR DEFAULT 'mm:ss',
    elevation_unit elevation_unit DEFAULT 'feet',
    openai_api_key VARCHAR,
    ai_model VARCHAR DEFAULT 'gpt-5-nano-2025-08-07',
    reasoning_effort VARCHAR DEFAULT 'low',
    style_preferences JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- TABLE: chat_sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    title VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_event_id ON chat_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);

-- ============================================================================
-- TABLE: chat_messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR NOT NULL,
    content TEXT NOT NULL,
    sources JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- ============================================================================
-- MIGRATIONS FOR EXISTING DATABASES
-- ============================================================================

-- Add ai_model column to user_settings if it doesn't exist
DO $$ BEGIN
    ALTER TABLE user_settings ADD COLUMN ai_model VARCHAR DEFAULT 'gpt-5-nano-2025-08-07';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add reasoning_effort column to user_settings if it doesn't exist
DO $$ BEGIN
    ALTER TABLE user_settings ADD COLUMN reasoning_effort VARCHAR DEFAULT 'low';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Update existing embedding columns to correct dimension (1536 for OpenAI text-embedding-3-small)
-- Note: This will fail if embeddings already exist with wrong dimension - manual migration required
DO $$ BEGIN
    ALTER TABLE document_chunks ALTER COLUMN embedding TYPE VECTOR(1536);
EXCEPTION
    WHEN OTHERS THEN 
        RAISE NOTICE 'Could not alter embedding column dimension - may need manual migration if data exists';
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Tables created/verified: 8
--   1. events
--   2. waypoints
--   3. calculated_legs
--   4. documents
--   5. document_chunks
--   6. user_settings
--   7. chat_sessions
--   8. chat_messages
--
-- Enum types: 3
--   1. waypoint_type (checkpoint, food, water, rest)
--   2. distance_unit (miles, kilometers)
--   3. elevation_unit (meters, feet)
--
-- Extensions: 2
--   1. vector (PGVector for embeddings)
--   2. uuid-ossp (UUID generation)
--
-- Indexes: 10 (for performance)
-- Foreign keys: 8 (for referential integrity)
-- ============================================================================
