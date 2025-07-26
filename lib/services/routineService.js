"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRoutine = exports.saveRoutine = exports.getRoutineForIntent = exports.getAllRoutines = exports.getRoutinesForTemplate = void 0;
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
const getRoutinesForTemplate = async (templateId) => {
    return authedApiFetch(`/api/routines/template/${templateId}`);
};
exports.getRoutinesForTemplate = getRoutinesForTemplate;
const getAllRoutines = async () => {
    return authedApiFetch('/api/routines');
};
exports.getAllRoutines = getAllRoutines;
const getRoutineForIntent = async (templateId, intent) => {
    try {
        const query = new URLSearchParams({ templateId, intent }).toString();
        // This can be public for the chat tutor to use
        const response = await fetch(`${baseUrl}/api/routines/intent?${query}`);
        if (!response.ok)
            return null;
        return response.json();
    }
    catch (error) {
        console.warn(`Could not find routine for intent '${intent}' in template '${templateId}'.`, error);
        return null;
    }
};
exports.getRoutineForIntent = getRoutineForIntent;
const saveRoutine = async (routine, videoFile) => {
    let videoUrlPath = routine.videoUrl || null;
    if (videoFile) {
        const fileExtension = videoFile.name.split('.').pop() || 'mp4';
        const payload = {
            type: 'routine',
            id: routine.id || `${routine.templateId}-${routine.intent}`,
            contentType: videoFile.type,
            fileExtension,
        };
        const { uploadUrl, filePath } = await authedApiFetch('/api/uploads/signed-url', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': videoFile.type },
            body: videoFile,
        });
        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Routine video upload failed: ${errorText}`);
        }
        videoUrlPath = filePath;
    }
    const routineToSave = { ...routine, videoUrl: videoUrlPath };
    return authedApiFetch('/api/routines', {
        method: 'POST',
        body: JSON.stringify({ routineData: routineToSave }),
    });
};
exports.saveRoutine = saveRoutine;
const deleteRoutine = async (routineId) => {
    await authedApiFetch(`/api/routines/${routineId}`, { method: 'DELETE' });
};
exports.deleteRoutine = deleteRoutine;
