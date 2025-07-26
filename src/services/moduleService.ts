import type { AppModule, AppModuleWithStats, ModuleForInsert } from '@/types';
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

export const getModule = async (slug: string): Promise<AppModule | undefined> => {
    if (slug.startsWith('how-to-')) {
        try {
            // Local JSON files are not served via the API, so they don't get the baseUrl
            const response = await fetch(`/modules/${slug}.json`);
            if (response.ok) return await response.json();
        } catch (e) {
            console.warn(`Could not fetch local module ${slug}.json.`, e);
        }
    }
    // Note: The public API does not require authentication for GET
    const response = await fetch(`${baseUrl}/modules/${slug}`);
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to fetch module: ${response.status}. Body: ${errorBody}`);
    }
    return response.json();
};

export const getAvailableModules = async (): Promise<AppModuleWithStats[]> => {
    // Note: The public API does not require authentication for GET
    const response = await fetch(`${baseUrl}/modules`);
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to fetch available modules: ${response.status}. Body: ${errorBody}`);
    }
    return response.json();
};

export const saveModule = async ({
    moduleData,
    videoFile,
}: {
    moduleData: ModuleForInsert,
    videoFile?: File | null,
}): Promise<AppModule> => {
    let videoUrlPath: string | null = moduleData.video_url || null;

    if (videoFile) {
        const fileExtension = videoFile.name.split('.').pop() || 'mp4';
        const signedUrlPayload = {
            type: 'module',
            id: moduleData.slug,
            contentType: videoFile.type,
            fileExtension,
        };
        const { uploadUrl, filePath } = await authedApiFetch<{ uploadUrl: string, filePath: string }>('/uploads/signed-url', {
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
    return authedApiFetch<AppModule>('/modules', {
        method: 'POST',
        body: JSON.stringify({ moduleData: moduleToSave }),
    });
};

export const deleteModule = async (slug: string): Promise<void> => {
    await authedApiFetch(`/modules/${slug}`, { method: 'DELETE' });
};