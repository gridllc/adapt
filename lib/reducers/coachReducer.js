"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coachReducer = exports.initialCoachState = void 0;
/**
 * The initial state for the coach when the component first mounts.
 */
exports.initialCoachState = {
    status: 'initializing',
    aiResponse: '',
    currentStepIndex: 0,
    sessionScore: 100,
    activeModule: null,
    mainModuleState: null,
};
/**
 * The reducer function. It takes the current state and an action, and returns the new state.
 * This is a pure function, meaning it has no side effects.
 * @param state The current state.
 * @param action The action to perform.
 * @returns The new state.
 */
function coachReducer(state, action) {
    switch (action.type) {
        case 'INITIALIZE_SESSION':
            return {
                ...state,
                currentStepIndex: action.payload.stepIndex,
                sessionScore: action.payload.score ?? state.sessionScore,
                activeModule: action.payload.module,
            };
        case 'SET_STATUS':
            return { ...state, status: action.payload };
        case 'SET_AI_RESPONSE':
            return { ...state, aiResponse: action.payload };
        case 'RESET_AI_RESPONSE':
            return { ...state, aiResponse: '' };
        case 'APPEND_AI_RESPONSE':
            return { ...state, aiResponse: state.aiResponse + action.payload };
        case 'ADVANCE_STEP':
            if (!state.activeModule)
                return state;
            return { ...state, currentStepIndex: state.currentStepIndex + 1 };
        case 'SET_STEP_INDEX':
            return { ...state, currentStepIndex: action.payload };
        case 'DECREMENT_SCORE':
            return { ...state, sessionScore: Math.max(0, state.sessionScore - action.payload) };
        case 'START_BRANCH':
            return {
                ...state,
                status: 'branching',
                mainModuleState: { module: action.payload.mainModule, stepIndex: action.payload.mainStepIndex },
                activeModule: action.payload.subModule,
                currentStepIndex: 0,
            };
        case 'END_BRANCH':
            if (!state.mainModuleState)
                return state;
            return {
                ...state,
                activeModule: state.mainModuleState.module,
                currentStepIndex: state.mainModuleState.stepIndex,
                mainModuleState: null,
            };
        default:
            return state;
    }
}
exports.coachReducer = coachReducer;
