import { functions } from '@/firebase';
import type firebase from 'firebase/compat/app';
import 'firebase/compat/functions';

const getSignedManualUploadUrlFn = functions.httpsCallable('getSignedManualUploadUrl');

/**
 * Uploads a user-provided manual to a secure cloud storage location for later processing.
 * This is the first step in the "Create from Manual" flow.
 * @param file The manual file (PDF, DOCX, TXT) to upload.
 * @returns The cloud storage path of the uploaded file.
 */
export const uploadManualForProcessing = async (file: File): Promise<string> => {
    try {
        // 1. Get a secure, one-time upload URL from our backend function.
        const result: firebase.functions.HttpsCallableResult = await getSignedManualUploadUrlFn({
            fileName: file.name,
            contentType: file.type,
        });

        const { uploadUrl, filePath } = result.data as { uploadUrl: string, filePath: string };

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