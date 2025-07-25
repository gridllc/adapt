// This service has been migrated to Firebase/GCP.
// The functions below call Firebase Functions which handle interactions
// with the database and Vertex AI for embedding and search.

import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import type { AIFeedbackLog, SimilarFix } from '@/types';

// Callable function definitions initialized once for performance.
const _logAiFeedbackFn = httpsCallable<Omit<AIFeedbackLog, 'id' | 'createdAt'>, { logId: string }>(functions, 'logAiFeedback');
const _updateFeedbackWithFixFn = httpsCallable<{ logId: string, fixOrRating: string }, void>(functions, 'updateFeedbackWithFix');
const _findSimilarFixesFn = httpsCallable<{ moduleId: string, stepIndex: number, userQuery: string }, SimilarFix[]>(functions, 'findSimilarFixes');
const _getPastFeedbackForStepFn = httpsCallable<{ moduleId: string, stepIndex: number }, AIFeedbackLog[]>(functions, 'getPastFeedbackForStep');

/**
 * Logs AI feedback to the database via the 'logAiFeedback' Firebase Function.
 * @param feedbackData The feedback data to log.
 * @returns A promise that resolves with the new log entry's ID.
 */
export const logAiFeedback = async (feedbackData: Omit<AIFeedbackLog, 'id' | 'createdAt'>): Promise<string> => {
    try {
        const result = await _logAiFeedbackFn(feedbackData);
        return result.data.logId;
    } catch (error) {
        console.error("[Firebase] Failed to log AI feedback:", error);
        throw new Error("Could not save AI feedback.");
    }
};

/**
 * Updates a feedback entry with a user's correction or a 'good' rating via the 'updateFeedbackWithFix' Firebase Function.
 * @param logId The ID of the feedback log to update.
 * @param fixOrRating The user's text correction or the string 'good'.
 */
export const updateFeedbackWithFix = async (logId: string, fixOrRating: string): Promise<void> => {
    try {
        await _updateFeedbackWithFixFn({ logId, fixOrRating });
    } catch (error) {
        console.error("[Firebase] Failed to update feedback with fix:", error);
        throw new Error("Could not update feedback.");
    }
};

/**
 * Fetches historical feedback for a specific step via the 'getPastFeedbackForStep' Firebase Function.
 * @param moduleId The ID of the module.
 * @param stepIndex The index of the step.
 * @returns A promise that resolves to an array of past feedback logs, or an empty array on error.
 */
export const getPastFeedbackForStep = async (moduleId: string, stepIndex: number): Promise<AIFeedbackLog[]> => {
    try {
        const result = await _getPastFeedbackForStepFn({ moduleId, stepIndex });
        return result.data;
    } catch (error) {
        console.error("[Firebase] Failed to get past feedback for step:", error);
        return [];
    }
};

/**
 * Finds similar, successfully resolved issues from other users via the 'findSimilarFixes' Firebase Function.
 * @param moduleId The ID of the module.
 * @param stepIndex The index of the step.
 * @param userQuery The user's current query or problem description.
 * @returns A promise that resolves to an array of similar fixes, or an empty array on error.
 */
export const findSimilarFixes = async (moduleId: string, stepIndex: number, userQuery: string): Promise<SimilarFix[]> => {
    try {
        const result = await _findSimilarFixesFn({ moduleId, stepIndex, userQuery });
        return result.data;
    } catch (error) {
        console.error("[Firebase] Failed to find similar fixes:", error);
        return [];
    }
};
