-- Complete Supabase Setup Fix for Recording Upload Issues
-- Run this in your Supabase SQL Editor to fix all database and storage issues

-- 1. Create the recordings table (if not exists)
CREATE TABLE IF NOT EXISTS recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  speaker_id TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  duration FLOAT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id)
);

-- 2. Add display_id column (if not exists)
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS display_id TEXT;

-- 3. Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS speaker_sequence_unique ON recordings (speaker_id, sequence_number);

-- 4. Enable RLS
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- 5. Update policies for recordings table
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON recordings;
DROP POLICY IF EXISTS "Enable select for everyone" ON recordings;

CREATE POLICY "Enable insert for authenticated users only" ON recordings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable select for authenticated users" ON recordings
  FOR SELECT USING (auth.uid() = user_id);

-- 6. Create storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-samples', 'audio-samples', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Create storage policies for audio-samples bucket
CREATE POLICY "Allow authenticated users to upload audio files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'audio-samples'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated users to delete audio files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'audio-samples'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow public read access to audio files" ON storage.objects
  FOR SELECT USING (bucket_id = 'audio-samples');

-- 8. Migrate existing records to have display_id
UPDATE recordings SET display_id = speaker_id || sequence_number::text WHERE display_id IS NULL;