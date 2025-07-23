import { useEffect, useState, useCallback } from 'react';
import { functions } from '@/firebase';

interface UseSafeVideoUrlResult {
  videoUrl: string | null;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
}

// This function calls a (to-be-created) Firebase Function to get a secure download URL.
const getSignedDownloadUrl = functions.httpsCallable('getSignedDownloadUrl');


/**
 * A hook to securely fetch a temporary signed URL for a video from Google Cloud Storage via a Firebase Function.
 * It handles loading and error states, and provides a `retry` function to re-attempt fetching the URL.
 * @param path The path to the file within the GCS bucket. Can be null.
 * @returns An object containing the videoUrl, and states for loading, error, and a retry function.
 */
export function useSafeVideoUrl(path: string | null): UseSafeVideoUrlResult {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const loadVideo = useCallback(async () => {
    if (!path) {
      setIsLoading(false);
      setIsError(true); // No path is an error state
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setVideoUrl(null);

    try {
      // Create a temporary signed download URL via our backend function
      const result = await getSignedDownloadUrl({ filePath: path });
      const data = result.data as { downloadUrl: string };

      if (data?.downloadUrl) {
        setVideoUrl(data.downloadUrl);
      } else {
        throw new Error("getSignedDownloadUrl function returned no URL.");
      }
    } catch (err) {
      console.error("Failed to get signed video URL:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [path]);

  useEffect(() => {
    loadVideo();
  }, [loadVideo]);

  return {
    videoUrl,
    isLoading,
    isError,
    retry: loadVideo,
  };
}