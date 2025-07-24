import type { SessionSummary, SessionState } from '@/types';
import { functions } from '@/firebase';

const getSessionFn = functions.httpsCallable('getSession');
const saveSessionFn = functions.httpsCallable('saveSession');
const getSessionSummaryFn = functions.httpsCallable('getSessionSummary');
const getTotalSessionCountFn = functions.httpsCallable('getTotalSessionCount');
const getCompletedSessionCountFn = functions.httpsCallable('getCompletedSessionCount');

export const getSession = async (moduleId: string, sessionToken: string): Promise<SessionState | null> => {
    try {
        const result = await getSessionFn({ moduleId, sessionToken });
        return result.data as SessionState | null;
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
        return result.data as SessionSummary | null;
    } catch (error) {
        console.error("Error fetching session summary:", error);
        throw error;
    }
};

export const getTotalSessionCount = async (): Promise<number> => {
    try {
        const result = await getTotalSessionCountFn();
        return result.data as number;
    } catch (error) {
        console.error("Error fetching total session count:", error);
        throw error;
    }
};

export const getCompletedSessionCount = async (): Promise<number> => {
    try {
        const result = await getCompletedSessionCountFn();
        return result.data as number;
    } catch (error) {
        console.error("Error fetching completed session count:", error);
        throw error;
    }
};