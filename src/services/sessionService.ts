import type { SessionSummary, SessionState } from '@/types';
import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import type { Functions } from 'firebase/functions';

const getSessionFn = httpsCallable<{ moduleId: string, sessionToken: string }, SessionState | null>(functions as Functions, 'getSession');
const saveSessionFn = httpsCallable<Partial<SessionState> & { moduleId: string; sessionToken: string }>(functions as Functions, 'saveSession');
const getSessionSummaryFn = httpsCallable<{ moduleId: string, sessionToken: string }, SessionSummary | null>(functions as Functions, 'getSessionSummary');
const getTotalSessionCountFn = httpsCallable<void, number>(functions as Functions, 'getTotalSessionCount');
const getCompletedSessionCountFn = httpsCallable<void, number>(functions as Functions, 'getCompletedSessionCount');

export const getSession = async (moduleId: string, sessionToken: string): Promise<SessionState | null> => {
    try {
        const result = await getSessionFn({ moduleId, sessionToken });
        return result.data;
    } catch (error) {
        console.error("Error fetching session:", error);
        return null;
    }
};

export const saveSession = async (state: Partial<SessionState> & { moduleId: string; sessionToken: string }): Promise<void> => {
    try {
        await saveSessionFn(state);
    } catch (error) {
        console.warn("Could not save session state:", error);
    }
};

export const getSessionSummary = async (moduleId: string, sessionToken: string): Promise<SessionSummary | null> => {
    try {
        const result = await getSessionSummaryFn({ moduleId, sessionToken });
        return result.data;
    } catch (error) {
        console.error("Error fetching session summary:", error);
        throw error;
    }
};

export const getTotalSessionCount = async (): Promise<number> => {
    try {
        const result = await getTotalSessionCountFn();
        return result.data;
    } catch (error) {
        console.error("Error fetching total session count:", error);
        throw error;
    }
};

export const getCompletedSessionCount = async (): Promise<number> => {
    try {
        const result = await getCompletedSessionCountFn();
        return result.data;
    } catch (error) {
        console.error("Error fetching completed session count:", error);
        throw error;
    }
};