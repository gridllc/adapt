import { auth } from '@/firebase';
const baseUrl = import.meta.env.VITE_API_URL || '/api';
async function authedApiFetch(url, options) {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
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
export const getChatHistory = async (moduleId, sessionToken) => {
    try {
        // Public, no auth
        const url = `/chat?moduleId=${encodeURIComponent(moduleId)}&sessionToken=${encodeURIComponent(sessionToken)}`;
        const response = await fetch(`${baseUrl}${url}`);
        if (!response.ok)
            throw new Error("Failed to fetch history");
        return response.json();
    }
    catch (error) {
        console.error("Error fetching chat history:", error);
        return [];
    }
};
export const saveChatMessage = async (moduleId, sessionToken, message) => {
    try {
        // Public, no auth
        await fetch(`${baseUrl}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ moduleId, sessionToken, message }),
        });
    }
    catch (error) {
        console.warn("Could not save chat message:", error);
    }
};
export const updateMessageFeedback = async (messageId, feedback) => {
    await authedApiFetch('/chat/feedback', {
        method: 'POST',
        body: JSON.stringify({ messageId, feedback }),
    });
};
//# sourceMappingURL=chatService.js.map