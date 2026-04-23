-- SQL Script for Supabase Setup
-- Paste this into the SQL Editor in your Supabase Dashboard

-- 1. Create the recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  speaker_id TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  duration FLOAT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id)
);

-- 2. Add unique constraint to prevent duplicate speaker/sequence pairs
CREATE UNIQUE INDEX IF NOT EXISTS speaker_sequence_unique ON recordings (speaker_id, sequence_number);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Allow anyone to read/write for now, or restrict as needed)
CREATE POLICY "Enable insert for authenticated users only" ON recordings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable select for everyone" ON recordings
  FOR SELECT USING (true);

-- 5. Storage Setup
-- Note: You MUST manually create a public bucket named 'audio-samples' in the Storage section.
-- Or run this if your Supabase setup supports storage policies via SQL:
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-samples', 'audio-samples', true);
