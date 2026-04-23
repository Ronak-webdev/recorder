export const DEFAULT_STORAGE_BUCKET = 'audio-samples';

export interface ResolvedStorageLocation {
  bucket: string;
  objectPath: string;
}

const isAbsoluteHttpUrl = (value: string) => /^https?:\/\//i.test(value);

export const parseStoredFilePath = (storedPath: string): ResolvedStorageLocation => {
  if (!storedPath || !storedPath.trim()) {
    return { bucket: DEFAULT_STORAGE_BUCKET, objectPath: '' };
  }

  const trimmed = storedPath.trim();

  // Legacy format: "audio-samples/recordings/file.wav"
  if (trimmed.startsWith(`${DEFAULT_STORAGE_BUCKET}/`)) {
    return {
      bucket: DEFAULT_STORAGE_BUCKET,
      objectPath: trimmed.slice(DEFAULT_STORAGE_BUCKET.length + 1),
    };
  }

  // Full public URL format: .../storage/v1/object/public/<bucket>/<path>
  if (isAbsoluteHttpUrl(trimmed)) {
    const marker = '/storage/v1/object/public/';
    const markerIndex = trimmed.indexOf(marker);
    if (markerIndex >= 0) {
      const remainder = trimmed.slice(markerIndex + marker.length);
      const firstSlashIndex = remainder.indexOf('/');
      if (firstSlashIndex > 0) {
        return {
          bucket: remainder.slice(0, firstSlashIndex),
          objectPath: remainder.slice(firstSlashIndex + 1),
        };
      }
    }

    // Non-Supabase URL: keep default bucket and pass through raw value.
    return { bucket: DEFAULT_STORAGE_BUCKET, objectPath: trimmed };
  }

  // Default format stored by uploader: "recordings/file.wav"
  return { bucket: DEFAULT_STORAGE_BUCKET, objectPath: trimmed };
};

export const getPublicAudioUrl = (supabase: any, storedPath: string): string => {
  const { bucket, objectPath } = parseStoredFilePath(storedPath);
  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return data.publicUrl;
};
