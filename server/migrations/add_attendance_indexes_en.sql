-- Migration for adding indexes to the attendance table
-- Performed to optimize attendance queries

-- Check for existing indexes before creation
DO $$
BEGIN
    -- Index for searching by child_id and date
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'attendance' AND indexname = 'idx_attendance_child_date'
    ) THEN
        CREATE INDEX idx_attendance_child_date ON attendance(child_id, date);
        RAISE NOTICE 'Created index idx_attendance_child_date';
    END IF;

    -- Index for searching by date
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'attendance' AND indexname = 'idx_attendance_date'
    ) THEN
        CREATE INDEX idx_attendance_date ON attendance(date);
        RAISE NOTICE 'Created index idx_attendance_date';
    END IF;

    -- Index for searching by child_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'attendance' AND indexname = 'idx_attendance_child_id'
    ) THEN
        CREATE INDEX idx_attendance_child_id ON attendance(child_id);
        RAISE NOTICE 'Created index idx_attendance_child_id';
    END IF;

    -- Index for searching by is_present
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'attendance' AND indexname = 'idx_attendance_is_present'
    ) THEN
        CREATE INDEX idx_attendance_is_present ON attendance(is_present);
        RAISE NOTICE 'Created index idx_attendance_is_present';
    END IF;

    -- Index for searching by date range and child_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'attendance' AND indexname = 'idx_attendance_date_range'
    ) THEN
        CREATE INDEX idx_attendance_date_range ON attendance(date, child_id);
        RAISE NOTICE 'Created index idx_attendance_date_range';
    END IF;

    -- Index for searching children by group_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'children' AND indexname = 'idx_children_group_id'
    ) THEN
        CREATE INDEX idx_children_group_id ON children(group_id);
        RAISE NOTICE 'Created index idx_children_group_id';
    END IF;

    -- Index for searching children by parent_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'children' AND indexname = 'idx_children_parent_id'
    ) THEN
        CREATE INDEX idx_children_parent_id ON children(parent_id);
        RAISE NOTICE 'Created index idx_children_parent_id';
    END IF;
END $$;

-- Create materialized view for frequently requested attendance data
DO $$
BEGIN
    -- Check if materialized view exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_matviews 
        WHERE matviewname = 'mv_group_attendance'
    ) THEN
        -- Create materialized view
        CREATE MATERIALIZED VIEW mv_group_attendance AS
        SELECT 
            a.attendance_id,
            a.child_id,
            a.date,
            a.is_present,
            c.name AS child_name,
            c.group_id,
            g.group_name
        FROM 
            attendance a
        JOIN 
            children c ON a.child_id = c.child_id
        JOIN 
            groups g ON c.group_id = g.group_id;
        
        RAISE NOTICE 'Created materialized view mv_group_attendance';
        
        -- Create indexes for materialized view
        CREATE UNIQUE INDEX idx_mv_group_attendance_id ON mv_group_attendance(attendance_id);
        CREATE INDEX idx_mv_group_attendance_group_date ON mv_group_attendance(group_id, date);
        CREATE INDEX idx_mv_group_attendance_child_date ON mv_group_attendance(child_id, date);
        
        RAISE NOTICE 'Created indexes for materialized view';
    END IF;
END $$;

-- Create function for updating materialized view
CREATE OR REPLACE FUNCTION refresh_mv_group_attendance()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_group_attendance;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger for updating materialized view
DO $$
BEGIN
    -- Check if trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'refresh_mv_group_attendance_trigger'
    ) THEN
        -- Create trigger
        CREATE TRIGGER refresh_mv_group_attendance_trigger
            AFTER INSERT OR UPDATE OR DELETE ON attendance
            FOR EACH STATEMENT
            EXECUTE FUNCTION refresh_mv_group_attendance();
        
        RAISE NOTICE 'Created trigger refresh_mv_group_attendance_trigger';
    END IF;
END $$;

-- Add created_at and updated_at columns to attendance table if they don't exist
DO $$
BEGIN
    -- Check if created_at column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE attendance ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added created_at column to attendance table';
    END IF;

    -- Check if updated_at column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE attendance ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added updated_at column to attendance table';
    END IF;
END $$;

-- Create function for automatic updated_at update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating updated_at in attendance table
DO $$
BEGIN
    -- Check if trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_attendance_updated_at'
    ) THEN
        -- Create trigger
        CREATE TRIGGER update_attendance_updated_at
            BEFORE UPDATE ON attendance
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        
        RAISE NOTICE 'Created trigger update_attendance_updated_at';
    END IF;
END $$;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_group_attendance; 