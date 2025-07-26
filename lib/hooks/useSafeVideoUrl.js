"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSafeVideoUrl = void 0;
const react_1 = require("react");
const firebase_1 = require("@/firebase");
const functions_1 = require("firebase/functions");
// This function calls a Firebase Function to get a secure download URL.
const getSignedDownloadUrlFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'getSignedDownloadUrl');
/**
 * A hook to securely fetch a temporary signed URL for a video from Google Cloud Storage via a Firebase Function.
 * It handles loading and error states, and provides a `retry` function to re-attempt fetching the URL.
 * @param path The path to the file within the GCS bucket. Can be null.
 * @returns An object containing the videoUrl, and states for loading, error, and a retry function.
 */
function useSafeVideoUrl(path) {
    const [videoUrl, setVideoUrl] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [isError, setIsError] = (0, react_1.useState)(false);
    const loadVideo = (0, react_1.useCallback)(async () => {
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
            const result = await getSignedDownloadUrlFn({ filePath: path });
            const data = result.data;
            if (data?.downloadUrl) {
                setVideoUrl(data.downloadUrl);
            }
            else {
                throw new Error("getSignedDownloadUrl function returned no URL.");
            }
        }
        catch (err) {
            console.error("Failed to get signed video URL:", err);
            setIsError(true);
        }
        finally {
            setIsLoading(false);
        }
    }, [path]);
    (0, react_1.useEffect)(() => {
        loadVideo();
    }, [loadVideo]);
    return {
        videoUrl,
        isLoading,
        isError,
        retry: loadVideo,
    };
}
exports.useSafeVideoUrl = useSafeVideoUrl;
