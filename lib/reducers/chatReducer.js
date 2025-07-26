"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatReducer = exports.initialChatState = void 0;
exports.initialChatState = {
    messages: [],
    input: '',
    isLoading: false,
    error: null,
};
function chatReducer(state, action) {
    switch (action.type) {
        case 'SET_MESSAGES':
            return { ...state, messages: action.payload };
        case 'SET_INPUT':
            return { ...state, input: action.payload };
        case 'START_MESSAGE':
            return { ...state, isLoading: true, error: null };
        case 'ADD_MESSAGES':
            return { ...state, messages: [...state.messages, ...action.payload] };
        case 'STREAM_MESSAGE_CHUNK':
            return {
                ...state,
                isLoading: false, // First chunk received, stop global loading
                messages: state.messages.map(msg => {
                    if (msg.id !== action.payload.messageId)
                        return msg;
                    const updatedMsg = {
                        ...msg,
                        text: (msg.text || '') + action.payload.chunk,
                        isLoading: true, // Keep loading TRUE during stream for cursor effect
                    };
                    if (action.payload.citations) {
                        const currentCitations = msg.citations || [];
                        const combined = [...currentCitations, ...action.payload.citations];
                        // De-duplicate citations
                        updatedMsg.citations = combined.filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i);
                    }
                    return updatedMsg;
                })
            };
        case 'MESSAGE_COMPLETE':
            return {
                ...state,
                isLoading: false,
                messages: state.messages.map(msg => msg.id === action.payload.messageId ? action.payload.finalMessage : msg)
            };
        case 'SET_ERROR':
            return {
                ...state,
                isLoading: false,
                error: action.payload.error,
                messages: state.messages.map(msg => msg.id === action.payload.messageId
                    ? { ...msg, text: `Error: ${action.payload.error}`, isLoading: false, isError: true, imageUrl: undefined }
                    : msg)
            };
        case 'REMOVE_MESSAGE':
            return {
                ...state,
                isLoading: false,
                messages: state.messages.filter(msg => msg.id !== action.payload.messageId),
            };
        default:
            return state;
    }
}
exports.chatReducer = chatReducer;
