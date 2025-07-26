"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTrainingSession = void 0;
const react_1 = require("react");
const react_query_1 = require("@tanstack/react-query");
const sessionService_1 = require("@/services/sessionService");
// This hook now manages state synchronization with the database.
function useTrainingSession(moduleId, sessionToken, totalSteps) {
    const queryClient = (0, react_query_1.useQueryClient)();
    const sessionQueryKey = ['session', moduleId, sessionToken];
    // Fetch initial session state from the database
    const { data: sessionState, isLoading: isLoadingSession } = (0, react_query_1.useQuery)({
        queryKey: sessionQueryKey,
        queryFn: () => (0, sessionService_1.getSession)(moduleId, sessionToken),
        enabled: !!moduleId && !!sessionToken,
        staleTime: Infinity, // We manage state locally and sync, no need to refetch in background
        refetchOnWindowFocus: false,
    });
    // Local state that reflects the database, or a default initial state
    const [currentStepIndex, setCurrentStepIndex] = (0, react_1.useState)(0);
    const [userActions, setUserActions] = (0, react_1.useState)([]);
    const [isCompleted, setIsCompleted] = (0, react_1.useState)(false);
    // When session data loads from DB, update local state
    (0, react_1.useEffect)(() => {
        if (sessionState) {
            setCurrentStepIndex(sessionState.currentStepIndex);
            setUserActions(sessionState.userActions);
            setIsCompleted(sessionState.isCompleted);
        }
        else {
            // If no session in DB, reset to initial state
            setCurrentStepIndex(0);
            setUserActions([]);
            setIsCompleted(false);
        }
    }, [sessionState]);
    // Mutation to save session state to the database
    const { mutate: persistSession, isPending: isSaving } = (0, react_query_1.useMutation)({
        mutationFn: (newState) => (0, sessionService_1.saveSession)({ moduleId, sessionToken, ...newState }),
        onSuccess: (_data, variables) => {
            // Update the query cache with the new state
            queryClient.setQueryData(sessionQueryKey, (old) => ({
                ...(old || {}),
                moduleId,
                sessionToken,
                ...variables,
            }));
        },
        onError: (error) => {
            console.error("Failed to save session state:", error);
            // Here you could implement retry logic or show a user-facing error
        }
    });
    // Debounce the save operation to avoid hammering the DB on rapid state changes
    (0, react_1.useEffect)(() => {
        // Don't save on initial load if we are still waiting for data
        if (isLoadingSession)
            return;
        const currentStateInDb = {
            currentStepIndex: sessionState?.currentStepIndex ?? 0,
            userActions: sessionState?.userActions ?? [],
            isCompleted: sessionState?.isCompleted ?? false,
        };
        // More performant change detection
        const hasChanges = currentStateInDb.currentStepIndex !== currentStepIndex ||
            currentStateInDb.isCompleted !== isCompleted ||
            JSON.stringify(currentStateInDb.userActions) !== JSON.stringify(userActions);
        if (!hasChanges) {
            return;
        }
        const handler = setTimeout(() => {
            persistSession({ currentStepIndex, userActions, isCompleted });
        }, 1000); // Debounce for 1 second
        return () => {
            clearTimeout(handler);
        };
    }, [currentStepIndex, userActions, isCompleted, persistSession, isLoadingSession, sessionState]);
    const markStep = (0, react_1.useCallback)((status) => {
        const newAction = { stepIndex: currentStepIndex, status, timestamp: Date.now() };
        setUserActions(prevActions => [...prevActions, newAction]);
        if (status === 'done') {
            if (currentStepIndex === totalSteps - 1) {
                setIsCompleted(true);
            }
            else {
                setCurrentStepIndex(prevIndex => prevIndex + 1);
            }
        }
    }, [totalSteps, currentStepIndex]);
    const goBack = (0, react_1.useCallback)(() => {
        setCurrentStepIndex(prevIndex => Math.max(0, prevIndex - 1));
    }, []);
    const resetSession = (0, react_1.useCallback)(() => {
        // This now resets the local state, and the useEffect will trigger a save
        setCurrentStepIndex(0);
        setUserActions([]);
        setIsCompleted(false);
        // Also immediately trigger a save to clear the DB state
        persistSession({ currentStepIndex: 0, userActions: [], isCompleted: false });
    }, [persistSession]);
    return {
        currentStepIndex,
        setCurrentStepIndex,
        userActions,
        markStep,
        isCompleted,
        resetSession,
        isLoadingSession, // Expose loading state
        goBack,
        isSaving, // Expose saving state for UI feedback
    };
}
exports.useTrainingSession = useTrainingSession;
