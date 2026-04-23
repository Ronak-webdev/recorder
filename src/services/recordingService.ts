import { supabase } from '../lib/supabase';
import { DEFAULT_STORAGE_BUCKET } from '../lib/storage';
import { SequenceUtils } from '../utils/sequenceUtils';

export interface RecordingMetadata {
  id?: string;
  speaker_id: string; // The "Seed" or Prefix (e.g. "Ronak")
  display_id: string;  // The actual full ID (e.g. "Ronak001")
  sequence_number: number; // A numeric fallback/counter
  file_path: string;
  duration: number;
  created_at?: string;
}

export const RecordingService = {
  async getNextSequenceNumber(speakerId: string): Promise<number> {
    const { data, error } = await supabase
      .from('recordings')
      .select('sequence_number')
      .eq('speaker_id', speakerId)
      .order('sequence_number', { ascending: false })
      .limit(1);

    if (error) {
      if (error.message.includes('relation "recordings" does not exist') || error.message.includes("Could not find the table 'public.recordings'")) {
        throw new Error('Recordings table not found. Please run the database setup SQL.');
      }
      if (error.message.includes('permission')) {
        throw new Error('Permission denied. You may not have read access to the recordings table.');
      }
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data || data.length === 0) return 1;
    return (data[0].sequence_number || 0) + 1;
  },

  /**
   * Fetches the last used display ID for a specific prefix/pattern.
   * If user types "Ronak", it finds the latest "RonakXXX".
   * Returns fallback ID if table doesn't exist or permissions are missing.
   */
  async getNextSmartId(seed: string): Promise<string> {
    try {
      // 1. First, check if the EXACT seed exists
      const { data: exactMatch } = await supabase
        .from('recordings')
        .select('display_id')
        .eq('display_id', seed)
        .limit(1);

      // 2. Search for the latest record starting with this seed as a prefix
      const { data, error } = await supabase
        .from('recordings')
        .select('display_id')
        .ilike('display_id', `${seed}%`)
        .order('display_id', { ascending: false })
        .limit(1);

      if (error) {
        console.warn('Database error, using fallback:', error.message);
        return seed.match(/\d+$/) ? seed : `${seed}001`;
      }

      // If no records at all, use seed as is
      if (!data || data.length === 0) {
        return seed;
      }

      // If exact seed exists, or other matches exist, increment the highest one
      const latestId = data[0].display_id;
      return SequenceUtils.getNextValue(latestId);
    } catch (err: any) {
      console.error('Unexpected error in getNextSmartId:', err);
      return `${seed}_${Date.now().toString().slice(-4)}`;
    }
  },


  async uploadAudio(blob: Blob, displayId: string): Promise<string> {
    const fileName = `${displayId}.wav`;
    const filePath = `recordings/${fileName}`;

    try {
      const { data, error } = await supabase.storage
        .from(DEFAULT_STORAGE_BUCKET)
        .upload(filePath, blob, {
          contentType: 'audio/wav',
          upsert: true
        });

      if (error) {
        // Handle specific storage errors
        const errorMsg = error.message || 'Unknown error';
        
        if (errorMsg.includes('Bucket not found')) {
          throw new Error(`Storage bucket "${DEFAULT_STORAGE_BUCKET}" not found. Please create it in Supabase Storage section.`);
        } else if (errorMsg.includes('400')) {
          throw new Error('Bad request: Check that bucket exists and RLS policies allow uploads.');
        } else if (errorMsg.includes('permission') || errorMsg.includes('unauthorized')) {
          throw new Error('Permission denied. You may not be logged in or bucket permissions are restricted.');
        }
        
        throw new Error(`Upload failed: ${errorMsg}`);
      }

      if (!data || !data.path) {
        throw new Error('Upload completed but no file path returned.');
      }

      // Persist with bucket prefix so admin can resolve legacy and future paths reliably.
      return `${DEFAULT_STORAGE_BUCKET}/${data.path}`;
    } catch (err: any) {
      console.error('Audio upload error:', err.message);
      throw err; // Re-throw for caller to handle
    }
  },

  async saveMetadata(metadata: any) {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Not authenticated. Please log in before uploading.');
      }

      let nextSequence = await this.getNextSequenceNumber(metadata.speaker_id);
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const { data, error } = await supabase
          .from('recordings')
          .insert([{
            ...metadata,
            sequence_number: nextSequence,
            user_id: user.id,
          }])
          .select('id, display_id, sequence_number');

        if (!error) {
          // Inserts can succeed even when payload is empty depending on settings.
          return data ?? [];
        }

        if (error.message.includes('relation "recordings" does not exist') || error.message.includes("Could not find the table 'public.recordings'")) {
          throw new Error('Recordings table not found. Please run the database setup SQL.');
        }
        if (error.message.includes('permission')) {
          throw new Error('Permission denied. You may not have write access to the recordings table.');
        }
        if (error.message.includes('duplicate key value violates unique constraint')) {
          nextSequence += 1;
          continue;
        }
        throw new Error(`Database error: ${error.message}`);
      }

      throw new Error('Database error: duplicate key value violates unique constraint "speaker_sequence_unique"');
    } catch (err: any) {
      console.error('Metadata save error:', err.message);
      throw err; // Re-throw for caller to handle
    }
  }
};
