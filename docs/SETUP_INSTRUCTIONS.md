# Supabase Setup Checklist - Complete Guide

## ✅ Step 1: Create Storage Bucket

1. Go to **[Supabase Dashboard](https://supabase.com/dashboard)**
2. Select your project: `oxpveruqmetzoshodcwl`
3. Click **Storage** (left sidebar)
4. Click **Create a new bucket**
   - **Name**: `audio-samples` (exactly this)
   - **Make it public**: Toggle the switch ON
5. Click **Create bucket**

**Verify**: You should see `audio-samples` listed under Buckets

---

## ✅ Step 2: Create Database Table

1. In Supabase Dashboard, click **SQL Editor** (left sidebar)
2. Click **New query**
3. Copy & paste this SQL:

```sql
-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  speaker_id TEXT NOT NULL,
  display_id TEXT,
  sequence_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  duration FLOAT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS speaker_sequence_unique 
  ON recordings (speaker_id, sequence_number);

-- Enable RLS
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON recordings;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON recordings;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON recordings;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON recordings;

CREATE POLICY "Enable insert for authenticated users" ON recordings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable select for authenticated users" ON recordings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable update for authenticated users" ON recordings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for authenticated users" ON recordings
  FOR DELETE USING (auth.uid() = user_id);
```

4. Click **Run** (or Ctrl+Enter)
5. Wait for success message

**Verify**: Go to **Tables**, you should see `recordings` table

---

## ✅ Step 3: Create Storage Bucket RLS Policies

1. Still in **SQL Editor**, click **New query**
2. Copy & paste this SQL:

```sql
-- Storage RLS policies for audio-samples bucket
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON storage.objects;

CREATE POLICY "Allow authenticated users to upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'audio-samples' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'audio-samples');

CREATE POLICY "Allow authenticated users to delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'audio-samples' 
    AND auth.role() = 'authenticated'
  );
```

3. Click **Run**
4. Wait for success message

**Verify**: In Storage → `audio-samples` bucket, you should see a lock icon indicating RLS is enabled

---

## ✅ Step 4: Test Your App

1. **Reload** your recording app in the browser (F5)
2. **Log in** with your credentials
3. **Record** a test audio clip
4. **Click Upload**
5. Check the browser console for any errors

---

## ❌ If You Still Get Errors

| Error | Solution |
|-------|----------|
| **"Bucket not found"** | Verify `audio-samples` bucket exists in Storage tab |
| **"Recordings table not found"** | Run Step 2 SQL again - table wasn't created |
| **"Permission denied"** | Run Step 3 SQL again - RLS policies weren't created |
| **"Not authenticated"** | Make sure you're logged in before uploading |
| **404 on query** | Table doesn't exist or user doesn't have access |

---

## 🔧 Troubleshooting Commands

Run these in **SQL Editor** to check your setup:

```sql
-- Check if recordings table exists
SELECT to_regclass('public.recordings') as table_exists;

-- Check RLS status
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'recordings';

-- List all buckets
SELECT id, name, public 
FROM storage.buckets;

-- Check storage RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
```

---

## ✨ What's Different Now

- **Better error messages** - Alerts tell you exactly what's missing
- **Graceful fallbacks** - App doesn't crash if database is unavailable
- **Authentication check** - Won't upload without being logged in
- **Detailed logging** - Check browser console for technical debug info

Your app is now hardened against common Supabase setup issues! 🎉