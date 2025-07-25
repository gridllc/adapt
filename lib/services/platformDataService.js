"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importAllData = exports.exportAllData = void 0;
const MODULE_PREFIX = 'adapt-module-';
const CHAT_PREFIX = 'adapt-ai-tutor-chat-history-';
const SESSION_PREFIX = 'adapt-session-';
const SUGGESTIONS_KEY = 'adapt-suggestions';
const AUTH_KEY = 'adapt-auth-token';
const exportAllData = () => {
    const data = {
        modules: {},
        chatHistories: {},
        sessions: {},
        suggestions: null,
        auth: null,
    };
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key)
            continue;
        try {
            const value = localStorage.getItem(key);
            if (key === AUTH_KEY) {
                data.auth = value;
                continue;
            }
            const parsedValue = JSON.parse(value);
            if (key.startsWith(MODULE_PREFIX)) {
                data.modules[key] = parsedValue;
            }
            else if (key.startsWith(CHAT_PREFIX)) {
                data.chatHistories[key] = parsedValue;
            }
            else if (key.startsWith(SESSION_PREFIX)) {
                data.sessions[key] = parsedValue;
            }
            else if (key === SUGGESTIONS_KEY) {
                data.suggestions = parsedValue;
            }
        }
        catch (e) {
            console.warn(`Could not parse localStorage item with key: ${key}`, e);
        }
    }
    return data;
};
exports.exportAllData = exportAllData;
const importAllData = (dataToImport) => {
    let parsedData;
    try {
        parsedData = JSON.parse(dataToImport);
        if (!parsedData || typeof parsedData !== 'object' || !('modules' in parsedData)) {
            throw new Error("Invalid data structure. The file does not appear to be a valid Adapt backup.");
        }
    }
    catch (e) {
        throw new Error(`Failed to parse import file. It must be a valid JSON backup. Error: ${e instanceof Error ? e.message : 'Unknown parsing error'}`);
    }
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('adapt-')) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    try {
        const writeJson = (dataObject) => {
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
    }
    catch (e) {
        throw new Error(`An error occurred while writing imported data to storage. ${e instanceof Error ? e.message : ''}`);
    }
    return true;
};
exports.importAllData = importAllData;
