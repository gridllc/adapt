import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import type { TraineeSuggestion, AiSuggestion, RefinementSuggestion } from '@/types';

const refineStepFn = httpsCallable<{ moduleId: string, stepIndex: number }, { error?: string, suggestion: RefinementSuggestion }>(functions, 'refineStep');
const submitSuggestionFn = httpsCallable<{ moduleId: string, stepIndex: number, text: string }, TraineeSuggestion>(functions, 'submitSuggestion');
const getTraineeSuggestionsForModuleFn = httpsCallable<{ moduleId: string }, TraineeSuggestion[]>(functions, 'getTraineeSuggestionsForModule');
const getAllPendingSuggestionsFn = httpsCallable<void, (TraineeSuggestion & { module_title?: string })[]>(functions, 'getAllPendingSuggestions');
const deleteTraineeSuggestionFn = httpsCallable<{ suggestionId: string }, void>(functions, 'deleteTraineeSuggestion');
const getAiSuggestionsForModuleFn = httpsCallable<{ moduleId: string }, AiSuggestion[]>(functions, 'getAiSuggestionsForModule');
const getLatestAiSuggestionForStepFn = httpsCallable<{ moduleId: string, stepIndex: number }, AiSuggestion | null>(functions, 'getLatestAiSuggestionForStep');

export const refineStep = async (moduleId: string, stepIndex: number): Promise<{ error?: string, suggestion: RefinementSuggestion }> => {
    const result = await refineStepFn({ moduleId, stepIndex });
    return result.data;
};

export const submitSuggestion = async (moduleId: string, stepIndex: number, suggestionText: string): Promise<TraineeSuggestion> => {
    const result = await submitSuggestionFn({ moduleId, stepIndex, text: suggestionText });
    return result.data;
};

export const getTraineeSuggestionsForModule = async (moduleId: string): Promise<TraineeSuggestion[]> => {
    const result = await getTraineeSuggestionsForModuleFn({ moduleId });
    return result.data;
};

export const getAllPendingSuggestions = async (): Promise<(TraineeSuggestion & { module_title?: string })[]> => {
    const result = await getAllPendingSuggestionsFn();
    return result.data;
};

export const deleteTraineeSuggestion = async (suggestionId: string): Promise<void> => {
    await deleteTraineeSuggestionFn({ suggestionId });
};

export const getAiSuggestionsForModule = async (moduleId: string): Promise<AiSuggestion[]> => {
    const result = await getAiSuggestionsForModuleFn({ moduleId });
    return result.data;
};

export const getLatestAiSuggestionForStep = async (moduleId: string, stepIndex: number): Promise<AiSuggestion | null> => {
    const result = await getLatestAiSuggestionForStepFn({ moduleId, stepIndex });
    return result.data;
};