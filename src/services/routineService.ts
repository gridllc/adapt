import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import type { Routine } from '@/types';

const getRoutinesForTemplateFn = httpsCallable<{ templateId: string }, Routine[]>(functions, 'getRoutinesForTemplate');
const saveRoutineFn = httpsCallable<{ routineData: Omit<Routine, 'id'> & { id?: string; videoUrl: string | null } }, Routine>(functions, 'saveRoutine');
const deleteRoutineFn = httpsCallable<{ routineId: string }, void>(functions, 'deleteRoutine');
const getSignedRoutineVideoUploadUrlFn = httpsCallable<{ routineId: string, contentType: string }, { uploadUrl: string, filePath: string }>(functions, 'getSignedRoutineVideoUploadUrl');
const getRoutineForIntentFn = httpsCallable<{ templateId: string, intent: string }, Routine | null>(functions, 'getRoutineForIntent');
const getAllRoutinesFn = httpsCallable<void, Routine[]>(functions, 'getAllRoutines');

export const getRoutinesForTemplate = async (templateId: string): Promise<Routine[]> => {
    const result = await getRoutinesForTemplateFn({ templateId });
    return result.data;
};

export const getAllRoutines = async (): Promise<Routine[]> => {
    const result = await getAllRoutinesFn();
    return result.data;
};

export const getRoutineForIntent = async (templateId: string, intent: string): Promise<Routine | null> => {
    try {
        const result = await getRoutineForIntentFn({ templateId, intent });
        return result.data;
    } catch (error) {
        console.warn(`Could not find routine for intent '${intent}' in template '${templateId}'.`, error);
        return null;
    }
}

export const saveRoutine = async (routine: Omit<Routine, 'id'> & { id?: string }, videoFile: File | null): Promise<Routine> => {
    let videoUrlPath: string | null = routine.videoUrl || null;

    if (videoFile) {
        try {
            const result = await getSignedRoutineVideoUploadUrlFn({
                routineId: routine.id || `${routine.templateId}-${routine.intent}`, // Create a unique path component
                contentType: videoFile.type,
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

    const result = await saveRoutineFn({ routineData: routineToSave });
    return result.data;
};

export const deleteRoutine = async (routineId: string): Promise<void> => {
    try {
        await deleteRoutineFn({ routineId });
    } catch (error) {
        console.error(`Failed to delete routine ${routineId}:`, error);
        throw error;
    }
};