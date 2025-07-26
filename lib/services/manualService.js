"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadManualForProcessing = void 0;
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
    return response.json();
}
const uploadManualForProcessing = async (file) => {
    try {
        const payload = {
            type: 'manual',
            id: file.name,
            contentType: file.type,
        };
        const { uploadUrl, filePath } = await authedApiFetch('/api/uploads/signed-url', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
        });
        if (!uploadResponse.ok) {
            throw new Error(`Cloud storage upload failed: ${uploadResponse.statusText}`);
        }
        return filePath;
    }
    catch (error) {
        console.error("Failed to upload manual:", error);
        throw error;
    }
};
exports.uploadManualForProcessing = uploadManualForProcessing;
