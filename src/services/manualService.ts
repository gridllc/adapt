import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';

// Callable function definition initialized once for performance.
const _getSignedManualUploadUrlFn = httpsCallable<{ fileName: string, contentType: string }, { uploadUrl: string, filePath: string }>(functions, 'getSignedManualUploadUrl');

/**
 * Uploads a user-provided manual to a secure cloud storage location for later processing.
 * This function orchestrates getting a signed URL from a Firebase Function and then performing the upload.
 * @param file The manual file (PDF, DOCX, TXT) to upload.
 * @returns A promise that resolves with the cloud storage path of the uploaded file.
 * @throws If the upload process fails at any stage.
 */
export const uploadManualForProcessing = async (file: File): Promise<string> => {
    try {
        // 1. Get a secure, one-time upload URL from our backend function.
        const result = await _getSignedManualUploadUrlFn({
            fileName: file.name,
            contentType: file.type,
        });

        const { uploadUrl, filePath } = result.data;

        if (!uploadUrl || !filePath) {
            throw new Error("Backend did not return a valid upload URL.");
        }

        // 2. Use the signed URL to upload the file directly to Cloud Storage from the client.
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
        });

        if (!uploadResponse.ok) {
            throw new Error(`Cloud storage upload failed: ${uploadResponse.statusText}`);
        }

        return filePath;
    } catch (error) {
        console.error("Failed to upload manual:", error);
        throw error;
    }
};
