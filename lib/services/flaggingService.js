"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFlaggedQuestions = exports.flagQuestion = void 0;
const firebase_1 = require("@/firebase");
const functions_1 = require("firebase/functions");
// Callable function definitions initialized once for performance.
const _flagQuestionFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'flagQuestion');
const _getFlaggedQuestionsFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'getFlaggedQuestions');
/**
 * Submits a question/response pair for admin review via the 'flagQuestion' Firebase Function.
 * @param flagData The data for the question to be flagged.
 * @throws Will throw an error if the flagging operation fails.
 */
async function flagQuestion(flagData) {
    try {
        await _flagQuestionFn(flagData);
    }
    catch (error) {
        console.error("[Firebase] Error flagging question:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to flag the question: ${error.message}`);
        }
        throw new Error("An unknown error occurred while flagging the question.");
    }
}
exports.flagQuestion = flagQuestion;
/**
 * Retrieves all flagged questions for a given module via the 'getFlaggedQuestions' Firebase Function.
 * @param moduleId The ID of the module.
 * @returns A promise resolving to an array of flagged questions, or an empty array on error.
 */
async function getFlaggedQuestions(moduleId) {
    try {
        const result = await _getFlaggedQuestionsFn({ moduleId });
        return result.data;
    }
    catch (error) {
        console.error("[Firebase] Error fetching flagged questions:", error);
        // Return empty on error to prevent UI crashes.
        return [];
    }
}
exports.getFlaggedQuestions = getFlaggedQuestions;
