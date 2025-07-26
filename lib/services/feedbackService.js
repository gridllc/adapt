"use strict";
// This service has been migrated to Firebase/GCP.
// The functions below call Firebase Functions which handle interactions
// with the database and Vertex AI for embedding and search.
Object.defineProperty(exports, "__esModule", { value: true });
exports.findSimilarFixes = exports.getPastFeedbackForStep = exports.updateFeedbackWithFix = exports.logAiFeedback = void 0;
const firebase_1 = require("@/firebase");
const functions_1 = require("firebase/functions");
// Callable function definitions initialized once for performance.
const _logAiFeedbackFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'logAiFeedback');
const _updateFeedbackWithFixFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'updateFeedbackWithFix');
const _findSimilarFixesFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'findSimilarFixes');
const _getPastFeedbackForStepFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'getPastFeedbackForStep');
/**
 * Logs AI feedback to the database via the 'logAiFeedback' Firebase Function.
 * @param feedbackData The feedback data to log.
 * @returns A promise that resolves with the new log entry's ID.
 */
const logAiFeedback = async (feedbackData) => {
    try {
        const result = await _logAiFeedbackFn(feedbackData);
        return result.data.logId;
    }
    catch (error) {
        console.error("[Firebase] Failed to log AI feedback:", error);
        throw new Error("Could not save AI feedback.");
    }
};
exports.logAiFeedback = logAiFeedback;
/**
 * Updates a feedback entry with a user's correction or a 'good' rating via the 'updateFeedbackWithFix' Firebase Function.
 * @param logId The ID of the feedback log to update.
 * @param fixOrRating The user's text correction or the string 'good'.
 */
const updateFeedbackWithFix = async (logId, fixOrRating) => {
    try {
        await _updateFeedbackWithFixFn({ logId, fixOrRating });
    }
    catch (error) {
        console.error("[Firebase] Failed to update feedback with fix:", error);
        throw new Error("Could not update feedback.");
    }
};
exports.updateFeedbackWithFix = updateFeedbackWithFix;
/**
 * Fetches historical feedback for a specific step via the 'getPastFeedbackForStep' Firebase Function.
 * @param moduleId The ID of the module.
 * @param stepIndex The index of the step.
 * @returns A promise that resolves to an array of past feedback logs, or an empty array on error.
 */
const getPastFeedbackForStep = async (moduleId, stepIndex) => {
    try {
        const result = await _getPastFeedbackForStepFn({ moduleId, stepIndex });
        return result.data;
    }
    catch (error) {
        console.error("[Firebase] Failed to get past feedback for step:", error);
        return [];
    }
};
exports.getPastFeedbackForStep = getPastFeedbackForStep;
/**
 * Finds similar, successfully resolved issues from other users via the 'findSimilarFixes' Firebase Function.
 * @param moduleId The ID of the module.
 * @param stepIndex The index of the step.
 * @param userQuery The user's current query or problem description.
 * @returns A promise that resolves to an array of similar fixes, or an empty array on error.
 */
const findSimilarFixes = async (moduleId, stepIndex, userQuery) => {
    try {
        const result = await _findSimilarFixesFn({ moduleId, stepIndex, userQuery });
        return result.data;
    }
    catch (error) {
        console.error("[Firebase] Failed to find similar fixes:", error);
        return [];
    }
};
exports.findSimilarFixes = findSimilarFixes;
