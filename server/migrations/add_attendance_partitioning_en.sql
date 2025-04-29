-- Migration for partitioning the attendance table
-- Performed to optimize attendance queries by date

DO $$
DECLARE
    partition_exists boolean;
    min_date date;
    max_date date;
BEGIN
    -- Check if table is already partitioned
    SELECT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'attendance'
        AND c.relkind = 'p'
    ) INTO partition_exists;

    IF NOT partition_exists THEN
        -- Get min and max dates from existing data
        SELECT COALESCE(MIN(date), '2023-01-01'::date), COALESCE(MAX(date), '2026-12-31'::date)
        INTO min_date, max_date
        FROM attendance;

        -- Create temporary table to store existing data
        CREATE TABLE attendance_temp AS SELECT * FROM attendance;
        
        -- Drop original table with CASCADE to handle dependencies
        DROP TABLE attendance CASCADE;
        
        -- Create new partitioned table
        CREATE TABLE attendance (
            attendance_id SERIAL,
            child_id INTEGER NOT NULL,
            date DATE NOT NULL,
            is_present BOOLEAN NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (attendance_id, date)
        ) PARTITION BY RANGE (date);
        
        -- Create partitions for past data (from 2023)
        FOR i IN 0..47 LOOP
            EXECUTE format(
                'CREATE TABLE attendance_y%sm%s PARTITION OF attendance
                FOR VALUES FROM (%L) TO (%L)',
                to_char(date_trunc('month', '2023-01-01'::date + (i || ' months')::interval), 'YYYY'),
                to_char(date_trunc('month', '2023-01-01'::date + (i || ' months')::interval), 'MM'),
                date_trunc('month', '2023-01-01'::date + (i || ' months')::interval),
                date_trunc('month', '2023-01-01'::date + ((i + 1) || ' months')::interval)
            );
        END LOOP;
        
        -- Create default partition for future dates
        CREATE TABLE attendance_future PARTITION OF attendance
        FOR VALUES FROM ('2027-01-01') TO (MAXVALUE);
        
        -- Copy data back
        INSERT INTO attendance 
        SELECT attendance_id, child_id, date, is_present, 
               COALESCE(created_at, CURRENT_TIMESTAMP), 
               COALESCE(updated_at, CURRENT_TIMESTAMP)
        FROM attendance_temp;
        
        -- Drop temporary table
        DROP TABLE attendance_temp;

        -- Recreate materialized view
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

        -- Create indexes for materialized view
        CREATE UNIQUE INDEX idx_mv_group_attendance_id ON mv_group_attendance(attendance_id);
        CREATE INDEX idx_mv_group_attendance_group_date ON mv_group_attendance(group_id, date);
        CREATE INDEX idx_mv_group_attendance_child_date ON mv_group_attendance(child_id, date);
        
        RAISE NOTICE 'Successfully partitioned attendance table';
    ELSE
        RAISE NOTICE 'Table attendance is already partitioned';
    END IF;
END $$;

-- Create function for automatic partition creation
CREATE OR REPLACE FUNCTION create_attendance_partition()
RETURNS TRIGGER AS $$
DECLARE
    partition_date date;
    partition_name text;
    start_date date;
    end_date date;
BEGIN
    partition_date := date_trunc('month', NEW.date);
    partition_name := 'attendance_y' || to_char(partition_date, 'YYYY') || 'm' || to_char(partition_date, 'MM');
    
    -- Check if partition exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name
    ) THEN
        start_date := partition_date;
        end_date := partition_date + interval '1 month';
        
        -- Create new partition
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF attendance FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        
        RAISE NOTICE 'Created new partition %', partition_name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic partition creation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'create_attendance_partition_trigger'
    ) THEN
        CREATE TRIGGER create_attendance_partition_trigger
            BEFORE INSERT ON attendance
            FOR EACH ROW
            EXECUTE FUNCTION create_attendance_partition();
            
        RAISE NOTICE 'Created trigger create_attendance_partition_trigger';
    END IF;
END $$; 