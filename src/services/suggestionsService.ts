import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import type { TraineeSuggestion, AiSuggestion, RefinementSuggestion } from '@/types';

// Callable function definitions initialized once for performance.
const _refineStepFn = httpsCallable<{ moduleId: string, stepIndex: number }, { error?: string, suggestion: RefinementSuggestion }>(functions, 'refineStep');
const _submitSuggestionFn = httpsCallable<{ moduleId: string, stepIndex: number, text: string }, TraineeSuggestion>(functions, 'submitSuggestion');
const _getTraineeSuggestionsForModuleFn = httpsCallable<{ moduleId: string }, TraineeSuggestion[]>(functions, 'getTraineeSuggestionsForModule');
const _getAllPendingSuggestionsFn = httpsCallable<void, (TraineeSuggestion & { module_title?: string })[]>(functions, 'getAllPendingSuggestions');
const _deleteTraineeSuggestionFn = httpsCallable<{ suggestionId: string }, void>(functions, 'deleteTraineeSuggestion');
const _getAiSuggestionsForModuleFn = httpsCallable<{ moduleId: string }, AiSuggestion[]>(functions, 'getAiSuggestionsForModule');
const _getLatestAiSuggestionForStepFn = httpsCallable<{ moduleId: string, stepIndex: number }, AiSuggestion | null>(functions, 'getLatestAiSuggestionForStep');

/**
 * Invokes an AI to analyze a step and suggest improvements via the 'refineStep' Firebase Function.
 * @param moduleId The ID of the module.
 * @param stepIndex The index of the step to refine.
 * @returns A promise that resolves with the AI's refinement suggestion.
 */
export const refineStep = async (moduleId: string, stepIndex: number): Promise<{ error?: string, suggestion: RefinementSuggestion }> => {
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
export const submitSuggestion = async (moduleId: string, stepIndex: number, suggestionText: string): Promise<TraineeSuggestion> => {
    const result = await _submitSuggestionFn({ moduleId, stepIndex, text: suggestionText });
    return result.data;
};

/**
 * Fetches all trainee-submitted suggestions for a module via the 'getTraineeSuggestionsForModule' Firebase Function.
 * @param moduleId The ID of the module.
 * @returns A promise that resolves with an array of trainee suggestions.
 */
export const getTraineeSuggestionsForModule = async (moduleId: string): Promise<TraineeSuggestion[]> => {
    const result = await _getTraineeSuggestionsForModuleFn({ moduleId });
    return result.data;
};

/**
 * Fetches all pending trainee suggestions across all modules via the 'getAllPendingSuggestions' Firebase Function.
 * @returns A promise that resolves with an array of pending suggestions, augmented with module titles.
 */
export const getAllPendingSuggestions = async (): Promise<(TraineeSuggestion & { module_title?: string })[]> => {
    const result = await _getAllPendingSuggestionsFn();
    return result.data;
};

/**
 * Deletes a trainee's suggestion from the database via the 'deleteTraineeSuggestion' Firebase Function.
 * @param suggestionId The ID of the suggestion to delete.
 */
export const deleteTraineeSuggestion = async (suggestionId: string): Promise<void> => {
    await _deleteTraineeSuggestionFn({ suggestionId });
};

/**
 * Fetches all AI-generated suggestions for a module via the 'getAiSuggestionsForModule' Firebase Function.
 * @param moduleId The ID of the module.
 * @returns A promise that resolves with an array of AI suggestions.
 */
export const getAiSuggestionsForModule = async (moduleId: string): Promise<AiSuggestion[]> => {
    const result = await _getAiSuggestionsForModuleFn({ moduleId });
    return result.data;
};

/**
 * Fetches the most recent AI-generated suggestion for a specific step via the 'getLatestAiSuggestionForStep' Firebase Function.
 * @param moduleId The ID of the module.
 * @param stepIndex The index of the step.
 * @returns A promise that resolves with the latest AI suggestion or null if none exists.
 */
export const getLatestAiSuggestionForStep = async (moduleId: string, stepIndex: number): Promise<AiSuggestion | null> => {
    const result = await _getLatestAiSuggestionForStepFn({ moduleId, stepIndex });
    return result.data;
};
