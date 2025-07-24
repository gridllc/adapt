import { functions } from '@/firebase';
import type firebase from 'firebase/compat/app';
import 'firebase/compat/functions';
import type { Routine } from '@/types';

const getRoutinesForTemplateFn = functions.httpsCallable('getRoutinesForTemplate');
const saveRoutineFn = functions.httpsCallable('saveRoutine');
const deleteRoutineFn = functions.httpsCallable('deleteRoutine');
const getSignedRoutineVideoUploadUrlFn = functions.httpsCallable('getSignedRoutineVideoUploadUrl');
const getRoutineForIntentFn = functions.httpsCallable('getRoutineForIntent');

export const getRoutinesForTemplate = async (templateId: string): Promise<Routine[]> => {
    const result: firebase.functions.HttpsCallableResult = await getRoutinesForTemplateFn({ templateId });
    return result.data as Routine[];
};

export const getRoutineForIntent = async (templateId: string, intent: string): Promise<Routine | null> => {
    try {
        const result: firebase.functions.HttpsCallableResult = await getRoutineForIntentFn({ templateId, intent });
        return result.data as Routine | null;
    } catch (error) {
        console.warn(`Could not find routine for intent '${intent}' in template '${templateId}'.`, error);
        return null;
    }
}

export const saveRoutine = async (routine: Omit<Routine, 'id'> & { id?: string }, videoFile: File | null): Promise<Routine> => {
    let videoUrlPath: string | null = routine.videoUrl || null;

    if (videoFile) {
        try {
            const result: firebase.functions.HttpsCallableResult = await getSignedRoutineVideoUploadUrlFn({
                routineId: routine.id || `${routine.templateId}-${routine.intent}`, // Create a unique path component
                contentType: videoFile.type,
            });
            const { uploadUrl, filePath } = result.data as { uploadUrl: string, filePath: string };

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

    const result: firebase.functions.HttpsCallableResult = await saveRoutineFn({ routineData: routineToSave });
    return result.data as Routine;
};

export const deleteRoutine = async (routineId: string): Promise<void> => {
    try {
        await deleteRoutineFn({ routineId });
    } catch (error) {
        console.error(`Failed to delete routine ${routineId}:`, error);
        throw error;
    }
};