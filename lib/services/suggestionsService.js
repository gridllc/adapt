"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestAiSuggestionForStep = exports.getAiSuggestionsForModule = exports.deleteTraineeSuggestion = exports.getAllPendingSuggestions = exports.getTraineeSuggestionsForModule = exports.submitSuggestion = exports.refineStep = void 0;
const firebase_1 = require("@/firebase");
const functions_1 = require("firebase/functions");
// Callable function definitions initialized once for performance.
const _refineStepFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'refineStep');
const _submitSuggestionFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'submitSuggestion');
const _getTraineeSuggestionsForModuleFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'getTraineeSuggestionsForModule');
const _getAllPendingSuggestionsFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'getAllPendingSuggestions');
const _deleteTraineeSuggestionFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'deleteTraineeSuggestion');
const _getAiSuggestionsForModuleFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'getAiSuggestionsForModule');
const _getLatestAiSuggestionForStepFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'getLatestAiSuggestionForStep');
/**
 * Invokes an AI to analyze a step and suggest improvements via the 'refineStep' Firebase Function.
 * @param moduleId The ID of the module.
 * @param stepIndex The index of the step to refine.
 * @returns A promise that resolves with the AI's refinement suggestion.
 */
const refineStep = async (moduleId, stepIndex) => {
    const result = await _refineStepFn({ moduleId, stepIndex });
    return result.data;
};
exports.refineStep = refineStep;
/**
 * Submits a suggestion from a trainee for a specific step via the 'submitSuggestion' Firebase Function.
 * @param moduleId The ID of the module.
 * @param stepIndex The index of the step the suggestion is for.
 * @param suggestionText The text of the trainee's suggestion.
 * @returns A promise that resolves with the created suggestion object.
 */
const submitSuggestion = async (moduleId, stepIndex, suggestionText) => {
    const result = await _submitSuggestionFn({ moduleId, stepIndex, text: suggestionText });
    return result.data;
};
exports.submitSuggestion = submitSuggestion;
/**
 * Fetches all trainee-submitted suggestions for a module via the 'getTraineeSuggestionsForModule' Firebase Function.
 * @param moduleId The ID of the module.
 * @returns A promise that resolves with an array of trainee suggestions.
 */
const getTraineeSuggestionsForModule = async (moduleId) => {
    const result = await _getTraineeSuggestionsForModuleFn({ moduleId });
    return result.data;
};
exports.getTraineeSuggestionsForModule = getTraineeSuggestionsForModule;
/**
 * Fetches all pending trainee suggestions across all modules via the 'getAllPendingSuggestions' Firebase Function.
 * @returns A promise that resolves with an array of pending suggestions, augmented with module titles.
 */
const getAllPendingSuggestions = async () => {
    const result = await _getAllPendingSuggestionsFn();
    return result.data;
};
exports.getAllPendingSuggestions = getAllPendingSuggestions;
/**
 * Deletes a trainee's suggestion from the database via the 'deleteTraineeSuggestion' Firebase Function.
 * @param suggestionId The ID of the suggestion to delete.
 */
const deleteTraineeSuggestion = async (suggestionId) => {
    await _deleteTraineeSuggestionFn({ suggestionId });
};
exports.deleteTraineeSuggestion = deleteTraineeSuggestion;
/**
 * Fetches all AI-generated suggestions for a module via the 'getAiSuggestionsForModule' Firebase Function.
 * @param moduleId The ID of the module.
 * @returns A promise that resolves with an array of AI suggestions.
 */
const getAiSuggestionsForModule = async (moduleId) => {
    const result = await _getAiSuggestionsForModuleFn({ moduleId });
    return result.data;
};
exports.getAiSuggestionsForModule = getAiSuggestionsForModule;
/**
 * Fetches the most recent AI-generated suggestion for a specific step via the 'getLatestAiSuggestionForStep' Firebase Function.
 * @param moduleId The ID of the module.
 * @param stepIndex The index of the step.
 * @returns A promise that resolves with the latest AI suggestion or null if none exists.
 */
const getLatestAiSuggestionForStep = async (moduleId, stepIndex) => {
    const result = await _getLatestAiSuggestionForStepFn({ moduleId, stepIndex });
    return result.data;
};
exports.getLatestAiSuggestionForStep = getLatestAiSuggestionForStep;
