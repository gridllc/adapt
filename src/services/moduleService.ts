// This service is being migrated from Supabase to Firebase.
// Functions are being reimplemented to interact with a Firestore database via Firebase Functions
// and Google Cloud Storage for videos.

import type { AppModule, AppModuleWithStats, ModuleForInsert } from '@/types';
import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';



// --- Callable Firebase Functions ---
// Note: The backend implementation for these functions must exist and be deployed.

const getModuleFn = httpsCallable(functions, 'getModule');
const getSignedUploadUrlFn = httpsCallable(functions, 'getSignedUploadUrl');
const saveModuleFn = httpsCallable(functions, 'saveModule');
const getAvailableModulesFn = httpsCallable(functions, 'getAvailableModules');
const deleteModuleFn = httpsCallable(functions, 'deleteModule');


// --- Implemented Functions ---

/**
 * Fetches a single module.
 * It first checks for local remedial JSON files (e.g., 'how-to-..'), then falls back to
 * calling the 'getModule' Firebase Function to fetch from Firestore.
 * @param slug The unique identifier for the module.
 * @returns A promise that resolves to the AppModule or undefined if not found/error.
 */
export const getModule = async (slug: string): Promise<AppModule | undefined> => {
    // Check for static sub-modules used in live coaching, which don't require a DB.
    // These are local public files.
    if (slug.startsWith('how-to-')) {
        try {
            const response = await fetch(`/modules/${slug}.json`);
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.warn(`Could not fetch local module ${slug}.json. This may be expected if it exists in the database instead.`, e);
            // Fall through to try fetching from the backend
        }
    }

    try {
        const result = await getModuleFn({ moduleId: slug });
        // The callable function result is in `result.data`.
        return result.data as AppModule;
    } catch (error) {
        console.error(`[Firebase] Error fetching module '${slug}':`, error);
        // Returning undefined is the expected behavior for react-query when a resource is not found or fails.
        // The query hook will handle the error state.
        return undefined;
    }
};


export const saveModule = async ({
    moduleData,
    videoFile,
}: {
    moduleData: ModuleForInsert,
    videoFile?: File | null,
}): Promise<AppModule> => {
    let videoUrlPath: string | null = moduleData.video_url || null;

    // Step 1: If there's a video file, upload it to GCS first.
    if (videoFile && moduleData.user_id) {
        const fileExtension = videoFile.name.split('.').pop() || 'mp4';

        try {
            // Step 1a: Get a signed URL from our secure backend function.
            // The function will construct the secure path using the user's ID.
            const result = await getSignedUploadUrlFn({
                slug: moduleData.slug,
                contentType: videoFile.type,
                fileExtension: fileExtension,
            });
            const { uploadUrl, filePath } = result.data as { uploadUrl: string; filePath: string };

            if (!uploadUrl || !filePath) {
                throw new Error("Cloud function did not return a valid upload URL or file path.");
            }

            // Step 1b: Upload the file directly to GCS from the client.
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': videoFile.type },
                body: videoFile,
            });

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                throw new Error(`GCS upload failed: ${uploadResponse.statusText}. Details: ${errorText}`);
            }

            // Step 1c: Store the permanent GCS path for the database record.
            videoUrlPath = filePath;
        } catch (error) {
            console.error("Failed to get signed URL or upload video:", error);
            throw new Error("Could not upload the video file. Please check permissions and backend function logs.");
        }
    }

    // Step 2: Save the module metadata to Firestore.
    try {
        const moduleToSave = {
            ...moduleData,
            video_url: videoUrlPath, // Use the new GCS path
        };

        const result = await saveModuleFn({ moduleData: moduleToSave });

        // The cloud function should return the saved module data.
        return result.data as AppModule;
    } catch (error) {
        console.error(`[Firebase] Error saving module metadata for '${moduleData.slug}':`, error);
        throw new Error("Failed to save module metadata to the database.");
    }
};

export const getAvailableModules = async (): Promise<AppModuleWithStats[]> => {
    try {
        const result = await getAvailableModulesFn();
        return result.data as AppModuleWithStats[];
    } catch (error) {
        console.error("[Firebase] Error fetching available modules:", error);
        throw new Error("Failed to fetch the list of training modules from the server.");
    }
};

export const deleteModule = async (slug: string): Promise<void> => {
    try {
        await deleteModuleFn({ slug });
    } catch (error) {
        console.error(`[Firebase] Error deleting module '${slug}':`, error);
        if (error instanceof Error) {
            throw new Error(`Failed to delete the module: ${error.message}`);
        }
        throw new Error("An unknown error occurred while deleting the module.");
    }
};