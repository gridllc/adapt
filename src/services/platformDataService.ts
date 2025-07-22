import type { Json } from "@/types";

type ModuleRow = {
    created_at: string
    metadata: Json | null
    slug: string
    steps: Json | null
    title: string
    transcript: Json | null
    user_id: string | null
    video_url: string | null
};

type ChatMessageRow = {
    citations: Json | null
    created_at: string
    feedback: string | null
    id: string
    imageUrl: string | null
    is_fallback: boolean | null
    isLoading: boolean | null
    module_id: string
    role: string
    session_token: string
    text: string | null
};

type SessionStateRow = {
    created_at: string
    current_step_index: number
    id: number
    is_completed: boolean
    live_coach_events: Json | null
    module_id: string
    score: number | null
    session_token: string
    updated_at: string
    user_actions: Json | null
};

type SuggestionRow = {
    created_at: string
    id: number
    module_id: string
    status: string
    step_index: number
    text: string | null
    user_id: string | null
};

export interface PlatformData {
    modules: Record<string, ModuleRow>;
    chatHistories: Record<string, ChatMessageRow[]>;
    sessions: Record<string, SessionStateRow>;
    suggestions: SuggestionRow[] | null;
    auth: string | null;
}

const MODULE_PREFIX = 'adapt-module-';
const CHAT_PREFIX = 'adapt-ai-tutor-chat-history-';
const SESSION_PREFIX = 'adapt-session-';
const SUGGESTIONS_KEY = 'adapt-suggestions';
const AUTH_KEY = 'adapt-auth-token';

export const exportAllData = (): PlatformData => {
    const data: PlatformData = {
        modules: {},
        chatHistories: {},
        sessions: {},
        suggestions: null,
        auth: null,
    };

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        try {
            const value = localStorage.getItem(key)!;
            if (key === AUTH_KEY) {
                data.auth = value;
                continue;
            }

            const parsedValue = JSON.parse(value);

            if (key.startsWith(MODULE_PREFIX)) {
                data.modules[key] = parsedValue;
            } else if (key.startsWith(CHAT_PREFIX)) {
                data.chatHistories[key] = parsedValue;
            } else if (key.startsWith(SESSION_PREFIX)) {
                data.sessions[key] = parsedValue;
            } else if (key === SUGGESTIONS_KEY) {
                data.suggestions = parsedValue;
            }
        } catch (e) {
            console.warn(`Could not parse localStorage item with key: ${key}`, e);
        }
    }
    return data;
};

export const importAllData = (dataToImport: string): boolean => {
    let parsedData: PlatformData;
    try {
        parsedData = JSON.parse(dataToImport);
        if (!parsedData || typeof parsedData !== 'object' || !('modules' in parsedData)) {
            throw new Error("Invalid data structure. The file does not appear to be a valid Adapt backup.");
        }
    } catch (e: unknown) {
        throw new Error(`Failed to parse import file. It must be a valid JSON backup. Error: ${e instanceof Error ? e.message : 'Unknown parsing error'}`);
    }

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('adapt-')) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    try {
        const writeJson = (dataObject: Record<string, unknown>) => {
            Object.entries(dataObject).forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)));
        };

        writeJson(parsedData.modules);
        writeJson(parsedData.chatHistories);
        writeJson(parsedData.sessions);

        if (parsedData.suggestions) {
            localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(parsedData.suggestions));
        }
        if (parsedData.auth) {
            localStorage.setItem(AUTH_KEY, parsedData.auth);
        }

    } catch (e: unknown) {
        throw new Error(`An error occurred while writing imported data to storage. ${e instanceof Error ? e.message : ''}`);
    }

    return true;
};
