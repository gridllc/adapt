import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import type { ChatMessage } from '@/types';

// Callable function definitions initialized once for performance.
const _getChatHistoryFn = httpsCallable<{ moduleId: string, sessionToken: string }, ChatMessage[]>(functions, 'getChatHistory');
const _saveChatMessageFn = httpsCallable<{ moduleId: string, sessionToken: string, message: ChatMessage }, void>(functions, 'saveChatMessage');
const _updateMessageFeedbackFn = httpsCallable<{ messageId: string, feedback: 'good' | 'bad' }, void>(functions, 'updateMessageFeedback');

/**
 * Fetches the chat history for a given module and session via the 'getChatHistory' Firebase Function.
 * @param moduleId The ID of the module.
 * @param sessionToken The unique token for the training session.
 * @returns A promise that resolves to an array of chat messages, or an empty array on error to ensure the UI remains stable.
 */
export const getChatHistory = async (moduleId: string, sessionToken: string): Promise<ChatMessage[]> => {
    try {
        const result = await _getChatHistoryFn({ moduleId, sessionToken });
        return result.data;
    } catch (error) {
        console.error("Error fetching chat history:", error);
        return []; // Gracefully return empty history on failure.
    }
};

/**
 * Saves a chat message to the database via the 'saveChatMessage' Firebase Function.
 * This is a "fire-and-forget" operation from the client's perspective to avoid blocking the UI.
 * @param moduleId The ID of the module.
 * @param sessionToken The unique token for the training session.
 * @param message The chat message object to save.
 */
export const saveChatMessage = async (moduleId: string, sessionToken: string, message: ChatMessage): Promise<void> => {
    try {
        await _saveChatMessageFn({ moduleId, sessionToken, message });
    } catch (error) {
        // Log as a warning since this is a background sync operation.
        console.warn("Could not save chat message:", error);
    }
};

/**
 * Updates the feedback status ('good' or 'bad') for a specific chat message via the 'updateMessageFeedback' Firebase Function.
 * @param messageId The ID of the message to update.
 * @param feedback The feedback value.
 */
export const updateMessageFeedback = async (messageId: string, feedback: 'good' | 'bad'): Promise<void> => {
    try {
        await _updateMessageFeedbackFn({ messageId, feedback });
    } catch (error) {
        console.error("Error updating message feedback:", error);
        throw error; // Re-throw for react-query to handle and display a toast.
    }
};
