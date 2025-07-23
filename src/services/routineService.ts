import { functions } from '@/firebase';
import type { Routine } from '@/types';

const getRoutinesForTemplateFn = functions.httpsCallable('getRoutinesForTemplate');
const saveRoutineFn = functions.httpsCallable('saveRoutine');
const deleteRoutineFn = functions.httpsCallable('deleteRoutine');
const getSignedRoutineVideoUploadUrlFn = functions.httpsCallable('getSignedRoutineVideoUploadUrl');
const getRoutineForIntentFn = functions.httpsCallable('getRoutineForIntent');

export const getRoutinesForTemplate = async (templateId: string): Promise<Routine[]> => {
    const result = await getRoutinesForTemplateFn({ templateId });
    return result.data as Routine[];
};

export const getRoutineForIntent = async (templateId: string, intent: string): Promise<Routine | null> => {
    try {
        const result = await getRoutineForIntentFn({ templateId, intent });
        return result.data as Routine | null;
    } catch (error) {
        console.warn(`Could not find routine for intent '${intent}' in template '${templateId}'.`, error);
        return null;
    }
}

export const saveRoutine = async (routine: Omit<Routine, 'id'> & { id?: string }, videoFile: File | null): Promise<Routine> => {
    let videoUrlPath: string | null = routine.videoUrl || null;

    if (videoFile) {
        const result = await getSignedRoutineVideoUploadUrlFn({
            templateId: routine.templateId,
            intent: routine.intent,
            contentType: videoFile.type,
        });
        const { uploadUrl, filePath } = result.data as { uploadUrl: string; filePath: string };

        await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': videoFile.type },
            body: videoFile,
        });

        videoUrlPath = filePath;
    }

    const result = await saveRoutineFn({ routine: { ...routine, videoUrl: videoUrlPath } });
    return result.data as Routine;
};

export const deleteRoutine = async (routineId: string): Promise<void> => {
    await deleteRoutineFn({ routineId });
};