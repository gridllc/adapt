import { functions } from '@/firebase';
import type firebase from 'firebase/compat/app';
import 'firebase/compat/functions';
import type { FlaggedQuestion, FlaggedQuestionForInsert } from '@/types';

// --- Callable Firebase Functions ---
const flagQuestionFn = functions.httpsCallable('flagQuestion');
const getFlaggedQuestionsFn = functions.httpsCallable('getFlaggedQuestions');

export async function flagQuestion(flagData: FlaggedQuestionForInsert): Promise<void> {
    try {
        await flagQuestionFn(flagData);
    } catch (error) {
        console.error("[Firebase] Error flagging question:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to flag the question: ${error.message}`);
        }
        throw new Error("An unknown error occurred while flagging the question.");
    }
}

export async function getFlaggedQuestions(moduleId: string): Promise<FlaggedQuestion[]> {
    try {
        const result: firebase.functions.HttpsCallableResult = await getFlaggedQuestionsFn({ moduleId });
        return result.data as FlaggedQuestion[];
    } catch (error) {
        console.error("[Firebase] Error fetching flagged questions:", error);
        // Return empty on error to prevent UI crashes.
        return [];
    }
}