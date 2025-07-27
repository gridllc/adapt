import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
// Callable function definitions initialized once for performance.
const _flagQuestionFn = httpsCallable(functions, 'flagQuestion');
const _getFlaggedQuestionsFn = httpsCallable(functions, 'getFlaggedQuestions');
/**
 * Submits a question/response pair for admin review via the 'flagQuestion' Firebase Function.
 * @param flagData The data for the question to be flagged.
 * @throws Will throw an error if the flagging operation fails.
 */
export async function flagQuestion(flagData) {
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
/**
 * Retrieves all flagged questions for a given module via the 'getFlaggedQuestions' Firebase Function.
 * @param moduleId The ID of the module.
 * @returns A promise resolving to an array of flagged questions, or an empty array on error.
 */
export async function getFlaggedQuestions(moduleId) {
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
//# sourceMappingURL=flaggingService.js.map