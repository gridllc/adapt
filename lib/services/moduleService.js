"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteModule = exports.saveModule = exports.getAvailableModules = exports.getModule = void 0;
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
const getModule = async (slug) => {
    if (slug.startsWith('how-to-')) {
        try {
            // Local JSON files are not served via the API, so they don't get the baseUrl
            const response = await fetch(`/modules/${slug}.json`);
            if (response.ok)
                return await response.json();
        }
        catch (e) {
            console.warn(`Could not fetch local module ${slug}.json.`, e);
        }
    }
    // Note: The public API does not require authentication for GET
    const response = await fetch(`${baseUrl}/api/modules/${slug}`);
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to fetch module: ${response.status}. Body: ${errorBody}`);
    }
    return response.json();
};
exports.getModule = getModule;
const getAvailableModules = async () => {
    // Note: The public API does not require authentication for GET
    const response = await fetch(`${baseUrl}/api/modules`);
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to fetch available modules: ${response.status}. Body: ${errorBody}`);
    }
    return response.json();
};
exports.getAvailableModules = getAvailableModules;
const saveModule = async ({ moduleData, videoFile, }) => {
    let videoUrlPath = moduleData.video_url || null;
    if (videoFile) {
        const fileExtension = videoFile.name.split('.').pop() || 'mp4';
        const signedUrlPayload = {
            type: 'module',
            id: moduleData.slug,
            contentType: videoFile.type,
            fileExtension,
        };
        const { uploadUrl, filePath } = await authedApiFetch('/api/uploads/signed-url', {
            method: 'POST',
            body: JSON.stringify(signedUrlPayload),
        });
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': videoFile.type },
            body: videoFile,
        });
        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`GCS upload failed: ${uploadResponse.statusText}. Details: ${errorText}`);
        }
        videoUrlPath = filePath;
    }
    const moduleToSave = { ...moduleData, video_url: videoUrlPath };
    return authedApiFetch('/api/modules', {
        method: 'POST',
        body: JSON.stringify({ moduleData: moduleToSave }),
    });
};
exports.saveModule = saveModule;
const deleteModule = async (slug) => {
    await authedApiFetch(`/api/modules/${slug}`, { method: 'DELETE' });
};
exports.deleteModule = deleteModule;
