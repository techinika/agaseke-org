import { useState, useCallback } from 'react';
import { uploadToImageKit } from '@/lib/imagekit';

interface UseImageUploadOptions {
  folder?: string;
}

interface UseImageUploadReturn {
  upload: (file: File) => Promise<string | null>;
  isUploading: boolean;
  error: string | null;
  reset: () => void;
}

export function useImageUpload(options?: UseImageUploadOptions): UseImageUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File): Promise<string | null> => {
    if (!file) return null;
    setIsUploading(true);
    setError(null);
    try {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload a PNG, JPG, GIF, WebP, or SVG image.');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File is too large. Maximum size is 5MB.');
      }
      const result = await uploadToImageKit(file, file.name, options?.folder ?? 'general');
      return result.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [options]);

  const reset = useCallback(() => {
    setIsUploading(false);
    setError(null);
  }, []);

  return { upload, isUploading, error, reset };
}
