-- Create attendance table if not exists
CREATE TABLE IF NOT EXISTS attendance (
    attendance_id SERIAL PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(child_id),
    date DATE NOT NULL,
    is_present BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(child_id, date)
);

-- Create index for faster search
CREATE INDEX IF NOT EXISTS idx_attendance_child_date ON attendance(child_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

-- Create or replace function for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_attendance_updated_at ON attendance;

-- Create trigger
CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 