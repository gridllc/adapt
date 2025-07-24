import type { SessionSummary, SessionState } from '@/types';
import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';

// Callable function definitions initialized once for performance.
const _getSessionFn = httpsCallable<{ moduleId: string, sessionToken: string }, SessionState | null>(functions, 'getSession');
const _saveSessionFn = httpsCallable<Partial<SessionState> & { moduleId: string; sessionToken: string }, void>(functions, 'saveSession');
const _getSessionSummaryFn = httpsCallable<{ moduleId: string, sessionToken: string }, SessionSummary | null>(functions, 'getSessionSummary');
const _getTotalSessionCountFn = httpsCallable<void, number>(functions, 'getTotalSessionCount');
const _getCompletedSessionCountFn = httpsCallable<void, number>(functions, 'getCompletedSessionCount');

/**
 * Fetches the current state of a training session via the 'getSession' Firebase Function.
 * @param moduleId The ID of the module.
 * @param sessionToken The unique token for the session.
 * @returns A promise resolving to the session state, or null if not found or on error.
 */
export const getSession = async (moduleId: string, sessionToken: string): Promise<SessionState | null> => {
    try {
        const result = await _getSessionFn({ moduleId, sessionToken });
        return result.data;
    } catch (error) {
        console.error("Error fetching session:", error);
        return null; // Gracefully return null on failure.
    }
};

/**
 * Saves the state of a training session via the 'saveSession' Firebase Function.
 * This is a "fire-and-forget" operation from the client's perspective.
 * @param state The session state object to save. Must include moduleId and sessionToken.
 */
export const saveSession = async (state: Partial<SessionState> & { moduleId: string; sessionToken: string }): Promise<void> => {
    try {
        await _saveSessionFn(state);
    } catch (error) {
        console.warn("Could not save session state:", error);
    }
};

/**
 * Fetches a detailed summary of a completed session for review via the 'getSessionSummary' Firebase Function.
 * @param moduleId The ID of the module.
 * @param sessionToken The unique token for the session.
 * @returns A promise resolving to the session summary. Throws on error.
 */
export const getSessionSummary = async (moduleId: string, sessionToken: string): Promise<SessionSummary | null> => {
    try {
        const result = await _getSessionSummaryFn({ moduleId, sessionToken });
        return result.data;
    } catch (error) {
        console.error("Error fetching session summary:", error);
        throw error;
    }
};

/**
 * Fetches the total number of training sessions started on the platform via the 'getTotalSessionCount' Firebase Function.
 * @returns A promise resolving to the total count.
 */
export const getTotalSessionCount = async (): Promise<number> => {
    try {
        const result = await _getTotalSessionCountFn();
        return result.data;
    } catch (error) {
        console.error("Error fetching total session count:", error);
        throw error;
    }
};

/**
 * Fetches the number of completed training sessions on the platform via the 'getCompletedSessionCount' Firebase Function.
 * @returns A promise resolving to the completed session count.
 */
export const getCompletedSessionCount = async (): Promise<number> => {
    try {
        const result = await _getCompletedSessionCountFn();
        return result.data;
    } catch (error) {
        console.error("Error fetching completed session count:", error);
        throw error;
    }
};
