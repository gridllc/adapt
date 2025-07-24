import { functions } from '@/firebase';
import type { TraineeSuggestion, AiSuggestion, RefinementSuggestion } from '@/types';

const refineStepFn = functions.httpsCallable('refineStep');
const submitSuggestionFn = functions.httpsCallable('submitSuggestion');
const getTraineeSuggestionsForModuleFn = functions.httpsCallable('getTraineeSuggestionsForModule');
const getAllPendingSuggestionsFn = functions.httpsCallable('getAllPendingSuggestions');
const deleteTraineeSuggestionFn = functions.httpsCallable('deleteTraineeSuggestion');
const getAiSuggestionsForModuleFn = functions.httpsCallable('getAiSuggestionsForModule');
const getLatestAiSuggestionForStepFn = functions.httpsCallable('getLatestAiSuggestionForStep');

export const refineStep = async (moduleId: string, stepIndex: number): Promise<{ error?: string, suggestion: RefinementSuggestion }> => {
    const result = await refineStepFn({ moduleId, stepIndex });
    return result.data as { error?: string, suggestion: RefinementSuggestion };
};

export const submitSuggestion = async (moduleId: string, stepIndex: number, suggestionText: string): Promise<TraineeSuggestion> => {
    const result = await submitSuggestionFn({ moduleId, stepIndex, text: suggestionText });
    return result.data as TraineeSuggestion;
};

export const getTraineeSuggestionsForModule = async (moduleId: string): Promise<TraineeSuggestion[]> => {
    const result = await getTraineeSuggestionsForModuleFn({ moduleId });
    return result.data as TraineeSuggestion[];
};

export const getAllPendingSuggestions = async (): Promise<(TraineeSuggestion & { module_title?: string })[]> => {
    const result = await getAllPendingSuggestionsFn();
    return result.data as (TraineeSuggestion & { module_title?: string })[];
};

export const deleteTraineeSuggestion = async (suggestionId: string): Promise<void> => {
    await deleteTraineeSuggestionFn({ suggestionId });
};

export const getAiSuggestionsForModule = async (moduleId: string): Promise<AiSuggestion[]> => {
    const result = await getAiSuggestionsForModuleFn({ moduleId });
    return result.data as AiSuggestion[];
};

export const getLatestAiSuggestionForStep = async (moduleId: string, stepIndex: number): Promise<AiSuggestion | null> => {
    const result = await getLatestAiSuggestionForStepFn({ moduleId, stepIndex });
    return result.data as AiSuggestion | null;
};