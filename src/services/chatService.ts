import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import type { Functions } from 'firebase/functions';
import type { ChatMessage } from '@/types';

const getChatHistoryFn = httpsCallable<{ moduleId: string, sessionToken: string }, ChatMessage[]>(functions as Functions, 'getChatHistory');
const saveChatMessageFn = httpsCallable<{ moduleId: string, sessionToken: string, message: ChatMessage }>(functions as Functions, 'saveChatMessage');
const updateMessageFeedbackFn = httpsCallable<{ messageId: string, feedback: 'good' | 'bad' }>(functions as Functions, 'updateMessageFeedback');

export const getChatHistory = async (moduleId: string, sessionToken: string): Promise<ChatMessage[]> => {
    try {
        const result = await getChatHistoryFn({ moduleId, sessionToken });
        return result.data;
    } catch (error) {
        console.error("Error fetching chat history:", error);
        return [];
    }
};

export const saveChatMessage = async (moduleId: string, sessionToken: string, message: ChatMessage): Promise<void> => {
    try {
        await saveChatMessageFn({ moduleId, sessionToken, message });
    } catch (error) {
        console.warn("Could not save chat message:", error);
    }
};

export const updateMessageFeedback = async (messageId: string, feedback: 'good' | 'bad'): Promise<void> => {
    try {
        await updateMessageFeedbackFn({ messageId, feedback });
    } catch (error) {
        console.error("Error updating message feedback:", error);
        throw error;
    }
};
