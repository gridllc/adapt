// This service is being migrated from Supabase to Firebase.
// Functions are being reimplemented to interact with a Firestore database via Firebase Functions
// and Google Cloud Storage for videos.

import type { AppModule, AppModuleWithStats, ModuleForInsert } from '@/types';
import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import type { Functions } from 'firebase/functions';


// --- Callable Firebase Functions (Modular SDK) ---
const getModuleFn = httpsCallable<{ moduleId: string }, AppModule | undefined>(functions as Functions, 'getModule');
const getSignedUploadUrlFn = httpsCallable<{ slug: string; contentType: string; fileExtension: string }, { uploadUrl: string; filePath: string }>(functions as Functions, 'getSignedUploadUrl');
const saveModuleFn = httpsCallable<{ moduleData: ModuleForInsert }, AppModule>(functions as Functions, 'saveModule');
const getAvailableModulesFn = httpsCallable<void, AppModuleWithStats[]>(functions as Functions, 'getAvailableModules');
const deleteModuleFn = httpsCallable<{ slug: string }, void>(functions as Functions, 'deleteModule');


// --- Implemented Functions ---

/**
 * Fetches a single module.
 * It first checks for local remedial JSON files, then calls the 'getModule' Firebase Function.
 * @param slug The unique identifier for the module.
 * @returns A promise that resolves to the AppModule or undefined if not found/error.
 */
export const getModule = async (slug: string): Promise<AppModule | undefined> => {
    // Check for static sub-modules used in live coaching, which are local public files.
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
        return result.data;
    } catch (error) {
        console.error(`[Firebase] Error fetching module '${slug}':`, error);
        // Re-throw the error so react-query can handle the error state.
        throw error;
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
            const result = await getSignedUploadUrlFn({
                slug: moduleData.slug,
                contentType: videoFile.type,
                fileExtension: fileExtension,
            });
            const { uploadUrl, filePath } = result.data;

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
            throw error;
        }
    }

    // Step 2: Save the module metadata to Firestore.
    try {
        const moduleToSave = {
            ...moduleData,
            video_url: videoUrlPath, // Use the new GCS path
        };

        const result = await saveModuleFn({ moduleData: moduleToSave });

        return result.data;
    } catch (error) {
        console.error(`[Firebase] Error saving module metadata for '${moduleData.slug}':`, error);
        throw error;
    }
};

export const getAvailableModules = async (): Promise<AppModuleWithStats[]> => {
    try {
        const result = await getAvailableModulesFn();
        return result.data;
    } catch (error) {
        console.error("[Firebase] Error fetching available modules:", error);
        throw error;
    }
};

export const deleteModule = async (slug: string): Promise<void> => {
    try {
        await deleteModuleFn({ slug });
    } catch (error) {
        console.error(`[Firebase] Error deleting module '${slug}':`, error);
        throw error;
    }
};