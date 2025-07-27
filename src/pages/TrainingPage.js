import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useCallback, useEffect, useMemo, useReducer } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { VideoPlayer } from '@/components/VideoPlayer';
import { ProcessSteps } from '@/components/ProcessSteps';
import { ChatTutor } from '@/components/ChatTutor';
import { BotIcon, BookOpenIcon, FileTextIcon, Share2Icon, PencilIcon, VideoIcon, AlertTriangleIcon, SparklesIcon, RefreshCwIcon } from '@/components/Icons';
import { useTrainingSession } from '@/hooks/useTrainingSession';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { getModule } from '@/services/moduleService';
import { getChatHistory } from '@/services/chatService';
import { generatePerformanceSummary, evaluateCheckpointAnswer } from '@/services/geminiService';
import { submitSuggestion } from '@/services/suggestionsService';
import { logCheckpointResponse, getCheckpointFailureStats } from '@/services/checkpointService';
import { TranscriptViewer } from '@/components/TranscriptViewer';
import { PerformanceReport } from '@/components/PerformanceReport';
import { useSafeVideoUrl } from '@/hooks/useSafeVideoUrl';
import { trainingPageReducer, initialTrainingPageState } from '@/reducers/trainingPageReducer';
const generateToken = () => Math.random().toString(36).substring(2, 10);
const TrainingPage = () => {
    const videoRef = useRef(null);
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, user } = useAuth();
    const { addToast } = useToast();
    const [state, dispatch] = useReducer(trainingPageReducer, initialTrainingPageState);
    const { activeTab, isEvaluatingCheckpoint, isAdvancing, checkpointFeedback, instructionSuggestion, isSuggestionSubmitted, isGeneratingReport, performanceReport, initialChatPrompt } = state;
    const [currentTime, setCurrentTime] = useState(0);
    const [stepsContext, setStepsContext] = useState('');
    const [fullTranscript, setFullTranscript] = useState('');
    const [sessionToken, setSessionToken] = useState('');
    const [submittedChatSuggestions, setSubmittedChatSuggestions] = useState({});
    const isAdmin = !!user;
    const isDebug = useMemo(() => new URLSearchParams(location.search).get('debug') === '1', [location.search]);
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        let token = searchParams.get('token');
        if (!token) {
            token = generateToken();
            navigate(`${location.pathname}?token=${token}`, { replace: true });
        }
        setSessionToken(token);
    }, [location.search, location.pathname, navigate]);
    const { data: moduleData, isLoading: isLoadingModule, isError, error, } = useQuery({
        queryKey: ['module', moduleId],
        queryFn: () => getModule(moduleId),
        enabled: !!moduleId && !!sessionToken,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false,
    });
    const steps = useMemo(() => moduleData?.steps || [], [moduleData]);
    const transcript = useMemo(() => moduleData?.transcript || [], [moduleData]);
    const { currentStepIndex, setCurrentStepIndex, userActions, markStep, isCompleted, resetSession, isLoadingSession, goBack, } = useTrainingSession(moduleId ?? 'unknown', sessionToken, steps.length ?? 0);
    const { data: checkpointFailureStats } = useQuery({
        queryKey: ['checkpointFailureStats', moduleId],
        queryFn: () => getCheckpointFailureStats(moduleId),
        enabled: !!moduleId && isAdmin,
        staleTime: 1000 * 60 * 5,
    });
    const videoPath = useMemo(() => {
        // With the new GCS implementation, moduleData.video_url directly stores the GCS file path.
        return moduleData?.video_url || null;
    }, [moduleData?.video_url]);
    const { videoUrl: publicVideoUrl, isLoading: isLoadingVideo, isError: isVideoError, retry: retryVideoUrl, } = useSafeVideoUrl(videoPath);
    useEffect(() => {
        if (isError && !moduleData) {
            console.error(`Module with slug "${moduleId}" not found or failed to load.`, error);
            navigate('/not-found');
        }
    }, [isError, moduleData, moduleId, navigate, error]);
    useEffect(() => {
        if (!moduleData || currentStepIndex < 0 || isCompleted) {
            setStepsContext('');
            setFullTranscript('');
            return;
        }
        ;
        const { title } = moduleData;
        const prevStep = steps[currentStepIndex - 1];
        const currentStep = steps[currentStepIndex];
        const nextStep = steps[currentStepIndex + 1];
        let stepCtx = `Module: ${title}\n`;
        stepCtx += `The trainee is on step ${currentStepIndex + 1} of ${steps.length}.\n\n--- RELEVANT STEPS ---\n`;
        const formatStep = (step, label) => {
            if (!step)
                return '';
            let stepStr = `## ${label} Step: ${step.title}\n`;
            stepStr += `Instruction: ${step.description}\n`;
            if (step.checkpoint)
                stepStr += `Checkpoint: ${step.checkpoint}\n`;
            return stepStr + '\n';
        };
        stepCtx += formatStep(prevStep, "Previous");
        stepCtx += formatStep(currentStep, "Current");
        stepCtx += formatStep(nextStep, "Next");
        setStepsContext(stepCtx.trim());
        if (transcript && transcript.length > 0) {
            const transcriptText = transcript.map((line) => `[${line.start.toFixed(2)}] ${line.text}`).join('\n');
            setFullTranscript(transcriptText);
        }
        else {
            setFullTranscript('');
        }
    }, [currentStepIndex, moduleData, isCompleted, steps, transcript]);
    useEffect(() => {
        if (isCompleted && moduleData && !performanceReport && !isGeneratingReport) {
            const generateReport = async () => {
                if (!moduleId || !sessionToken)
                    return;
                dispatch({ type: 'START_REPORT_GENERATION' });
                const unclearStepIndexes = new Set(userActions.filter(a => a.status === 'unclear').map(a => a.stepIndex));
                const unclearSteps = Array.from(unclearStepIndexes).map((i) => steps[i]).filter(Boolean);
                const chatHistory = await getChatHistory(moduleId, sessionToken);
                const userQuestions = chatHistory
                    .filter(msg => msg.role === 'user' && msg.text.trim())
                    .map(msg => msg.text.trim());
                try {
                    const { summary: aiFeedback } = await generatePerformanceSummary(moduleData.title, unclearSteps, userQuestions);
                    dispatch({
                        type: 'SET_PERFORMANCE_REPORT', payload: {
                            moduleTitle: moduleData.title,
                            completionDate: new Date().toLocaleDateString(),
                            aiFeedback,
                            unclearSteps,
                            userQuestions,
                        }
                    });
                }
                catch (error) {
                    console.error("Failed to generate performance report:", error);
                    dispatch({
                        type: 'SET_PERFORMANCE_REPORT', payload: {
                            moduleTitle: moduleData.title,
                            completionDate: new Date().toLocaleDateString(),
                            aiFeedback: "Congratulations on completing the training! You did a great job.",
                            unclearSteps,
                            userQuestions,
                        }
                    });
                }
            };
            generateReport();
        }
    }, [isCompleted, moduleData, userActions, moduleId, sessionToken, performanceReport, isGeneratingReport, steps]);
    const handleSeekTo = useCallback((time) => {
        if (videoRef.current) {
            // [UX] Prevent jarring seeks if the time is already very close
            if (Math.abs(videoRef.current.currentTime - time) < 0.5)
                return;
            videoRef.current.currentTime = time;
            if (videoRef.current.paused) {
                videoRef.current.play().catch(console.error);
            }
        }
    }, []);
    useEffect(() => {
        const step = steps?.[currentStepIndex];
        if (step) {
            handleSeekTo(step.start);
        }
    }, [currentStepIndex, steps, handleSeekTo]);
    const handleCopyLink = useCallback(() => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            addToast('success', 'Link Copied', 'The training session link is now in your clipboard.');
        }, (err) => {
            addToast('error', 'Copy Failed', 'Could not copy the link to your clipboard.');
            console.error('Failed to copy link: ', err);
        });
    }, [addToast]);
    const handleTimeUpdate = (time) => {
        if (isCompleted)
            return;
        setCurrentTime(time);
        const currentStep = steps[currentStepIndex];
        if (currentStep && !currentStep.checkpoint && time > currentStep.end && currentStep.end > 0) {
            if (currentStepIndex < steps.length - 1) {
                markStep('done');
            }
        }
    };
    const handleStepSelect = useCallback((time, index) => {
        handleSeekTo(time);
        setCurrentStepIndex(index);
    }, [handleSeekTo, setCurrentStepIndex]);
    const handleTimestampClick = useCallback((time) => {
        handleSeekTo(time);
        // Find the step corresponding to the timestamp and make it active
        const stepIndex = steps.findIndex(step => time >= step.start && time < step.end);
        if (stepIndex !== -1 && stepIndex !== currentStepIndex) {
            setCurrentStepIndex(stepIndex);
        }
    }, [handleSeekTo, steps, currentStepIndex, setCurrentStepIndex]);
    useEffect(() => {
        // Clear checkpoint-specific feedback when the step changes
        dispatch({ type: 'RESET_CHECKPOINT_STATE' });
    }, [currentStepIndex]);
    const handleMarkStep = useCallback((status) => {
        if (status === 'unclear') {
            markStep('unclear');
            const currentStep = steps[currentStepIndex];
            if (currentStep) {
                handleSeekTo(currentStep.start);
                addToast('info', "Let's try that again", "We'll replay this step for you.");
            }
        }
        else {
            markStep(status);
        }
    }, [markStep, steps, currentStepIndex, handleSeekTo, addToast]);
    const handleRestart = () => {
        dispatch({ type: 'RESET_SESSION_UI' });
        resetSession();
    };
    const handleCheckpointAnswer = useCallback(async (answer, comment) => {
        const stepJustAnswered = steps[currentStepIndex];
        if (!stepJustAnswered?.checkpoint || !moduleId)
            return;
        dispatch({ type: 'START_CHECKPOINT_EVALUATION' });
        if (user) {
            logCheckpointResponse({
                module_id: moduleId,
                user_id: user.uid,
                step_index: currentStepIndex,
                checkpoint_text: stepJustAnswered.checkpoint,
                answer: answer,
                comment: comment ?? null,
            }).catch(err => {
                console.error("Non-blocking error: Failed to log checkpoint response.", err);
            });
        }
        try {
            const evaluation = await evaluateCheckpointAnswer(stepJustAnswered, answer);
            const isCorrect = evaluation.isCorrect;
            const feedbackPayload = {
                ...evaluation,
                feedback: isCorrect ? `${evaluation.feedback} Correct! Moving on...` : evaluation.feedback,
            };
            dispatch({ type: 'CHECKPOINT_EVALUATION_SUCCESS', payload: { evaluation: feedbackPayload, isAdvancing: isCorrect } });
            if (isCorrect) {
                addToast('success', 'Checkpoint Passed!', "Moving to the next step shortly.");
                setTimeout(() => {
                    markStep('done');
                }, 2000);
            }
            else {
                addToast('info', 'Checkpoint Answer Noted', evaluation.feedback);
            }
        }
        catch (err) {
            console.error("Error evaluating checkpoint with AI", err);
            dispatch({ type: 'CHECKPOINT_EVALUATION_FAILURE' });
            addToast('error', 'Evaluation Error', 'Could not get AI feedback.');
        }
    }, [currentStepIndex, steps, addToast, markStep, user, moduleId]);
    const handleSuggestionSubmit = useCallback(async () => {
        if (!instructionSuggestion || !moduleId)
            return;
        try {
            await submitSuggestion(moduleId, currentStepIndex, instructionSuggestion);
            addToast('success', 'Suggestion Submitted', 'Thank you! The module owner will review it.');
            dispatch({ type: 'SUBMIT_SUGGESTION_SUCCESS' });
        }
        catch (err) {
            addToast('error', 'Submission Failed', 'Could not submit suggestion.');
        }
    }, [instructionSuggestion, moduleId, currentStepIndex, addToast]);
    const handleChatSuggestionSubmit = useCallback(async (suggestionText, messageId) => {
        if (!suggestionText.trim() || !moduleId) {
            addToast('error', 'Empty Suggestion', 'Cannot submit a blank suggestion.');
            return;
        }
        try {
            await submitSuggestion(moduleId, currentStepIndex, suggestionText.trim());
            setSubmittedChatSuggestions(prev => ({ ...prev, [messageId]: true }));
            addToast('success', 'Suggestion Submitted', 'Thank you for your feedback! The module owner will review it.');
        }
        catch (err) {
            console.error("Failed to submit suggestion", err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            addToast('error', 'Submission Failed', `Could not submit suggestion: ${errorMessage}`);
        }
    }, [moduleId, currentStepIndex, addToast]);
    const handleTutorHelp = useCallback((question, userAnswer) => {
        const step = steps[currentStepIndex];
        if (!step)
            return;
        let prompt;
        if (userAnswer && userAnswer.toLowerCase() === 'no' && step.checkpoint) {
            let contextForAi = `I'm on the step: "${step.title}".\n`;
            contextForAi += `The instruction is: "${step.description}".\n`;
            contextForAi += `I was asked the checkpoint question: "${step.checkpoint}" and I answered "${userAnswer}".\n`;
            if (step.alternativeMethods && step.alternativeMethods.length > 0 && step.alternativeMethods[0].description) {
                contextForAi += `I see a hint that says: "${step.alternativeMethods[0].description}".\n`;
            }
            contextForAi += "I'm still stuck. What should I do next?";
            prompt = contextForAi;
        }
        else {
            prompt = question;
        }
        dispatch({ type: 'SET_CHAT_PROMPT', payload: prompt });
    }, [steps, currentStepIndex]);
    const progressPercentage = useMemo(() => {
        if (isCompleted)
            return 100;
        if (!steps || steps.length === 0)
            return 0;
        return (currentStepIndex / steps.length) * 100;
    }, [currentStepIndex, steps, isCompleted]);
    if (isLoadingModule || isLoadingSession || !sessionToken) {
        return (_jsx("div", { className: "flex items-center justify-center h-screen bg-white dark:bg-slate-900", children: _jsx("p", { className: "text-xl text-slate-700 dark:text-slate-300", children: "Loading Training Module..." }) }));
    }
    if (!moduleData) {
        return _jsx("div", { className: "flex items-center justify-center h-screen", children: "Module not found." });
    }
    return (_jsxs(_Fragment, { children: [_jsxs("header", { className: "bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 p-4 sticky top-0 z-20 flex justify-between items-center", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("button", { onClick: () => navigate('/'), className: "text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2", children: [_jsx(BookOpenIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Home" })] }), _jsxs("button", { onClick: handleCopyLink, className: "text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2", children: [_jsx(Share2Icon, { className: "h-5 w-5" }), _jsx("span", { children: "Share" })] }), isAuthenticated && (_jsxs("button", { onClick: () => navigate(`/modules/${moduleId}/edit`), className: "text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2", children: [_jsx(PencilIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Edit Module" })] }))] }), _jsx("h1", { className: "text-2xl font-bold text-slate-900 dark:text-white text-center absolute left-1/2 -translate-x-1/2", children: moduleData.title }), _jsx("span", { className: "font-bold text-lg text-indigo-500 dark:text-indigo-400", children: "Adapt" })] }), _jsx("div", { className: "h-1 w-full bg-slate-200 dark:bg-slate-700", children: _jsx("div", { style: { width: `${progressPercentage}%` }, className: "h-full bg-indigo-500 transition-all duration-500" }) }), _jsxs("main", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-w-7xl mx-auto", children: [_jsx("div", { className: "lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl overflow-hidden min-h-[400px]", children: !moduleData?.video_url ? (_jsxs("div", { className: "w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900", children: [_jsx(VideoIcon, { className: "h-16 w-16 text-slate-400 dark:text-slate-600" }), _jsx("p", { className: "mt-4 text-slate-500", children: "No video provided for this module." })] })) : isLoadingVideo ? (_jsxs("div", { className: "w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 p-4", children: [_jsx(SparklesIcon, { className: "h-12 w-12 text-indigo-400 animate-pulse" }), _jsx("p", { className: "mt-4 text-slate-500", children: "Verifying video..." })] })) : isVideoError ? (_jsxs("div", { className: "w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 p-4", children: [_jsx(AlertTriangleIcon, { className: "h-12 w-12 text-red-500 mb-4" }), _jsx("p", { className: "text-red-500 text-center", children: "Could not load the video. The path might be missing or incorrect." }), _jsxs("button", { onClick: retryVideoUrl, className: "mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg flex items-center gap-2", children: [_jsx(RefreshCwIcon, { className: "h-5 w-5" }), " Try Again"] })] })) : publicVideoUrl ? (_jsx(VideoPlayer, { ref: videoRef, video_url: publicVideoUrl, onTimeUpdate: handleTimeUpdate })) : null }), _jsx("div", { className: `lg:col-span-1 h-[75vh] bg-white dark:bg-slate-800 rounded-lg shadow-xl flex flex-col ${isCompleted ? 'overflow-y-auto' : 'overflow-hidden'}`, children: isCompleted ? (isGeneratingReport ? (_jsxs("div", { className: "flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400", children: [_jsx(FileTextIcon, { className: "h-12 w-12 mx-auto mb-4 text-slate-400 dark:text-slate-600 animate-pulse" }), _jsx("h3", { className: "font-bold text-lg text-slate-700 dark:text-slate-300", children: "Generating Your Report..." }), _jsx("p", { className: "text-sm mt-1", children: "The AI is analyzing your performance." })] })) : performanceReport ? (_jsx(PerformanceReport, { report: performanceReport, onRestart: handleRestart })) : null) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex border-b border-slate-200 dark:border-slate-700", children: [_jsxs("button", { onClick: () => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'steps' }), "aria-current": activeTab === 'steps' ? 'page' : undefined, className: `flex-1 p-4 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'steps' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-700/50'}`, children: [_jsx(BookOpenIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Steps" })] }), _jsxs("button", { onClick: () => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'transcript' }), "aria-current": activeTab === 'transcript' ? 'page' : undefined, className: `flex-1 p-4 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'transcript' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-700/50'}`, children: [_jsx(FileTextIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Transcript" })] }), _jsxs("button", { onClick: () => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'tutor' }), "aria-current": activeTab === 'tutor' ? 'page' : undefined, className: `flex-1 p-4 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'tutor' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-700/50'}`, children: [_jsx(BotIcon, { className: "h-5 w-5" }), _jsx("span", { children: "AI Tutor" })] })] }), activeTab === 'steps' && (_jsx(ProcessSteps, { steps: steps, currentStepIndex: currentStepIndex, onStepSelect: handleStepSelect, markStep: handleMarkStep, goBack: goBack, onCheckpointAnswer: handleCheckpointAnswer, isEvaluatingCheckpoint: isEvaluatingCheckpoint || isAdvancing, checkpointFeedback: checkpointFeedback, instructionSuggestion: instructionSuggestion, onSuggestionSubmit: handleSuggestionSubmit, isSuggestionSubmitted: isSuggestionSubmitted, isAdmin: isAdmin, moduleId: moduleId, onTutorHelp: handleTutorHelp, checkpointFailureStats: checkpointFailureStats })), activeTab === 'transcript' && (transcript.length > 0 ? (_jsx(TranscriptViewer, { transcript: transcript, currentTime: currentTime, onLineClick: handleSeekTo })) : (_jsxs("div", { className: "flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400", children: [_jsx(FileTextIcon, { className: "h-12 w-12 mx-auto mb-4 text-slate-400 dark:text-slate-600" }), _jsx("h3", { className: "font-bold text-lg text-slate-700 dark:text-slate-300", children: "No Transcript Available" }), _jsx("p", { className: "text-sm mt-1", children: "A transcript was not provided for this training module." })] }))), activeTab === 'tutor' && moduleId && sessionToken && moduleData && (_jsx(ChatTutor, { moduleId: moduleId, sessionToken: sessionToken, stepsContext: stepsContext, fullTranscript: fullTranscript, onTimestampClick: handleTimestampClick, currentStepIndex: currentStepIndex, steps: steps, onClose: () => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'steps' }), initialPrompt: initialChatPrompt, isDebug: isDebug, templateContext: moduleData.metadata?.templateContext, onSuggestionProposed: handleChatSuggestionSubmit, submittedSuggestions: submittedChatSuggestions }))] })) })] })] }));
};
export default TrainingPage;
//# sourceMappingURL=TrainingPage.js.map