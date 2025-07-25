import React, { useState, useEffect, useCallback, useRef, useMemo, useReducer } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { getModule } from '@/services/moduleService';
import { getSession, saveSession } from '@/services/sessionService';
import { startChat, sendMessageWithRetry } from '@/services/geminiService';
import { getPastFeedbackForStep, logAiFeedback, updateFeedbackWithFix, findSimilarFixes } from '@/services/feedbackService';
import { getPromptContextForLiveCoach, getTagline, getCelebratoryTagline } from '@/utils/promptEngineering';
import { initializeObjectDetector, detectObjectsInVideo, isObjectPresent } from '@/services/visionService';
import * as ttsService from '@/services/ttsService';
import { LiveCameraFeed } from '@/components/LiveCameraFeed';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { coachReducer, initialCoachState } from '@/reducers/coachReducer';
import { BookOpenIcon, MicIcon, SparklesIcon, SpeakerOnIcon, EyeIcon, AlertTriangleIcon, LightbulbIcon, GitBranchIcon, SpeakerOffIcon, TrophyIcon, ThumbsUpIcon, ThumbsDownIcon } from '@/components/Icons';
import type { Chat } from '@google/genai';
import type { DetectedObject, ModuleNeeds, StepNeeds, LiveCoachEvent, TrainingModule, SessionState, ProcessStep, CoachEventType } from '@/types';
import type { CoachStatus } from '@/reducers/coachReducer';
import { MicTester } from '@/components/MicTester';

const generateToken = () => Math.random().toString(36).substring(2, 10);

const LiveCoachPage: React.FC = () => {
    const { moduleId = '' } = useParams<{ moduleId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const { addToast } = useToast();

    // --- State Management ---
    const [coachState, dispatch] = useReducer(coachReducer, initialCoachState);
    const { status, aiResponse, currentStepIndex, sessionScore, activeModule, mainModuleState } = coachState;

    // State not managed by the reducer
    const [sessionToken, setSessionToken] = useState('');
    const [sessionEvents, setSessionEvents] = useState<LiveCoachEvent[]>([]);
    const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
    const [moduleNeeds, setModuleNeeds] = useState<ModuleNeeds | null>(null);
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [lastEventType, setLastEventType] = useState<'good' | 'hint' | 'correction'>('good');
    const [activeFeedbackLogId, setActiveFeedbackLogId] = useState<string | null>(null);
    const [showFixFormFor, setShowFixFormFor] = useState<string | null>(null);
    const [userFixText, setUserFixText] = useState('');
    const [micReady, setMicReady] = useState(false); // Gatekeeper for starting the coach

    // Control flags
    const [isInitialized, setIsInitialized] = useState(false);
    const [visionInitialized, setVisionInitialized] = useState(false);
    const [chatInitialized, setChatInitialized] = useState(false);

    // Refs
    const chatRef = useRef<Chat | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const stepCompletionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const visionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isInterjectingRef = useRef(false);
    const mountedRef = useRef(true);
    const isProcessingActionRef = useRef(false); // Ref to prevent action overlaps
    const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Ref for action cooldown
    const speechHandlerRef = useRef<(transcript: string, isFinal: boolean) => void | undefined>(undefined);

    // --- Session & Data Fetching ---
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        let sessionKey = searchParams.get('session_key');
        if (!sessionKey) {
            sessionKey = generateToken();
            navigate(`${location.pathname}?session_key=${sessionKey}`, { replace: true });
        }
        setSessionToken(sessionKey);
    }, [location.search, location.pathname, navigate]);

    const sessionQueryKey = useMemo(() => ['liveCoachSession', moduleId, sessionToken], [moduleId, sessionToken]);

    const { data: sessionData, isLoading: isLoadingSession } = useQuery<SessionState | null>({
        queryKey: sessionQueryKey,
        queryFn: () => getSession(moduleId, sessionToken),
        enabled: !!moduleId && !!sessionToken,
    });

    const { data: moduleData, isLoading: isLoadingModule, isError } = useQuery<TrainingModule | undefined, Error>({
        queryKey: ['module', moduleId],
        queryFn: () => getModule(moduleId),
        enabled: !!moduleId,
        staleTime: 1000 * 60 * 5,
        retry: 3,
        retryDelay: 1000,
    });

    // Initialize coach state from fetched data
    useEffect(() => {
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


    const { mutate: persistSession } = useMutation({
        mutationFn: (newState: Partial<SessionState>) =>
            saveSession({ moduleId, sessionToken, ...newState }),
        onSuccess: (_data, variables) => {
            queryClient.setQueryData(sessionQueryKey, (old: SessionState | null) => ({
                ...(old || {} as SessionState),
                ...variables,
                moduleId,
                sessionToken
            }));
        },
    });

    useEffect(() => {
        if (moduleNeeds) return;
        const fetchNeeds = async () => {
            try {
                const response = await fetch('/needs.json');
                if (!response.ok) { console.warn('Module needs not available.'); return; }
                const data: ModuleNeeds = await response.json();
                if (mountedRef.current) setModuleNeeds(data);
            } catch (error) { console.warn("Could not fetch module needs:", error); }
        };
        fetchNeeds();
    }, [moduleNeeds]);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const clearAllTimers = useCallback(() => {
        if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
        if (stepCompletionTimerRef.current) clearTimeout(stepCompletionTimerRef.current);
        if (visionIntervalRef.current) clearInterval(visionIntervalRef.current);
        if (cooldownRef.current) clearTimeout(cooldownRef.current);
    }, []);

    useEffect(() => {
        return () => clearAllTimers();
    }, [clearAllTimers]);

    // This stable callback calls the latest logic from the ref.
    const handleSpeechResult = useCallback((transcript: string, isFinal: boolean) => {
        speechHandlerRef.current?.(transcript, isFinal);
    }, []);

    const { startListening, stopListening, hasSupport, error: speechError } = useSpeechRecognition(handleSpeechResult);


    const handleBranchEnd = useCallback(async () => {
        if (!mainModuleState || isProcessingActionRef.current) return;
        isProcessingActionRef.current = true;
        stopListening();

        try {
            const { module: nextModule, stepIndex: nextStepIndex } = mainModuleState;

            dispatch({ type: 'END_BRANCH' });

            const returnText = `Great, now let's get back to the main task. The next step is: ${nextModule.steps[nextStepIndex].title}`;
            addToast('success', 'Back on Track!', 'Returning to the main training.');
            if (ttsEnabled) {
                try { await ttsService.speak(returnText, 'system'); }
                catch (error) { console.warn('TTS failed:', error); }
            }
        } finally {
            isProcessingActionRef.current = false;
            startListening();
        }
    }, [mainModuleState, addToast, ttsEnabled, startListening, stopListening]);

    const handleStepAdvance = useCallback(async () => {
        if (!activeModule || isProcessingActionRef.current || cooldownRef.current) return;
        isProcessingActionRef.current = true;
        stopListening();

        try {
            clearAllTimers();

            if (mainModuleState && currentStepIndex + 1 >= activeModule.steps.length) {
                try { await ttsService.speak("Nice work. Let's get back to it.", 'system'); }
                catch (error) { console.warn('TTS failed:', error); }
                handleBranchEnd(); // This will handle its own locking and speech
                return; // Exit early, handleBranchEnd will manage state
            }

            const newIndex = currentStepIndex + 1;
            dispatch({ type: 'ADVANCE_STEP' });

            const newEvent: LiveCoachEvent = { eventType: 'step_advance', stepIndex: newIndex, timestamp: Date.now() };
            const updatedEvents = [...sessionEvents, newEvent];
            setSessionEvents(updatedEvents);

            if (newIndex >= activeModule.steps.length) {
                addToast('success', 'Module Complete!', 'You have finished all the steps.');
                persistSession({ isCompleted: true, score: sessionScore, currentStepIndex: newIndex, liveCoachEvents: updatedEvents });
                navigate(`/sessions/${moduleId}/${sessionToken}/review`);
            } else {
                if (!mainModuleState) {
                    persistSession({ currentStepIndex: newIndex, liveCoachEvents: updatedEvents, score: sessionScore });
                }
                if (ttsEnabled) {
                    try {
                        await ttsService.speak(`Okay, next up: ${activeModule.steps[newIndex].title}`, 'system');
                    } catch (error) {
                        console.warn('TTS failed:', error);
                    }
                }
            }
            setLastEventType('good');
            setActiveFeedbackLogId(null);
            setShowFixFormFor(null);
        } finally {
            isProcessingActionRef.current = false;
            cooldownRef.current = setTimeout(() => {
                cooldownRef.current = null;
            }, 2000); // 2-second cooldown
            if (mountedRef.current) {
                startListening();
            }
        }
    }, [activeModule, currentStepIndex, mainModuleState, persistSession, ttsEnabled, addToast, navigate, moduleId, sessionToken, sessionEvents, sessionScore, handleBranchEnd, clearAllTimers, startListening, stopListening]);

    const handleBranchStart = useCallback(async (subModuleSlug: string) => {
        if (!activeModule || isProcessingActionRef.current || cooldownRef.current) return;
        isProcessingActionRef.current = true;
        isInterjectingRef.current = true;
        stopListening();
        ttsService.cancel();
        dispatch({ type: 'DECREMENT_SCORE', payload: 15 });

        try {
            const subModule = await getModule(subModuleSlug);
            if (!subModule) throw new Error(`Sub-module "${subModuleSlug}" not found.`);

            dispatch({ type: 'START_BRANCH', payload: { subModule, mainModule: activeModule, mainStepIndex: currentStepIndex } });

            addToast('info', 'Taking a Detour', `Let's quickly review: ${subModule.title}`);
            const introText = `I noticed you might need some help with that. Let's take a quick look at how to do this correctly. First: ${subModule.steps[0].title}`;
            if (ttsEnabled) {
                try { await ttsService.speak(introText, 'coach'); }
                catch (error) { console.warn('TTS failed:', error); }
            }
            if (mountedRef.current) dispatch({ type: 'SET_STATUS', payload: 'listening' });
        } catch (error) {
            console.error("Failed to start branch:", error);
            addToast('error', 'Branching Failed', 'Could not load the sub-lesson.');
            if (mountedRef.current) dispatch({ type: 'SET_STATUS', payload: 'listening' });
        } finally {
            isProcessingActionRef.current = false;
            isInterjectingRef.current = false;
            if (mountedRef.current) {
                startListening();
            }
        }
    }, [activeModule, currentStepIndex, addToast, ttsEnabled, startListening, stopListening]);

    const logAndSaveEvent = useCallback((eventType: CoachEventType) => {
        if (mainModuleState) return;
        setLastEventType(eventType === 'hint' ? 'hint' : 'correction');
        const newEvent: LiveCoachEvent = { eventType, stepIndex: currentStepIndex, timestamp: Date.now() };
        const updatedEvents = [...sessionEvents, newEvent];
        setSessionEvents(updatedEvents);
        persistSession({ liveCoachEvents: updatedEvents, score: sessionScore });
    }, [currentStepIndex, sessionEvents, persistSession, mainModuleState, sessionScore]);

    const processAiInterjection = useCallback(async (basePrompt: string, type: 'hint' | 'correction') => {
        if (!chatRef.current || !activeModule || isProcessingActionRef.current || cooldownRef.current) return;
        isProcessingActionRef.current = true;
        isInterjectingRef.current = true;
        stopListening();
        ttsService.cancel();
        dispatch({ type: 'RESET_AI_RESPONSE' });
        setActiveFeedbackLogId(null);

        const newStatus: CoachStatus = type === 'hint' ? 'hinting' : 'correcting';
        dispatch({ type: 'SET_STATUS', payload: newStatus });
        logAndSaveEvent(newStatus);
        dispatch({ type: 'DECREMENT_SCORE', payload: 5 });

        try {
            const similarFixes = await findSimilarFixes(moduleId, currentStepIndex, basePrompt);
            const pastFeedback = await getPastFeedbackForStep(moduleId, currentStepIndex);
            const requiredItems = moduleNeeds?.[activeModule.slug]?.[currentStepIndex]?.required || [];
            let finalPrompt = getPromptContextForLiveCoach(activeModule.steps[currentStepIndex]?.title ?? 'Current Step', requiredItems, type, pastFeedback, similarFixes, basePrompt);
            finalPrompt += `\n\nYour response should proactively ask the user for feedback. End your response with this exact tagline: "${getTagline()}"`;

            const stream = await sendMessageWithRetry(chatRef.current, finalPrompt);
            let fullText = '';

            try {
                for await (const chunk of stream) {
                    const chunkText = chunk.text ?? '';
                    fullText += chunkText;
                    if (mountedRef.current) dispatch({ type: 'APPEND_AI_RESPONSE', payload: chunkText });
                }
            } catch (streamError) {
                console.error("AI stream failed:", streamError);
                addToast('error', 'AI Connection Lost', 'The connection to the AI was interrupted.');
                // Bail out but ensure we unlock and start listening again in finally
                return;
            }

            if (fullText && mountedRef.current) {
                const logId = await logAiFeedback({ sessionToken, moduleId, stepIndex: currentStepIndex, userPrompt: basePrompt, aiResponse: fullText, feedback: 'bad' });
                setActiveFeedbackLogId(logId);
                dispatch({ type: 'SET_STATUS', payload: 'speaking' });
                if (ttsEnabled) {
                    try { await ttsService.speak(fullText, 'coach'); }
                    catch (error) { console.warn('TTS failed:', error); }
                }
            }
        } catch (e) {
            console.error(e);
            addToast('error', 'AI Coach Error', 'The AI is having trouble. Coaching is paused.');
        } finally {
            if (mountedRef.current) dispatch({ type: 'SET_STATUS', payload: 'listening' });
            isProcessingActionRef.current = false;
            cooldownRef.current = setTimeout(() => {
                cooldownRef.current = null;
            }, 2000); // 2-second cooldown
            isInterjectingRef.current = false;
            startListening();
        }
    }, [activeModule, currentStepIndex, logAndSaveEvent, ttsEnabled, moduleId, sessionToken, moduleNeeds, addToast, startListening, stopListening]);

    const processAiQuery = useCallback(async (query: string) => {
        if (!chatRef.current || !activeModule || isProcessingActionRef.current || cooldownRef.current) return;
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
            const similarFixes = await findSimilarFixes(moduleId, currentStepIndex, query);
            const pastFeedback = await getPastFeedbackForStep(moduleId, currentStepIndex);
            const requiredItems = moduleNeeds?.[activeModule.slug]?.[currentStepIndex]?.required || [];
            let finalPrompt = getPromptContextForLiveCoach(activeModule.steps[currentStepIndex]?.title ?? 'Current Step', requiredItems, 'query', pastFeedback, similarFixes, `The user asked: "${query}". My live camera analysis shows a ${objectLabels} are present. Based on the current step's instructions and this visual context, answer their question.`);
            finalPrompt += `\n\nYour response should proactively ask the user for feedback. End your response with this exact tagline: "${getTagline()}"`;

            const stream = await sendMessageWithRetry(chatRef.current, finalPrompt);
            let fullText = '';

            try {
                for await (const chunk of stream) {
                    const chunkText = chunk.text ?? '';
                    fullText += chunkText;
                    if (mountedRef.current) dispatch({ type: 'APPEND_AI_RESPONSE', payload: chunkText });
                }
            } catch (streamError) {
                console.error("AI query stream failed:", streamError);
                addToast('error', 'AI Connection Lost', 'The connection to the AI was interrupted.');
                return; // Bail out, finally will handle cleanup
            }

            if (fullText && mountedRef.current) {
                const logId = await logAiFeedback({ sessionToken, moduleId, stepIndex: currentStepIndex, userPrompt: query, aiResponse: fullText, feedback: 'bad' });
                setActiveFeedbackLogId(logId);
                dispatch({ type: 'SET_STATUS', payload: 'speaking' });
                if (ttsEnabled) {
                    try { await ttsService.speak(fullText, 'coach'); }
                    catch (error) { console.warn('TTS failed:', error); }
                }
            }
        } catch (error) {
            console.error("Error sending message to AI:", error);
            const errorMessage = "Sorry, I couldn't process that. The AI tutor is paused.";
            dispatch({ type: 'SET_AI_RESPONSE', payload: errorMessage });
            dispatch({ type: 'SET_STATUS', payload: 'speaking' });
            if (ttsEnabled) {
                try { await ttsService.speak(errorMessage, 'coach'); }
                catch (e) { console.warn('TTS failed:', e); }
            }
        } finally {
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

    useEffect(() => {
        if (!isInitialized || !visionInitialized || !chatInitialized) return;
        const proactiveCheck = async () => {
            if (status !== 'listening' || !moduleNeeds || !moduleId || !activeModule || mainModuleState) return;
            if (isInterjectingRef.current || isProcessingActionRef.current || cooldownRef.current) return;
            const needs: StepNeeds | undefined = moduleNeeds[activeModule.slug]?.[currentStepIndex];
            if (!needs) { clearAllTimers(); return; }

            const detectedForbiddenItem = (needs.forbidden || []).find((f: string) => isObjectPresent(detectedObjects, f));
            if (detectedForbiddenItem) {
                clearAllTimers();
                const branchRule = needs.branchOn?.find((b: { item: string; module: string }) => detectedForbiddenItem.toLowerCase().includes(b.item.toLowerCase()));
                if (branchRule && branchRule.module) { await handleBranchStart(branchRule.module); return; }
                processAiInterjection(`The user is using a forbidden item: a "${detectedForbiddenItem}".`, 'correction');
                return;
            }

            const requiredObjects = needs.required || [];
            if (requiredObjects.length === 0) { clearAllTimers(); return; }

            if (requiredObjects.every((req: string) => isObjectPresent(detectedObjects, req))) {
                clearAllTimers();
                if (!stepCompletionTimerRef.current) stepCompletionTimerRef.current = setTimeout(handleStepAdvance, 3000);
            } else {
                if (stepCompletionTimerRef.current) { clearTimeout(stepCompletionTimerRef.current); stepCompletionTimerRef.current = null; }

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
    useEffect(() => {
        speechHandlerRef.current = (transcript: string, isFinal: boolean) => {
            if (!isFinal || !transcript.trim() || status === 'thinking' || status === 'speaking' || isInterjectingRef.current || isProcessingActionRef.current || cooldownRef.current) return;

            const command = transcript.toLowerCase().trim();
            if (/^(done|next|okay next|finished|all set|what's next)$/i.test(command)) {
                handleStepAdvance();
                return;
            }
            if (command.startsWith("hey adapt")) {
                const query = transcript.substring(9).trim();
                if (query) processAiQuery(query);
            }
        };
    }, [status, handleStepAdvance, processAiQuery]);

    const handleFeedbackClick = useCallback(async (feedback: 'good' | 'bad') => {
        if (!activeFeedbackLogId || isProcessingActionRef.current) return;

        if (feedback === 'good') {
            isProcessingActionRef.current = true;
            stopListening();
            try {
                await updateFeedbackWithFix(activeFeedbackLogId, 'good');
                addToast('success', 'Feedback Received!', 'Glad I could help!');
                setActiveFeedbackLogId(null);
                if (ttsEnabled) {
                    try { await ttsService.speak(getCelebratoryTagline(), 'coach'); }
                    catch (error) { console.warn('TTS failed:', error); }
                }
            } finally {
                isProcessingActionRef.current = false;
                startListening();
            }
        } else {
            setShowFixFormFor(activeFeedbackLogId);
        }
    }, [activeFeedbackLogId, addToast, ttsEnabled, startListening, stopListening]);

    const handleUserFixSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showFixFormFor || !userFixText.trim()) return;
        await updateFeedbackWithFix(showFixFormFor, userFixText.trim());
        addToast('success', 'Thank You!', 'Your feedback will make the AI smarter.');
        setShowFixFormFor(null);
        setUserFixText('');
        setActiveFeedbackLogId(null);
    };

    useEffect(() => {
        if (!activeModule || !hasSupport || isInitialized || !micReady) return;
        const initialize = async () => {
            if (!mountedRef.current) return;
            dispatch({ type: 'SET_STATUS', payload: 'initializing' });

            if (!visionInitialized) {
                try {
                    await initializeObjectDetector();
                    if (mountedRef.current) setVisionInitialized(true);
                    visionIntervalRef.current = setInterval(() => {
                        if (videoRef.current?.readyState === 4 && mountedRef.current) {
                            try { setDetectedObjects(detectObjectsInVideo(videoRef.current)); }
                            catch (error) { console.warn('Vision detection failed:', error); }
                        }
                    }, 500);
                } catch (err) {
                    console.warn('Vision initialization failed:', err);
                    if (mountedRef.current) setVisionInitialized(true);
                }
            }

            if (!chatInitialized) {
                try {
                    const context = activeModule.steps.map((s: ProcessStep, i: number) => `Step ${i + 1}: ${s.title}\n${s.description}`).join('\n\n');
                    chatRef.current = startChat(context);
                    if (mountedRef.current) setChatInitialized(true);
                } catch (err) {
                    console.error('Chat initialization failed:', err);
                    if (mountedRef.current) dispatch({ type: 'SET_STATUS', payload: 'idle' });
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

    useEffect(() => {
        if (!activeModule || !isInitialized || currentStepIndex !== 0) return;
        if (!sessionEvents.some(e => e.eventType === 'step_advance' && e.stepIndex === 0)) {
            const initialEvent: LiveCoachEvent = { eventType: 'step_advance', stepIndex: 0, timestamp: Date.now() };
            setSessionEvents([initialEvent]);
            persistSession({ liveCoachEvents: [initialEvent], currentStepIndex: 0, score: sessionScore });
        }
    }, [activeModule, isInitialized, currentStepIndex, sessionEvents, persistSession, sessionScore]);

    useEffect(() => {
        if (!isLoadingModule && isError) {
            console.error('Module loading failed');
            navigate('/not-found');
        }
    }, [isLoadingModule, isError, navigate]);

    const getStatusIndicator = () => {
        if (status === 'speaking') return <div className="flex flex-col items-center gap-2"><p>{aiResponse}</p></div>;
        if (status === 'correcting') return <><AlertTriangleIcon className="h-6 w-6 text-red-400 animate-pulse" />Correcting mistake...</>;
        if (status === 'hinting') return <><LightbulbIcon className="h-6 w-6 text-yellow-400 animate-pulse" />Offering a hint...</>;
        if (status === 'tutoring') return <><LightbulbIcon className="h-6 w-6 text-orange-400 animate-pulse" />Let me explain that differently...</>;
        if (status === 'branching') return <><GitBranchIcon className="h-6 w-6 text-cyan-400 animate-pulse" />Taking a short detour...</>;
        if (detectedObjects.length > 0 && ['listening', 'idle'].includes(status)) return <><EyeIcon className="h-6 w-6 text-green-400" />Seeing: {detectedObjects.map(o => o.label).join(', ')}</>;
        switch (status) {
            case 'initializing': return <><SparklesIcon className="h-6 w-6 text-indigo-400 animate-pulse" />Vision AI is initializing...</>;
            case 'listening': return <><MicIcon className="h-6 w-6 text-green-400" />Listening for &quot;Hey Adapt&quot;...</>;
            case 'thinking': return <><SparklesIcon className="h-6 w-6 text-indigo-400 animate-pulse" />Thinking...</>;
            default: return 'Initializing...';
        }
    }

    const progressPercentage = useMemo(() => {
        if (!activeModule || activeModule.steps.length === 0) return 0;
        return ((currentStepIndex + 1) / activeModule.steps.length) * 100;
    }, [currentStepIndex, activeModule]);

    const progressBarColor = useMemo(() => {
        if (lastEventType === 'correction') return 'bg-red-500';
        if (lastEventType === 'hint') return 'bg-yellow-500';
        return 'bg-green-500';
    }, [lastEventType]);

    if (!hasSupport) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-4">
                <MicIcon className="h-16 w-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold">Speech Recognition Not Supported</h2>
                <p className="mt-2 text-slate-400 text-center">
                    The Live Coach requires the Web Speech API, which is not available in your current browser.
                    Please try using Google Chrome or Microsoft Edge on a desktop computer.
                </p>
                <button onClick={() => navigate('/')} className="mt-8 bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg">
                    Back to Home
                </button>
            </div>
        );
    }

    if (isLoadingModule || isLoadingSession || !activeModule) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-900">
                <p className="text-xl text-slate-300">Loading Live Coach...</p>
            </div>
        );
    }

    if (!micReady) {
        return (
            <div className="h-screen w-screen">
                <MicTester onSuccess={() => setMicReady(true)} />
            </div>
        )
    }

    const currentInstruction = activeModule.steps[currentStepIndex]?.title ?? "Module Complete!";

    return (
        <div className="flex flex-col h-screen bg-slate-800 text-white font-sans">
            <header className="flex-shrink-0 p-4 bg-slate-900/50 backdrop-blur-sm border-b border-slate-700 flex justify-between items-center">
                <button onClick={() => navigate(`/modules/${moduleId}`)} className="text-slate-300 hover:text-indigo-400 transition-colors flex items-center gap-2">
                    <BookOpenIcon className="h-5 w-5" />
                    <span>Back</span>
                </button>
                <div className="text-center">
                    <h1 className="text-2xl font-bold">{activeModule.title}</h1>
                    {mainModuleState && <p className="text-xs text-cyan-400 font-semibold animate-pulse">REMEDIAL LESSON</p>}
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setTtsEnabled(!ttsEnabled)} className="p-1" title={ttsEnabled ? "Mute Voice" : "Unmute Voice"}>
                        {ttsEnabled ? <SpeakerOnIcon className="h-6 w-6" /> : <SpeakerOffIcon className="h-6 w-6" />}
                    </button>
                    <div className="flex items-center gap-2 font-bold text-lg" title="Session Score">
                        <TrophyIcon className="h-6 w-6 text-yellow-400" />
                        <span>{sessionScore}%</span>
                    </div>
                </div>
            </header>

            <div className="w-full h-1.5 bg-slate-700">
                <div className={`h-full ${progressBarColor} transition-all duration-500`} style={{ width: `${progressPercentage}%` }} />
            </div>

            <main className="flex-1 p-4 md:p-6 grid grid-rows-[1fr,auto] gap-6 overflow-hidden">
                <div className="min-h-0 relative">
                    <LiveCameraFeed
                        ref={videoRef}
                        instruction={currentInstruction}
                        onClick={() => handleStepAdvance()}
                        detectedObjects={detectedObjects}
                    />
                    {speechError === 'not-allowed' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center">
                            <MicIcon className="h-16 w-16 text-red-500 mb-4" />
                            <h3 className="text-xl font-bold">Microphone Access Denied</h3>
                            <p className="mt-2 text-slate-300">The Live Coach needs microphone access to hear your commands. Please grant permission in your browser's address bar and refresh the page.</p>
                        </div>
                    )}
                </div>

                <footer className="flex-shrink-0 min-h-[6rem] bg-slate-900 rounded-lg p-4 flex flex-col items-center justify-center text-center shadow-lg border border-slate-700">
                    <div className="flex items-center gap-3 text-lg text-slate-300">
                        {getStatusIndicator()}
                    </div>
                    {activeFeedbackLogId && (
                        <div className="mt-3 animate-fade-in-up flex items-center gap-4">
                            <button onClick={() => handleFeedbackClick('good')} className="flex items-center gap-2 text-green-400 hover:text-green-300 font-semibold text-sm transition-colors transform hover:scale-105">
                                <ThumbsUpIcon className="h-5 w-5" /> Helpful
                            </button>
                            <button onClick={() => handleFeedbackClick('bad')} className="flex items-center gap-2 text-red-400 hover:text-red-300 font-semibold text-sm transition-colors transform hover:scale-105">
                                <ThumbsDownIcon className="h-5 w-5" /> Not helpful
                            </button>
                        </div>
                    )}
                    {showFixFormFor && (
                        <form onSubmit={handleUserFixSubmit} className="mt-3 w-full max-w-md animate-fade-in-up">
                            <label className="block text-xs text-slate-400 mb-1">What worked instead? (Optional)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={userFixText}
                                    onChange={(e) => setUserFixText(e.target.value)}
                                    placeholder="e.g., I had to unplug it first."
                                    className="flex-1 bg-slate-800 border border-slate-600 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <button type="submit" className="bg-indigo-600 text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-indigo-700">
                                    Send
                                </button>
                            </div>
                        </form>
                    )}
                </footer>
            </main>
        </div>
    );
};

export default LiveCoachPage;