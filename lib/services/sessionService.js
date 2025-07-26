"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompletedSessionCount = exports.getTotalSessionCount = exports.getSessionSummary = exports.saveSession = exports.getSession = void 0;
const firebase_1 = require("@/firebase");
const baseUrl = import.meta.env.VITE_API_URL || '';
async function authedApiFetch(url, options) {
    const token = firebase_1.auth.currentUser ? await firebase_1.auth.currentUser.getIdToken() : null;
    const headers = new Headers(options?.headers);
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await fetch(`${baseUrl}${url}`, { ...options, headers });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'An unknown API error occurred.' }));
        throw new Error(errorBody.error || `Request failed with status ${response.status}`);
    }
    if (response.status === 204) {
        return null;
    }
    return response.json();
}
const getSession = async (moduleId, sessionToken) => {
    try {
        const url = `/api/sessions?moduleId=${encodeURIComponent(moduleId)}&sessionToken=${encodeURIComponent(sessionToken)}`;
        // Publicly accessible for trainees, no auth needed for GET
        const response = await fetch(`${baseUrl}${url}`);
        if (!response.ok)
            throw new Error("Failed to fetch session");
        return response.json();
    }
    catch (error) {
        console.error("Error fetching session:", error);
        return null;
    }
};
exports.getSession = getSession;
const saveSession = async (state) => {
    try {
        // Publicly accessible for trainees, no auth needed for POST
        await fetch(`${baseUrl}/api/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state),
        });
    }
    catch (error) {
        console.warn("Could not save session state:", error);
    }
};
exports.saveSession = saveSession;
const getSessionSummary = async (moduleId, sessionToken) => {
    const url = `/api/sessions/summary?moduleId=${encodeURIComponent(moduleId)}&sessionToken=${encodeURIComponent(sessionToken)}`;
    return authedApiFetch(url);
};
exports.getSessionSummary = getSessionSummary;
const getTotalSessionCount = async () => {
    return authedApiFetch('/api/sessions/count/total');
};
exports.getTotalSessionCount = getTotalSessionCount;
const getCompletedSessionCount = async () => {
    return authedApiFetch('/api/sessions/count/completed');
};
exports.getCompletedSessionCount = getCompletedSessionCount;
