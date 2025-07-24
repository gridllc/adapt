import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import type { Routine } from '@/types';

// Callable function definitions initialized once for performance.
const _getRoutinesForTemplateFn = httpsCallable<{ templateId: string }, Routine[]>(functions, 'getRoutinesForTemplate');
const _saveRoutineFn = httpsCallable<{ routineData: Omit<Routine, 'id'> & { id?: string; videoUrl: string | null } }, Routine>(functions, 'saveRoutine');
const _deleteRoutineFn = httpsCallable<{ routineId: string }, void>(functions, 'deleteRoutine');
const _getSignedRoutineVideoUploadUrlFn = httpsCallable<{ routineId: string, contentType: string, fileExtension: string }, { uploadUrl: string, filePath: string }>(functions, 'getSignedRoutineVideoUploadUrl');
const _getRoutineForIntentFn = httpsCallable<{ templateId: string, intent: string }, Routine | null>(functions, 'getRoutineForIntent');
const _getAllRoutinesFn = httpsCallable<void, Routine[]>(functions, 'getAllRoutines');

/**
 * Fetches all routines associated with a specific template ID via the 'getRoutinesForTemplate' Firebase Function.
 * @param templateId The ID of the template (e.g., a module slug).
 * @returns A promise that resolves with an array of routines.
 */
export const getRoutinesForTemplate = async (templateId: string): Promise<Routine[]> => {
    const result = await _getRoutinesForTemplateFn({ templateId });
    return result.data;
};

/**
 * Fetches all routines available on the platform via the 'getAllRoutines' Firebase Function.
 * @returns A promise that resolves with an array of all routines.
 */
export const getAllRoutines = async (): Promise<Routine[]> => {
    const result = await _getAllRoutinesFn();
    return result.data;
};

/**
 * Fetches a specific routine that matches a given intent for a template via the 'getRoutineForIntent' Firebase Function.
 * @param templateId The ID of the template.
 * @param intent The user intent to match (e.g., "watch-channel").
 * @returns A promise that resolves with the matching routine or null if not found.
 */
export const getRoutineForIntent = async (templateId: string, intent: string): Promise<Routine | null> => {
    try {
        const result = await _getRoutineForIntentFn({ templateId, intent });
        return result.data;
    } catch (error) {
        console.warn(`Could not find routine for intent '${intent}' in template '${templateId}'.`, error);
        return null;
    }
}

/**
 * Saves a routine (creates or updates) and optionally uploads an associated video file.
 * @param routine The routine data to save. Can include an `id` for updates.
 * @param videoFile An optional video file to upload and associate with the routine.
 * @returns A promise that resolves with the saved routine data.
 */
export const saveRoutine = async (routine: Omit<Routine, 'id'> & { id?: string }, videoFile: File | null): Promise<Routine> => {
    let videoUrlPath: string | null = routine.videoUrl || null;

    if (videoFile) {
        try {
            const fileExtension = videoFile.name.split('.').pop() || 'mp4';
            const result = await _getSignedRoutineVideoUploadUrlFn({
                routineId: routine.id || `${routine.templateId}-${routine.intent}`, // Create a unique path component
                contentType: videoFile.type,
                fileExtension: fileExtension,
            });
            const { uploadUrl, filePath } = result.data;

            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': videoFile.type },
                body: videoFile,
            });

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                throw new Error(`Routine video upload failed: ${uploadResponse.statusText}. Details: ${errorText}`);
            }

            videoUrlPath = filePath;
        } catch (error) {
            console.error("Failed to upload routine video:", error);
            throw error;
        }
    }

    const routineToSave = {
        ...routine,
        videoUrl: videoUrlPath,
    };

    const result = await _saveRoutineFn({ routineData: routineToSave });
    return result.data;
};

/**
 * Deletes a routine from the database via the 'deleteRoutine' Firebase Function.
 * @param routineId The ID of the routine to delete.
 */
export const deleteRoutine = async (routineId: string): Promise<void> => {
    try {
        await _deleteRoutineFn({ routineId });
    } catch (error) {
        console.error(`Failed to delete routine ${routineId}:`, error);
        throw error;
    }
};
