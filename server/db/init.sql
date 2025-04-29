-- Check if attendance table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance') THEN
        -- Create attendance table
        CREATE TABLE attendance (
            attendance_id SERIAL PRIMARY KEY,
            child_id INTEGER NOT NULL REFERENCES children(child_id),
            date DATE NOT NULL,
            is_present BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(child_id, date)
        );

        -- Create index for faster search
        CREATE INDEX idx_attendance_child_date ON attendance(child_id, date);

        -- Create trigger for updating updated_at
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        CREATE TRIGGER update_attendance_updated_at
            BEFORE UPDATE ON attendance
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        -- Add table and column comments
        COMMENT ON TABLE attendance IS 'Table for storing children attendance';
        COMMENT ON COLUMN attendance.attendance_id IS 'Unique attendance record identifier';
        COMMENT ON COLUMN attendance.child_id IS 'Child identifier';
        COMMENT ON COLUMN attendance.date IS 'Attendance date';
        COMMENT ON COLUMN attendance.is_present IS 'Whether the child was present (true/false)';
        COMMENT ON COLUMN attendance.created_at IS 'Record creation timestamp';
        COMMENT ON COLUMN attendance.updated_at IS 'Record last update timestamp';

        RAISE NOTICE 'Attendance table created successfully';
    ELSE
        RAISE NOTICE 'Attendance table already exists';
    END IF;
END $$; 