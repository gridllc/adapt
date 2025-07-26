import type { Routine } from '@/types';
import { auth } from '@/firebase';

const baseUrl = import.meta.env.VITE_API_URL || '/api';

async function authedApiFetch<T>(url: string, options?: RequestInit): Promise<T> {
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
        return null as T;
    }
    return response.json();
}

export const getRoutinesForTemplate = async (templateId: string): Promise<Routine[]> => {
    return authedApiFetch<Routine[]>(`/routines/template/${templateId}`);
};

export const getAllRoutines = async (): Promise<Routine[]> => {
    return authedApiFetch<Routine[]>('/routines');
};

export const getRoutineForIntent = async (templateId: string, intent: string): Promise<Routine | null> => {
    try {
        const query = new URLSearchParams({ templateId, intent }).toString();
        // This can be public for the chat tutor to use
        const response = await fetch(`${baseUrl}/routines/intent?${query}`);
        if (!response.ok) return null;
        return response.json();
    } catch (error) {
        console.warn(`Could not find routine for intent '${intent}' in template '${templateId}'.`, error);
        return null;
    }
};

export const saveRoutine = async (routine: Omit<Routine, 'id'> & { id?: string }, videoFile: File | null): Promise<Routine> => {
    let videoUrlPath: string | null = routine.videoUrl || null;

    if (videoFile) {
        const fileExtension = videoFile.name.split('.').pop() || 'mp4';
        const payload = {
            type: 'routine',
            id: routine.id || `${routine.templateId}-${routine.intent}`,
            contentType: videoFile.type,
            fileExtension,
        };
        const { uploadUrl, filePath } = await authedApiFetch<{ uploadUrl: string, filePath: string }>('/uploads/signed-url', {
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
    return authedApiFetch<Routine>('/routines', {
        method: 'POST',
        body: JSON.stringify({ routineData: routineToSave }),
    });
};

export const deleteRoutine = async (routineId: string): Promise<void> => {
    await authedApiFetch<void>(`/routines/${routineId}`, { method: 'DELETE' });
};