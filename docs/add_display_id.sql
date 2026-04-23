-- Add display_id column to the recordings table
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS display_id TEXT;

-- Migration: Update existing records to have a display_id if it's missing
UPDATE recordings SET display_id = speaker_id || '_' || sequence_number WHERE display_id IS NULL;
