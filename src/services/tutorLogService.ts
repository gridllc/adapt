// This service has been migrated to Firebase/GCP.
// The functions below call Firebase Functions which handle interactions
// with the database and Vertex AI Matching Engine.

import { functions } from '@/firebase';
import type { TutorLog } from '@/types';
import type { DetectedAlias } from '@/utils/aliasService';

interface TutorLogPayload {
    moduleId: string;
    stepIndex: number;
    userQuestion: string;
    tutorResponse: string;
    templateId?: string | null;
    stepTitle?: string | null;
    remoteType?: 'A' | 'B' | 'ai-routine' | null;
    aliases?: DetectedAlias[];
}

// --- Callable Firebase Functions ---
const logTutorInteractionFn = functions.httpsCallable('logTutorInteraction');
const findSimilarInteractionsFn = functions.httpsCallable('findSimilarInteractions');


/**
 * Logs a user's question and the AI's response to Firestore via a Firebase Function.
 * The backend function is responsible for generating an embedding for the question.
 * This is a "fire-and-forget" call from the client's perspective.
 */
export const logTutorInteraction = async (payload: TutorLogPayload): Promise<void> => {
    try {
        await logTutorInteractionFn(payload);
    } catch (error) {
        // We don't want to block the user's experience if logging fails,
        // but we should report the error.
        console.error("[Firebase] Failed to log tutor interaction:", error);
    }
};

/**
 * Finds similar past interactions from the "collective memory" (vector database) via a Firebase Function.
 * @param moduleId The current module's slug.
 * @param question The user's question to find matches for.
 * @returns A promise that resolves to an array of similar TutorLog objects.
 */
export const findSimilarInteractions = async (
    moduleId: string,
    question: string
): Promise<TutorLog[]> => {
    try {
        const result = await findSimilarInteractionsFn({ moduleId, question });
        // The callable function result is in `result.data`.
        return result.data as TutorLog[];
    } catch (error) {
        console.error("[Firebase] Failed to find similar interactions:", error);
        // Return an empty array on failure to prevent the chat from crashing.
        return [];
    }
};