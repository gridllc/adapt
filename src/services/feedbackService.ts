// This service has been migrated to Firebase/GCP.
// The functions below call Firebase Functions which handle interactions
// with the database and Vertex AI for embedding and search.

import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import type { AIFeedbackLog, SimilarFix } from '@/types';

// --- Callable Firebase Functions ---
const logAiFeedbackFn = httpsCallable<Omit<AIFeedbackLog, 'id' | 'createdAt'>, { logId: string }>(functions, 'logAiFeedback');
const updateFeedbackWithFixFn = httpsCallable<{ logId: string, fixOrRating: string }, void>(functions, 'updateFeedbackWithFix');
const findSimilarFixesFn = httpsCallable<{ moduleId: string, stepIndex: number, userQuery: string }, SimilarFix[]>(functions, 'findSimilarFixes');
const getPastFeedbackForStepFn = httpsCallable<{ moduleId: string, stepIndex: number }, AIFeedbackLog[]>(functions, 'getPastFeedbackForStep');


export const logAiFeedback = async (feedbackData: Omit<AIFeedbackLog, 'id' | 'createdAt'>): Promise<string> => {
    try {
        const result = await logAiFeedbackFn(feedbackData);
        return result.data.logId;
    } catch (error) {
        console.error("[Firebase] Failed to log AI feedback:", error);
        // Throwing allows the UI to show a more specific error if needed.
        throw new Error("Could not save AI feedback.");
    }
};

export const updateFeedbackWithFix = async (logId: string, fixOrRating: string): Promise<void> => {
    try {
        await updateFeedbackWithFixFn({ logId, fixOrRating });
    } catch (error) {
        console.error("[Firebase] Failed to update feedback with fix:", error);
        throw new Error("Could not update feedback.");
    }
};

export const getPastFeedbackForStep = async (moduleId: string, stepIndex: number): Promise<AIFeedbackLog[]> => {
    try {
        const result = await getPastFeedbackForStepFn({ moduleId, stepIndex });
        return result.data;
    } catch (error) {
        console.error("[Firebase] Failed to get past feedback for step:", error);
        return [];
    }
};

export const findSimilarFixes = async (moduleId: string, stepIndex: number, userQuery: string): Promise<SimilarFix[]> => {
    try {
        const result = await findSimilarFixesFn({ moduleId, stepIndex, userQuery });
        return result.data;
    } catch (error) {
        console.error("[Firebase] Failed to find similar fixes:", error);
        return [];
    }
};