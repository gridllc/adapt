import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
// Callable function definitions initialized once for performance.
const _refineStepFn = httpsCallable(functions, 'refineStep');
const _submitSuggestionFn = httpsCallable(functions, 'submitSuggestion');
const _getTraineeSuggestionsForModuleFn = httpsCallable(functions, 'getTraineeSuggestionsForModule');
const _getAllPendingSuggestionsFn = httpsCallable(functions, 'getAllPendingSuggestions');
const _deleteTraineeSuggestionFn = httpsCallable(functions, 'deleteTraineeSuggestion');
const _getAiSuggestionsForModuleFn = httpsCallable(functions, 'getAiSuggestionsForModule');
const _getLatestAiSuggestionForStepFn = httpsCallable(functions, 'getLatestAiSuggestionForStep');
/**
 * Invokes an AI to analyze a step and suggest improvements via the 'refineStep' Firebase Function.
 * @param moduleId The ID of the module.
 * @param stepIndex The index of the step to refine.
 * @returns A promise that resolves with the AI's refinement suggestion.
 */
export const refineStep = async (moduleId, stepIndex) => {
    const result = await _refineStepFn({ moduleId, stepIndex });
    return result.data;
};
/**
 * Submits a suggestion from a trainee for a specific step via the 'submitSuggestion' Firebase Function.
 * @param moduleId The ID of the module.
 * @param stepIndex The index of the step the suggestion is for.
 * @param suggestionText The text of the trainee's suggestion.
 * @returns A promise that resolves with the created suggestion object.
 */
export const submitSuggestion = async (moduleId, stepIndex, suggestionText) => {
    const result = await _submitSuggestionFn({ moduleId, stepIndex, text: suggestionText });
    return result.data;
};
/**
 * Fetches all trainee-submitted suggestions for a module via the 'getTraineeSuggestionsForModule' Firebase Function.
 * @param moduleId The ID of the module.
 * @returns A promise that resolves with an array of trainee suggestions.
 */
export const getTraineeSuggestionsForModule = async (moduleId) => {
    const result = await _getTraineeSuggestionsForModuleFn({ moduleId });
    return result.data;
};
/**
 * Fetches all pending trainee suggestions across all modules via the 'getAllPendingSuggestions' Firebase Function.
 * @returns A promise that resolves with an array of pending suggestions, augmented with module titles.
 */
export const getAllPendingSuggestions = async () => {
    const result = await _getAllPendingSuggestionsFn();
    return result.data;
};
/**
 * Deletes a trainee's suggestion from the database via the 'deleteTraineeSuggestion' Firebase Function.
 * @param suggestionId The ID of the suggestion to delete.
 */
export const deleteTraineeSuggestion = async (suggestionId) => {
    await _deleteTraineeSuggestionFn({ suggestionId });
};
/**
 * Fetches all AI-generated suggestions for a module via the 'getAiSuggestionsForModule' Firebase Function.
 * @param moduleId The ID of the module.
 * @returns A promise that resolves with an array of AI suggestions.
 */
export const getAiSuggestionsForModule = async (moduleId) => {
    const result = await _getAiSuggestionsForModuleFn({ moduleId });
    return result.data;
};
/**
 * Fetches the most recent AI-generated suggestion for a specific step via the 'getLatestAiSuggestionForStep' Firebase Function.
 * @param moduleId The ID of the module.
 * @param stepIndex The index of the step.
 * @returns A promise that resolves with the latest AI suggestion or null if none exists.
 */
export const getLatestAiSuggestionForStep = async (moduleId, stepIndex) => {
    const result = await _getLatestAiSuggestionForStepFn({ moduleId, stepIndex });
    return result.data;
};
//# sourceMappingURL=suggestionsService.js.map