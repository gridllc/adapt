import type { SessionSummary, SessionState } from '@/types';
import { auth } from '@/firebase';

async function authedApiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    const headers = new Headers(options?.headers);
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'An unknown API error occurred.' }));
        throw new Error(errorBody.error || `Request failed with status ${response.status}`);
    }
    if (response.status === 204) {
        return null as T;
    }
    return response.json();
}

export const getSession = async (moduleId: string, sessionToken: string): Promise<SessionState | null> => {
    try {
        const url = `/api/sessions?moduleId=${encodeURIComponent(moduleId)}&sessionToken=${encodeURIComponent(sessionToken)}`;
        // Publicly accessible for trainees, no auth needed for GET
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch session");
        return response.json();
    } catch (error) {
        console.error("Error fetching session:", error);
        return null;
    }
};

export const saveSession = async (state: Partial<SessionState> & { moduleId: string; sessionToken: string }): Promise<void> => {
    try {
        // Publicly accessible for trainees, no auth needed for POST
        await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state),
        });
    } catch (error) {
        console.warn("Could not save session state:", error);
    }
};

export const getSessionSummary = async (moduleId: string, sessionToken: string): Promise<SessionSummary | null> => {
    const url = `/api/sessions/summary?moduleId=${encodeURIComponent(moduleId)}&sessionToken=${encodeURIComponent(sessionToken)}`;
    return authedApiFetch<SessionSummary | null>(url);
};

export const getTotalSessionCount = async (): Promise<number> => {
    return authedApiFetch<number>('/api/sessions/count/total');
};

export const getCompletedSessionCount = async (): Promise<number> => {
    return authedApiFetch<number>('/api/sessions/count/completed');
};