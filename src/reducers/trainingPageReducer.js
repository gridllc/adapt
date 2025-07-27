export const initialTrainingPageState = {
    activeTab: 'steps',
    isEvaluatingCheckpoint: false,
    isAdvancing: false,
    checkpointFeedback: null,
    instructionSuggestion: null,
    isSuggestionSubmitted: false,
    isGeneratingReport: false,
    performanceReport: null,
    initialChatPrompt: undefined,
};
/**
 * The reducer function to manage training page state.
 * @param state The current state.
 * @param action The action to perform.
 * @returns The new state.
 */
export function trainingPageReducer(state, action) {
    switch (action.type) {
        case 'SET_ACTIVE_TAB':
            return { ...state, activeTab: action.payload, initialChatPrompt: undefined };
        case 'SET_CHAT_PROMPT':
            return { ...state, activeTab: 'tutor', initialChatPrompt: action.payload };
        case 'START_CHECKPOINT_EVALUATION':
            return { ...state, isEvaluatingCheckpoint: true, checkpointFeedback: null, instructionSuggestion: null };
        case 'CHECKPOINT_EVALUATION_SUCCESS':
            return {
                ...state,
                isEvaluatingCheckpoint: false,
                checkpointFeedback: action.payload.evaluation,
                instructionSuggestion: action.payload.evaluation.suggestedInstructionChange ?? null,
                isAdvancing: action.payload.isAdvancing,
            };
        case 'CHECKPOINT_EVALUATION_FAILURE':
            return { ...state, isEvaluatingCheckpoint: false };
        case 'SET_INSTRUCTION_SUGGESTION':
            return { ...state, instructionSuggestion: action.payload };
        case 'SUBMIT_SUGGESTION_SUCCESS':
            return { ...state, isSuggestionSubmitted: true };
        case 'START_REPORT_GENERATION':
            return { ...state, isGeneratingReport: true };
        case 'SET_PERFORMANCE_REPORT':
            return { ...state, isGeneratingReport: false, performanceReport: action.payload };
        case 'RESET_CHECKPOINT_STATE':
            return {
                ...state,
                checkpointFeedback: null,
                instructionSuggestion: null,
                isSuggestionSubmitted: false,
                isAdvancing: false,
            };
        case 'RESET_SESSION_UI':
            return {
                ...state,
                performanceReport: null,
                activeTab: 'steps',
            };
        default:
            return state;
    }
}
//# sourceMappingURL=trainingPageReducer.js.map