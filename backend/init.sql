-- Enable PGVector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
DO $$ BEGIN
    CREATE TYPE waypoint_type AS ENUM ('checkpoint', 'food', 'water', 'rest');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE distance_unit AS ENUM ('miles', 'kilometers');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE elevation_unit AS ENUM ('meters', 'feet');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

