"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const react_query_1 = require("@tanstack/react-query");
const useToast_1 = require("@/hooks/useToast");
const moduleService_1 = require("@/services/moduleService");
const sessionService_1 = require("@/services/sessionService");
const geminiService_1 = require("@/services/geminiService");
const feedbackService_1 = require("@/services/feedbackService");
const promptEngineering_1 = require("@/utils/promptEngineering");
const visionService_1 = require("@/services/visionService");
const ttsService = __importStar(require("@/services/ttsService"));
const LiveCameraFeed_1 = require("@/components/LiveCameraFeed");
const useSpeechRecognition_1 = require("@/hooks/useSpeechRecognition");
const coachReducer_1 = require("@/reducers/coachReducer");
const Icons_1 = require("@/components/Icons");
const MicTester_1 = require("@/components/MicTester");
const generateToken = () => Math.random().toString(36).substring(2, 10);
const LiveCoachPage = () => {
    const { moduleId = '' } = (0, react_router_dom_1.useParams)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const location = (0, react_router_dom_1.useLocation)();
    const queryClient = (0, react_query_1.useQueryClient)();
    const { addToast } = (0, useToast_1.useToast)();
    // --- State Management ---
    const [coachState, dispatch] = (0, react_1.useReducer)(coachReducer_1.coachReducer, coachReducer_1.initialCoachState);
    const { status, aiResponse, currentStepIndex, sessionScore, activeModule, mainModuleState } = coachState;
    // State not managed by the reducer
    const [sessionToken, setSessionToken] = (0, react_1.useState)('');
    const [sessionEvents, setSessionEvents] = (0, react_1.useState)([]);
    const [detectedObjects, setDetectedObjects] = (0, react_1.useState)([]);
    const [moduleNeeds, setModuleNeeds] = (0, react_1.useState)(null);
    const [ttsEnabled, setTtsEnabled] = (0, react_1.useState)(true);
    const [lastEventType, setLastEventType] = (0, react_1.useState)('good');
    const [activeFeedbackLogId, setActiveFeedbackLogId] = (0, react_1.useState)(null);
    const [showFixFormFor, setShowFixFormFor] = (0, react_1.useState)(null);
    const [userFixText, setUserFixText] = (0, react_1.useState)('');
    const [micReady, setMicReady] = (0, react_1.useState)(false); // Gatekeeper for starting the coach
    // Control flags
    const [isInitialized, setIsInitialized] = (0, react_1.useState)(false);
    const [visionInitialized, setVisionInitialized] = (0, react_1.useState)(false);
    const [chatInitialized, setChatInitialized] = (0, react_1.useState)(false);
    // Refs
    const chatRef = (0, react_1.useRef)(null);
    const videoRef = (0, react_1.useRef)(null);
    const hintTimerRef = (0, react_1.useRef)(null);
    const stepCompletionTimerRef = (0, react_1.useRef)(null);
    const visionIntervalRef = (0, react_1.useRef)(null);
    const isInterjectingRef = (0, react_1.useRef)(false);
    const mountedRef = (0, react_1.useRef)(true);
    const isProcessingActionRef = (0, react_1.useRef)(false); // Ref to prevent action overlaps
    const cooldownRef = (0, react_1.useRef)(null); // Ref for action cooldown
    const speechHandlerRef = (0, react_1.useRef)(undefined);
    // --- Session & Data Fetching ---
    (0, react_1.useEffect)(() => {
        const searchParams = new URLSearchParams(location.search);
        let sessionKey = searchParams.get('session_key');
        if (!sessionKey) {
            sessionKey = generateToken();
            navigate(`${location.pathname}?session_key=${sessionKey}`, { replace: true });
        }
        setSessionToken(sessionKey);
    }, [location.search, location.pathname, navigate]);
    const sessionQueryKey = (0, react_1.useMemo)(() => ['liveCoachSession', moduleId, sessionToken], [moduleId, sessionToken]);
    const { data: sessionData, isLoading: isLoadingSession } = (0, react_query_1.useQuery)({
        queryKey: sessionQueryKey,
        queryFn: () => (0, sessionService_1.getSession)(moduleId, sessionToken),
        enabled: !!moduleId && !!sessionToken,
    });
    const { data: moduleData, isLoading: isLoadingModule, isError } = (0, react_query_1.useQuery)({
        queryKey: ['module', moduleId],
        queryFn: () => (0, moduleService_1.getModule)(moduleId),
        enabled: !!moduleId,
        staleTime: 1000 * 60 * 5,
        retry: 3,
        retryDelay: 1000,
    });
    // Initialize coach state from fetched data
    (0, react_1.useEffect)(() => {
        // We can initialize as soon as the queries are done, even if sessionData is null (new session)
        if (!isLoadingSession && !isLoadingModule && moduleData) {
            dispatch({
                type: 'INITIALIZE_SESSION', payload: {
                    // Use sessionData if it exists, otherwise start from scratch
                    stepIndex: sessionData?.currentStepIndex ?? 0,
                    score: sessionData?.score, // score can be undefined, handled by reducer
                    module: moduleData,
                }
            });
            setSessionEvents(sessionData?.liveCoachEvents || []);
        }
    }, [sessionData, isLoadingSession, moduleData, isLoadingModule]);
    const { mutate: persistSession } = (0, react_query_1.useMutation)({
        mutationFn: (newState) => (0, sessionService_1.saveSession)({ moduleId, sessionToken, ...newState }),
        onSuccess: (_data, variables) => {
            queryClient.setQueryData(sessionQueryKey, (old) => ({
                ...(old || {}),
                ...variables,
                moduleId,
                sessionToken
            }));
        },
    });
    (0, react_1.useEffect)(() => {
        if (moduleNeeds)
            return;
        const fetchNeeds = async () => {
            try {
                const response = await fetch('/needs.json');
                if (!response.ok) {
                    console.warn('Module needs not available.');
                    return;
                }
                const data = await response.json();
                if (mountedRef.current)
                    setModuleNeeds(data);
            }
            catch (error) {
                console.warn("Could not fetch module needs:", error);
            }
        };
        fetchNeeds();
    }, [moduleNeeds]);
    (0, react_1.useEffect)(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);
    const clearAllTimers = (0, react_1.useCallback)(() => {
        if (hintTimerRef.current)
            clearTimeout(hintTimerRef.current);
        if (stepCompletionTimerRef.current)
            clearTimeout(stepCompletionTimerRef.current);
        if (visionIntervalRef.current)
            clearInterval(visionIntervalRef.current);
        if (cooldownRef.current)
            clearTimeout(cooldownRef.current);
    }, []);
    (0, react_1.useEffect)(() => {
        return () => clearAllTimers();
    }, [clearAllTimers]);
    // This stable callback calls the latest logic from the ref.
    const handleSpeechResult = (0, react_1.useCallback)((transcript, isFinal) => {
        speechHandlerRef.current?.(transcript, isFinal);
    }, []);
    const { startListening, stopListening, hasSupport, error: speechError } = (0, useSpeechRecognition_1.useSpeechRecognition)(handleSpeechResult);
    const handleBranchEnd = (0, react_1.useCallback)(async () => {
        if (!mainModuleState || isProcessingActionRef.current)
            return;
        isProcessingActionRef.current = true;
        stopListening();
        try {
            const { module: nextModule, stepIndex: nextStepIndex } = mainModuleState;
            dispatch({ type: 'END_BRANCH' });
            const returnText = `Great, now let's get back to the main task. The next step is: ${nextModule.steps[nextStepIndex].title}`;
            addToast('success', 'Back on Track!', 'Returning to the main training.');
            if (ttsEnabled) {
                try {
                    await ttsService.speak(returnText, 'system');
                }
                catch (error) {
                    console.warn('TTS failed:', error);
                }
            }
        }
        finally {
            isProcessingActionRef.current = false;
            startListening();
        }
    }, [mainModuleState, addToast, ttsEnabled, startListening, stopListening]);
    const handleStepAdvance = (0, react_1.useCallback)(async () => {
        if (!activeModule || isProcessingActionRef.current || cooldownRef.current)
            return;
        isProcessingActionRef.current = true;
        stopListening();
        try {
            clearAllTimers();
            if (mainModuleState && currentStepIndex + 1 >= activeModule.steps.length) {
                try {
                    await ttsService.speak("Nice work. Let's get back to it.", 'system');
                }
                catch (error) {
                    console.warn('TTS failed:', error);
                }
                handleBranchEnd(); // This will handle its own locking and speech
                return; // Exit early, handleBranchEnd will manage state
            }
            const newIndex = currentStepIndex + 1;
            dispatch({ type: 'ADVANCE_STEP' });
            const newEvent = { eventType: 'step_advance', stepIndex: newIndex, timestamp: Date.now() };
            const updatedEvents = [...sessionEvents, newEvent];
            setSessionEvents(updatedEvents);
            if (newIndex >= activeModule.steps.length) {
                addToast('success', 'Module Complete!', 'You have finished all the steps.');
                persistSession({ isCompleted: true, score: sessionScore, currentStepIndex: newIndex, liveCoachEvents: updatedEvents });
                navigate(`/sessions/${moduleId}/${sessionToken}/review`);
            }
            else {
                if (!mainModuleState) {
                    persistSession({ currentStepIndex: newIndex, liveCoachEvents: updatedEvents, score: sessionScore });
                }
                if (ttsEnabled) {
                    try {
                        await ttsService.speak(`Okay, next up: ${activeModule.steps[newIndex].title}`, 'system');
                    }
                    catch (error) {
                        console.warn('TTS failed:', error);
                    }
                }
            }
            setLastEventType('good');
            setActiveFeedbackLogId(null);
            setShowFixFormFor(null);
        }
        finally {
            isProcessingActionRef.current = false;
            cooldownRef.current = setTimeout(() => {
                cooldownRef.current = null;
            }, 2000); // 2-second cooldown
            if (mountedRef.current) {
                startListening();
            }
        }
    }, [activeModule, currentStepIndex, mainModuleState, persistSession, ttsEnabled, addToast, navigate, moduleId, sessionToken, sessionEvents, sessionScore, handleBranchEnd, clearAllTimers, startListening, stopListening]);
    const handleBranchStart = (0, react_1.useCallback)(async (subModuleSlug) => {
        if (!activeModule || isProcessingActionRef.current || cooldownRef.current)
            return;
        isProcessingActionRef.current = true;
        isInterjectingRef.current = true;
        stopListening();
        ttsService.cancel();
        dispatch({ type: 'DECREMENT_SCORE', payload: 15 });
        try {
            const subModule = await (0, moduleService_1.getModule)(subModuleSlug);
            if (!subModule)
                throw new Error(`Sub-module "${subModuleSlug}" not found.`);
            dispatch({ type: 'START_BRANCH', payload: { subModule, mainModule: activeModule, mainStepIndex: currentStepIndex } });
            addToast('info', 'Taking a Detour', `Let's quickly review: ${subModule.title}`);
            const introText = `I noticed you might need some help with that. Let's take a quick look at how to do this correctly. First: ${subModule.steps[0].title}`;
            if (ttsEnabled) {
                try {
                    await ttsService.speak(introText, 'coach');
                }
                catch (error) {
                    console.warn('TTS failed:', error);
                }
            }
            if (mountedRef.current)
                dispatch({ type: 'SET_STATUS', payload: 'listening' });
        }
        catch (error) {
            console.error("Failed to start branch:", error);
            addToast('error', 'Branching Failed', 'Could not load the sub-lesson.');
            if (mountedRef.current)
                dispatch({ type: 'SET_STATUS', payload: 'listening' });
        }
        finally {
            isProcessingActionRef.current = false;
            isInterjectingRef.current = false;
            if (mountedRef.current) {
                startListening();
            }
        }
    }, [activeModule, currentStepIndex, addToast, ttsEnabled, startListening, stopListening]);
    const logAndSaveEvent = (0, react_1.useCallback)((eventType) => {
        if (mainModuleState)
            return;
        setLastEventType(eventType === 'hint' ? 'hint' : 'correction');
        const newEvent = { eventType, stepIndex: currentStepIndex, timestamp: Date.now() };
        const updatedEvents = [...sessionEvents, newEvent];
        setSessionEvents(updatedEvents);
        persistSession({ liveCoachEvents: updatedEvents, score: sessionScore });
    }, [currentStepIndex, sessionEvents, persistSession, mainModuleState, sessionScore]);
    const processAiInterjection = (0, react_1.useCallback)(async (basePrompt, type) => {
        if (!chatRef.current || !activeModule || isProcessingActionRef.current || cooldownRef.current)
            return;
        isProcessingActionRef.current = true;
        isInterjectingRef.current = true;
        stopListening();
        ttsService.cancel();
        dispatch({ type: 'RESET_AI_RESPONSE' });
        setActiveFeedbackLogId(null);
        const newStatus = type === 'hint' ? 'hinting' : 'correcting';
        dispatch({ type: 'SET_STATUS', payload: newStatus });
        logAndSaveEvent(newStatus);
        dispatch({ type: 'DECREMENT_SCORE', payload: 5 });
        try {
            const similarFixes = await (0, feedbackService_1.findSimilarFixes)(moduleId, currentStepIndex, basePrompt);
            const pastFeedback = await (0, feedbackService_1.getPastFeedbackForStep)(moduleId, currentStepIndex);
            const requiredItems = moduleNeeds?.[activeModule.slug]?.[currentStepIndex]?.required || [];
            let finalPrompt = (0, promptEngineering_1.getPromptContextForLiveCoach)(activeModule.steps[currentStepIndex]?.title ?? 'Current Step', requiredItems, type, pastFeedback, similarFixes, basePrompt);
            finalPrompt += `\n\nYour response should proactively ask the user for feedback. End your response with this exact tagline: "${(0, promptEngineering_1.getTagline)()}"`;
            const stream = await (0, geminiService_1.sendMessageWithRetry)(chatRef.current, finalPrompt);
            let fullText = '';
            try {
                for await (const chunk of stream) {
                    const chunkText = chunk.text ?? '';
                    fullText += chunkText;
                    if (mountedRef.current)
                        dispatch({ type: 'APPEND_AI_RESPONSE', payload: chunkText });
                }
            }
            catch (streamError) {
                console.error("AI stream failed:", streamError);
                addToast('error', 'AI Connection Lost', 'The connection to the AI was interrupted.');
                // Bail out but ensure we unlock and start listening again in finally
                return;
            }
            if (fullText && mountedRef.current) {
                const logId = await (0, feedbackService_1.logAiFeedback)({ sessionToken, moduleId, stepIndex: currentStepIndex, userPrompt: basePrompt, aiResponse: fullText, feedback: 'bad' });
                setActiveFeedbackLogId(logId);
                dispatch({ type: 'SET_STATUS', payload: 'speaking' });
                if (ttsEnabled) {
                    try {
                        await ttsService.speak(fullText, 'coach');
                    }
                    catch (error) {
                        console.warn('TTS failed:', error);
                    }
                }
            }
        }
        catch (e) {
            console.error(e);
            addToast('error', 'AI Coach Error', 'The AI is having trouble. Coaching is paused.');
        }
        finally {
            if (mountedRef.current)
                dispatch({ type: 'SET_STATUS', payload: 'listening' });
            isProcessingActionRef.current = false;
            cooldownRef.current = setTimeout(() => {
                cooldownRef.current = null;
            }, 2000); // 2-second cooldown
            isInterjectingRef.current = false;
            startListening();
        }
    }, [activeModule, currentStepIndex, logAndSaveEvent, ttsEnabled, moduleId, sessionToken, moduleNeeds, addToast, startListening, stopListening]);
    const processAiQuery = (0, react_1.useCallback)(async (query) => {
        if (!chatRef.current || !activeModule || isProcessingActionRef.current || cooldownRef.current)
            return;
        isProcessingActionRef.current = true;
        stopListening();
        clearAllTimers();
        if (isInterjectingRef.current) {
            ttsService.cancel();
            isInterjectingRef.current = false;
        }
        dispatch({ type: 'SET_STATUS', payload: 'thinking' });
        dispatch({ type: 'RESET_AI_RESPONSE' });
        setActiveFeedbackLogId(null);
        const objectLabels = detectedObjects.length > 0 ? detectedObjects.map(obj => obj.label).join(', ') : 'nothing in particular';
        try {
            const similarFixes = await (0, feedbackService_1.findSimilarFixes)(moduleId, currentStepIndex, query);
            const pastFeedback = await (0, feedbackService_1.getPastFeedbackForStep)(moduleId, currentStepIndex);
            const requiredItems = moduleNeeds?.[activeModule.slug]?.[currentStepIndex]?.required || [];
            let finalPrompt = (0, promptEngineering_1.getPromptContextForLiveCoach)(activeModule.steps[currentStepIndex]?.title ?? 'Current Step', requiredItems, 'query', pastFeedback, similarFixes, `The user asked: "${query}". My live camera analysis shows a ${objectLabels} are present. Based on the current step's instructions and this visual context, answer their question.`);
            finalPrompt += `\n\nYour response should proactively ask the user for feedback. End your response with this exact tagline: "${(0, promptEngineering_1.getTagline)()}"`;
            const stream = await (0, geminiService_1.sendMessageWithRetry)(chatRef.current, finalPrompt);
            let fullText = '';
            try {
                for await (const chunk of stream) {
                    const chunkText = chunk.text ?? '';
                    fullText += chunkText;
                    if (mountedRef.current)
                        dispatch({ type: 'APPEND_AI_RESPONSE', payload: chunkText });
                }
            }
            catch (streamError) {
                console.error("AI query stream failed:", streamError);
                addToast('error', 'AI Connection Lost', 'The connection to the AI was interrupted.');
                return; // Bail out, finally will handle cleanup
            }
            if (fullText && mountedRef.current) {
                const logId = await (0, feedbackService_1.logAiFeedback)({ sessionToken, moduleId, stepIndex: currentStepIndex, userPrompt: query, aiResponse: fullText, feedback: 'bad' });
                setActiveFeedbackLogId(logId);
                dispatch({ type: 'SET_STATUS', payload: 'speaking' });
                if (ttsEnabled) {
                    try {
                        await ttsService.speak(fullText, 'coach');
                    }
                    catch (error) {
                        console.warn('TTS failed:', error);
                    }
                }
            }
        }
        catch (error) {
            console.error("Error sending message to AI:", error);
            const errorMessage = "Sorry, I couldn't process that. The AI tutor is paused.";
            dispatch({ type: 'SET_AI_RESPONSE', payload: errorMessage });
            dispatch({ type: 'SET_STATUS', payload: 'speaking' });
            if (ttsEnabled) {
                try {
                    await ttsService.speak(errorMessage, 'coach');
                }
                catch (e) {
                    console.warn('TTS failed:', e);
                }
            }
        }
        finally {
            if (mountedRef.current) {
                dispatch({ type: 'SET_STATUS', payload: 'listening' });
                startListening();
            }
            isProcessingActionRef.current = false;
            cooldownRef.current = setTimeout(() => {
                cooldownRef.current = null;
            }, 2000); // 2-second cooldown
        }
    }, [activeModule, detectedObjects, ttsEnabled, clearAllTimers, sessionToken, moduleId, currentStepIndex, moduleNeeds, startListening, stopListening, addToast]);
    (0, react_1.useEffect)(() => {
        if (!isInitialized || !visionInitialized || !chatInitialized)
            return;
        const proactiveCheck = async () => {
            if (status !== 'listening' || !moduleNeeds || !moduleId || !activeModule || mainModuleState)
                return;
            if (isInterjectingRef.current || isProcessingActionRef.current || cooldownRef.current)
                return;
            const needs = moduleNeeds[activeModule.slug]?.[currentStepIndex];
            if (!needs) {
                clearAllTimers();
                return;
            }
            const detectedForbiddenItem = (needs.forbidden || []).find((f) => (0, visionService_1.isObjectPresent)(detectedObjects, f));
            if (detectedForbiddenItem) {
                clearAllTimers();
                const branchRule = needs.branchOn?.find((b) => detectedForbiddenItem.toLowerCase().includes(b.item.toLowerCase()));
                if (branchRule && branchRule.module) {
                    await handleBranchStart(branchRule.module);
                    return;
                }
                processAiInterjection(`The user is using a forbidden item: a "${detectedForbiddenItem}".`, 'correction');
                return;
            }
            const requiredObjects = needs.required || [];
            if (requiredObjects.length === 0) {
                clearAllTimers();
                return;
            }
            if (requiredObjects.every((req) => (0, visionService_1.isObjectPresent)(detectedObjects, req))) {
                clearAllTimers();
                if (!stepCompletionTimerRef.current)
                    stepCompletionTimerRef.current = setTimeout(handleStepAdvance, 3000);
            }
            else {
                if (stepCompletionTimerRef.current) {
                    clearTimeout(stepCompletionTimerRef.current);
                    stepCompletionTimerRef.current = null;
                }
                if (lastEventType === 'good' && !hintTimerRef.current && !isInterjectingRef.current) {
                    hintTimerRef.current = setTimeout(() => {
                        if (mountedRef.current) {
                            processAiInterjection(`The user seems stuck and does not have the required item.`, 'hint');
                        }
                    }, 7000);
                }
            }
        };
        proactiveCheck();
    }, [detectedObjects, status, moduleNeeds, moduleId, currentStepIndex, activeModule, processAiInterjection, handleBranchStart, mainModuleState, handleStepAdvance, clearAllTimers, isInitialized, visionInitialized, chatInitialized, lastEventType]);
    // This effect updates the speech handler ref with the latest callbacks and state.
    // This breaks the dependency cycle between useSpeechRecognition and its consumers.
    (0, react_1.useEffect)(() => {
        speechHandlerRef.current = (transcript, isFinal) => {
            if (!isFinal || !transcript.trim() || status === 'thinking' || status === 'speaking' || isInterjectingRef.current || isProcessingActionRef.current || cooldownRef.current)
                return;
            const command = transcript.toLowerCase().trim();
            if (/^(done|next|okay next|finished|all set|what's next)$/i.test(command)) {
                handleStepAdvance();
                return;
            }
            if (command.startsWith("hey adapt")) {
                const query = transcript.substring(9).trim();
                if (query)
                    processAiQuery(query);
            }
        };
    }, [status, handleStepAdvance, processAiQuery]);
    const handleFeedbackClick = (0, react_1.useCallback)(async (feedback) => {
        if (!activeFeedbackLogId || isProcessingActionRef.current)
            return;
        if (feedback === 'good') {
            isProcessingActionRef.current = true;
            stopListening();
            try {
                await (0, feedbackService_1.updateFeedbackWithFix)(activeFeedbackLogId, 'good');
                addToast('success', 'Feedback Received!', 'Glad I could help!');
                setActiveFeedbackLogId(null);
                if (ttsEnabled) {
                    try {
                        await ttsService.speak((0, promptEngineering_1.getCelebratoryTagline)(), 'coach');
                    }
                    catch (error) {
                        console.warn('TTS failed:', error);
                    }
                }
            }
            finally {
                isProcessingActionRef.current = false;
                startListening();
            }
        }
        else {
            setShowFixFormFor(activeFeedbackLogId);
        }
    }, [activeFeedbackLogId, addToast, ttsEnabled, startListening, stopListening]);
    const handleUserFixSubmit = async (e) => {
        e.preventDefault();
        if (!showFixFormFor || !userFixText.trim())
            return;
        await (0, feedbackService_1.updateFeedbackWithFix)(showFixFormFor, userFixText.trim());
        addToast('success', 'Thank You!', 'Your feedback will make the AI smarter.');
        setShowFixFormFor(null);
        setUserFixText('');
        setActiveFeedbackLogId(null);
    };
    (0, react_1.useEffect)(() => {
        if (!activeModule || !hasSupport || isInitialized || !micReady)
            return;
        const initialize = async () => {
            if (!mountedRef.current)
                return;
            dispatch({ type: 'SET_STATUS', payload: 'initializing' });
            if (!visionInitialized) {
                try {
                    await (0, visionService_1.initializeObjectDetector)();
                    if (mountedRef.current)
                        setVisionInitialized(true);
                    visionIntervalRef.current = setInterval(() => {
                        if (videoRef.current?.readyState === 4 && mountedRef.current) {
                            try {
                                setDetectedObjects((0, visionService_1.detectObjectsInVideo)(videoRef.current));
                            }
                            catch (error) {
                                console.warn('Vision detection failed:', error);
                            }
                        }
                    }, 500);
                }
                catch (err) {
                    console.warn('Vision initialization failed:', err);
                    if (mountedRef.current)
                        setVisionInitialized(true);
                }
            }
            if (!chatInitialized) {
                try {
                    const context = activeModule.steps.map((s, i) => `Step ${i + 1}: ${s.title}\n${s.description}`).join('\n\n');
                    chatRef.current = (0, geminiService_1.startChat)(context);
                    if (mountedRef.current)
                        setChatInitialized(true);
                }
                catch (err) {
                    console.error('Chat initialization failed:', err);
                    if (mountedRef.current)
                        dispatch({ type: 'SET_STATUS', payload: 'idle' });
                    return;
                }
            }
            startListening();
            if (mountedRef.current) {
                dispatch({ type: 'SET_STATUS', payload: 'listening' });
                setIsInitialized(true);
            }
        };
        initialize();
    }, [activeModule, hasSupport, isInitialized, visionInitialized, chatInitialized, startListening, micReady]);
    (0, react_1.useEffect)(() => {
        if (!activeModule || !isInitialized || currentStepIndex !== 0)
            return;
        if (!sessionEvents.some(e => e.eventType === 'step_advance' && e.stepIndex === 0)) {
            const initialEvent = { eventType: 'step_advance', stepIndex: 0, timestamp: Date.now() };
            setSessionEvents([initialEvent]);
            persistSession({ liveCoachEvents: [initialEvent], currentStepIndex: 0, score: sessionScore });
        }
    }, [activeModule, isInitialized, currentStepIndex, sessionEvents, persistSession, sessionScore]);
    (0, react_1.useEffect)(() => {
        if (!isLoadingModule && isError) {
            console.error('Module loading failed');
            navigate('/not-found');
        }
    }, [isLoadingModule, isError, navigate]);
    const getStatusIndicator = () => {
        if (status === 'speaking')
            return <div className="flex flex-col items-center gap-2"><p>{aiResponse}</p></div>;
        if (status === 'correcting')
            return <><Icons_1.AlertTriangleIcon className="h-6 w-6 text-red-400 animate-pulse"/>Correcting mistake...</>;
        if (status === 'hinting')
            return <><Icons_1.LightbulbIcon className="h-6 w-6 text-yellow-400 animate-pulse"/>Offering a hint...</>;
        if (status === 'tutoring')
            return <><Icons_1.LightbulbIcon className="h-6 w-6 text-orange-400 animate-pulse"/>Let me explain that differently...</>;
        if (status === 'branching')
            return <><Icons_1.GitBranchIcon className="h-6 w-6 text-cyan-400 animate-pulse"/>Taking a short detour...</>;
        if (detectedObjects.length > 0 && ['listening', 'idle'].includes(status))
            return <><Icons_1.EyeIcon className="h-6 w-6 text-green-400"/>Seeing: {detectedObjects.map(o => o.label).join(', ')}</>;
        switch (status) {
            case 'initializing': return <><Icons_1.SparklesIcon className="h-6 w-6 text-indigo-400 animate-pulse"/>Vision AI is initializing...</>;
            case 'listening': return <><Icons_1.MicIcon className="h-6 w-6 text-green-400"/>Listening for &quot;Hey Adapt&quot;...</>;
            case 'thinking': return <><Icons_1.SparklesIcon className="h-6 w-6 text-indigo-400 animate-pulse"/>Thinking...</>;
            default: return 'Initializing...';
        }
    };
    const progressPercentage = (0, react_1.useMemo)(() => {
        if (!activeModule || activeModule.steps.length === 0)
            return 0;
        return ((currentStepIndex + 1) / activeModule.steps.length) * 100;
    }, [currentStepIndex, activeModule]);
    const progressBarColor = (0, react_1.useMemo)(() => {
        if (lastEventType === 'correction')
            return 'bg-red-500';
        if (lastEventType === 'hint')
            return 'bg-yellow-500';
        return 'bg-green-500';
    }, [lastEventType]);
    if (!hasSupport) {
        return (<div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-4">
                <Icons_1.MicIcon className="h-16 w-16 text-red-500 mb-4"/>
                <h2 className="text-2xl font-bold">Speech Recognition Not Supported</h2>
                <p className="mt-2 text-slate-400 text-center">
                    The Live Coach requires the Web Speech API, which is not available in your current browser.
                    Please try using Google Chrome or Microsoft Edge on a desktop computer.
                </p>
                <button onClick={() => navigate('/')} className="mt-8 bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg">
                    Back to Home
                </button>
            </div>);
    }
    if (isLoadingModule || isLoadingSession || !activeModule) {
        return (<div className="flex items-center justify-center h-screen bg-slate-900">
                <p className="text-xl text-slate-300">Loading Live Coach...</p>
            </div>);
    }
    if (!micReady) {
        return (<div className="h-screen w-screen">
                <MicTester_1.MicTester onSuccess={() => setMicReady(true)}/>
            </div>);
    }
    const currentInstruction = activeModule.steps[currentStepIndex]?.title ?? "Module Complete!";
    return (<div className="flex flex-col h-screen bg-slate-800 text-white font-sans">
            <header className="flex-shrink-0 p-4 bg-slate-900/50 backdrop-blur-sm border-b border-slate-700 flex justify-between items-center">
                <button onClick={() => navigate(`/modules/${moduleId}`)} className="text-slate-300 hover:text-indigo-400 transition-colors flex items-center gap-2">
                    <Icons_1.BookOpenIcon className="h-5 w-5"/>
                    <span>Back</span>
                </button>
                <div className="text-center">
                    <h1 className="text-2xl font-bold">{activeModule.title}</h1>
                    {mainModuleState && <p className="text-xs text-cyan-400 font-semibold animate-pulse">REMEDIAL LESSON</p>}
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setTtsEnabled(!ttsEnabled)} className="p-1" title={ttsEnabled ? "Mute Voice" : "Unmute Voice"}>
                        {ttsEnabled ? <Icons_1.SpeakerOnIcon className="h-6 w-6"/> : <Icons_1.SpeakerOffIcon className="h-6 w-6"/>}
                    </button>
                    <div className="flex items-center gap-2 font-bold text-lg" title="Session Score">
                        <Icons_1.TrophyIcon className="h-6 w-6 text-yellow-400"/>
                        <span>{sessionScore}%</span>
                    </div>
                </div>
            </header>

            <div className="w-full h-1.5 bg-slate-700">
                <div className={`h-full ${progressBarColor} transition-all duration-500`} style={{ width: `${progressPercentage}%` }}/>
            </div>

            <main className="flex-1 p-4 md:p-6 grid grid-rows-[1fr,auto] gap-6 overflow-hidden">
                <div className="min-h-0 relative">
                    <LiveCameraFeed_1.LiveCameraFeed ref={videoRef} instruction={currentInstruction} onClick={() => handleStepAdvance()} detectedObjects={detectedObjects}/>
                    {speechError === 'not-allowed' && (<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center">
                            <Icons_1.MicIcon className="h-16 w-16 text-red-500 mb-4"/>
                            <h3 className="text-xl font-bold">Microphone Access Denied</h3>
                            <p className="mt-2 text-slate-300">The Live Coach needs microphone access to hear your commands. Please grant permission in your browser's address bar and refresh the page.</p>
                        </div>)}
                </div>

                <footer className="flex-shrink-0 min-h-[6rem] bg-slate-900 rounded-lg p-4 flex flex-col items-center justify-center text-center shadow-lg border border-slate-700">
                    <div className="flex items-center gap-3 text-lg text-slate-300">
                        {getStatusIndicator()}
                    </div>
                    {activeFeedbackLogId && (<div className="mt-3 animate-fade-in-up flex items-center gap-4">
                            <button onClick={() => handleFeedbackClick('good')} className="flex items-center gap-2 text-green-400 hover:text-green-300 font-semibold text-sm transition-colors transform hover:scale-105">
                                <Icons_1.ThumbsUpIcon className="h-5 w-5"/> Helpful
                            </button>
                            <button onClick={() => handleFeedbackClick('bad')} className="flex items-center gap-2 text-red-400 hover:text-red-300 font-semibold text-sm transition-colors transform hover:scale-105">
                                <Icons_1.ThumbsDownIcon className="h-5 w-5"/> Not helpful
                            </button>
                        </div>)}
                    {showFixFormFor && (<form onSubmit={handleUserFixSubmit} className="mt-3 w-full max-w-md animate-fade-in-up">
                            <label className="block text-xs text-slate-400 mb-1">What worked instead? (Optional)</label>
                            <div className="flex gap-2">
                                <input type="text" value={userFixText} onChange={(e) => setUserFixText(e.target.value)} placeholder="e.g., I had to unplug it first." className="flex-1 bg-slate-800 border border-slate-600 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"/>
                                <button type="submit" className="bg-indigo-600 text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-indigo-700">
                                    Send
                                </button>
                            </div>
                        </form>)}
                </footer>
            </main>
        </div>);
};
exports.default = LiveCoachPage;
