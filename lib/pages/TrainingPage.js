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
const VideoPlayer_1 = require("@/components/VideoPlayer");
const ProcessSteps_1 = require("@/components/ProcessSteps");
const ChatTutor_1 = require("@/components/ChatTutor");
const Icons_1 = require("@/components/Icons");
const useTrainingSession_1 = require("@/hooks/useTrainingSession");
const useAuth_1 = require("@/hooks/useAuth");
const useToast_1 = require("@/hooks/useToast");
const moduleService_1 = require("@/services/moduleService");
const chatService_1 = require("@/services/chatService");
const geminiService_1 = require("@/services/geminiService");
const suggestionsService_1 = require("@/services/suggestionsService");
const checkpointService_1 = require("@/services/checkpointService");
const TranscriptViewer_1 = require("@/components/TranscriptViewer");
const PerformanceReport_1 = require("@/components/PerformanceReport");
const useSafeVideoUrl_1 = require("@/hooks/useSafeVideoUrl");
const trainingPageReducer_1 = require("@/reducers/trainingPageReducer");
const generateToken = () => Math.random().toString(36).substring(2, 10);
const TrainingPage = () => {
    const videoRef = (0, react_1.useRef)(null);
    const { moduleId } = (0, react_router_dom_1.useParams)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const location = (0, react_router_dom_1.useLocation)();
    const { isAuthenticated, user } = (0, useAuth_1.useAuth)();
    const { addToast } = (0, useToast_1.useToast)();
    const [state, dispatch] = (0, react_1.useReducer)(trainingPageReducer_1.trainingPageReducer, trainingPageReducer_1.initialTrainingPageState);
    const { activeTab, isEvaluatingCheckpoint, isAdvancing, checkpointFeedback, instructionSuggestion, isSuggestionSubmitted, isGeneratingReport, performanceReport, initialChatPrompt } = state;
    const [currentTime, setCurrentTime] = (0, react_1.useState)(0);
    const [stepsContext, setStepsContext] = (0, react_1.useState)('');
    const [fullTranscript, setFullTranscript] = (0, react_1.useState)('');
    const [sessionToken, setSessionToken] = (0, react_1.useState)('');
    const [submittedChatSuggestions, setSubmittedChatSuggestions] = (0, react_1.useState)({});
    const isAdmin = !!user;
    const isDebug = (0, react_1.useMemo)(() => new URLSearchParams(location.search).get('debug') === '1', [location.search]);
    (0, react_1.useEffect)(() => {
        const searchParams = new URLSearchParams(location.search);
        let token = searchParams.get('token');
        if (!token) {
            token = generateToken();
            navigate(`${location.pathname}?token=${token}`, { replace: true });
        }
        setSessionToken(token);
    }, [location.search, location.pathname, navigate]);
    const { data: moduleData, isLoading: isLoadingModule, isError, error, } = (0, react_query_1.useQuery)({
        queryKey: ['module', moduleId],
        queryFn: () => (0, moduleService_1.getModule)(moduleId),
        enabled: !!moduleId && !!sessionToken,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false,
    });
    const steps = (0, react_1.useMemo)(() => moduleData?.steps || [], [moduleData]);
    const transcript = (0, react_1.useMemo)(() => moduleData?.transcript || [], [moduleData]);
    const { currentStepIndex, setCurrentStepIndex, userActions, markStep, isCompleted, resetSession, isLoadingSession, goBack, } = (0, useTrainingSession_1.useTrainingSession)(moduleId ?? 'unknown', sessionToken, steps.length ?? 0);
    const { data: checkpointFailureStats } = (0, react_query_1.useQuery)({
        queryKey: ['checkpointFailureStats', moduleId],
        queryFn: () => (0, checkpointService_1.getCheckpointFailureStats)(moduleId),
        enabled: !!moduleId && isAdmin,
        staleTime: 1000 * 60 * 5,
    });
    const videoPath = (0, react_1.useMemo)(() => {
        // With the new GCS implementation, moduleData.video_url directly stores the GCS file path.
        return moduleData?.video_url || null;
    }, [moduleData?.video_url]);
    const { videoUrl: publicVideoUrl, isLoading: isLoadingVideo, isError: isVideoError, retry: retryVideoUrl, } = (0, useSafeVideoUrl_1.useSafeVideoUrl)(videoPath);
    (0, react_1.useEffect)(() => {
        if (isError && !moduleData) {
            console.error(`Module with slug "${moduleId}" not found or failed to load.`, error);
            navigate('/not-found');
        }
    }, [isError, moduleData, moduleId, navigate, error]);
    (0, react_1.useEffect)(() => {
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
    (0, react_1.useEffect)(() => {
        if (isCompleted && moduleData && !performanceReport && !isGeneratingReport) {
            const generateReport = async () => {
                if (!moduleId || !sessionToken)
                    return;
                dispatch({ type: 'START_REPORT_GENERATION' });
                const unclearStepIndexes = new Set(userActions.filter(a => a.status === 'unclear').map(a => a.stepIndex));
                const unclearSteps = Array.from(unclearStepIndexes).map((i) => steps[i]).filter(Boolean);
                const chatHistory = await (0, chatService_1.getChatHistory)(moduleId, sessionToken);
                const userQuestions = chatHistory
                    .filter(msg => msg.role === 'user' && msg.text.trim())
                    .map(msg => msg.text.trim());
                try {
                    const { summary: aiFeedback } = await (0, geminiService_1.generatePerformanceSummary)(moduleData.title, unclearSteps, userQuestions);
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
    const handleSeekTo = (0, react_1.useCallback)((time) => {
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
    (0, react_1.useEffect)(() => {
        const step = steps?.[currentStepIndex];
        if (step) {
            handleSeekTo(step.start);
        }
    }, [currentStepIndex, steps, handleSeekTo]);
    const handleCopyLink = (0, react_1.useCallback)(() => {
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
    const handleStepSelect = (0, react_1.useCallback)((time, index) => {
        handleSeekTo(time);
        setCurrentStepIndex(index);
    }, [handleSeekTo, setCurrentStepIndex]);
    const handleTimestampClick = (0, react_1.useCallback)((time) => {
        handleSeekTo(time);
        // Find the step corresponding to the timestamp and make it active
        const stepIndex = steps.findIndex(step => time >= step.start && time < step.end);
        if (stepIndex !== -1 && stepIndex !== currentStepIndex) {
            setCurrentStepIndex(stepIndex);
        }
    }, [handleSeekTo, steps, currentStepIndex, setCurrentStepIndex]);
    (0, react_1.useEffect)(() => {
        // Clear checkpoint-specific feedback when the step changes
        dispatch({ type: 'RESET_CHECKPOINT_STATE' });
    }, [currentStepIndex]);
    const handleMarkStep = (0, react_1.useCallback)((status) => {
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
    const handleCheckpointAnswer = (0, react_1.useCallback)(async (answer, comment) => {
        const stepJustAnswered = steps[currentStepIndex];
        if (!stepJustAnswered?.checkpoint || !moduleId)
            return;
        dispatch({ type: 'START_CHECKPOINT_EVALUATION' });
        if (user) {
            (0, checkpointService_1.logCheckpointResponse)({
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
            const evaluation = await (0, geminiService_1.evaluateCheckpointAnswer)(stepJustAnswered, answer);
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
    const handleSuggestionSubmit = (0, react_1.useCallback)(async () => {
        if (!instructionSuggestion || !moduleId)
            return;
        try {
            await (0, suggestionsService_1.submitSuggestion)(moduleId, currentStepIndex, instructionSuggestion);
            addToast('success', 'Suggestion Submitted', 'Thank you! The module owner will review it.');
            dispatch({ type: 'SUBMIT_SUGGESTION_SUCCESS' });
        }
        catch (err) {
            addToast('error', 'Submission Failed', 'Could not submit suggestion.');
        }
    }, [instructionSuggestion, moduleId, currentStepIndex, addToast]);
    const handleChatSuggestionSubmit = (0, react_1.useCallback)(async (suggestionText, messageId) => {
        if (!suggestionText.trim() || !moduleId) {
            addToast('error', 'Empty Suggestion', 'Cannot submit a blank suggestion.');
            return;
        }
        try {
            await (0, suggestionsService_1.submitSuggestion)(moduleId, currentStepIndex, suggestionText.trim());
            setSubmittedChatSuggestions(prev => ({ ...prev, [messageId]: true }));
            addToast('success', 'Suggestion Submitted', 'Thank you for your feedback! The module owner will review it.');
        }
        catch (err) {
            console.error("Failed to submit suggestion", err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            addToast('error', 'Submission Failed', `Could not submit suggestion: ${errorMessage}`);
        }
    }, [moduleId, currentStepIndex, addToast]);
    const handleTutorHelp = (0, react_1.useCallback)((question, userAnswer) => {
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
    const progressPercentage = (0, react_1.useMemo)(() => {
        if (isCompleted)
            return 100;
        if (!steps || steps.length === 0)
            return 0;
        return (currentStepIndex / steps.length) * 100;
    }, [currentStepIndex, steps, isCompleted]);
    if (isLoadingModule || isLoadingSession || !sessionToken) {
        return (<div className="flex items-center justify-center h-screen bg-white dark:bg-slate-900">
        <p className="text-xl text-slate-700 dark:text-slate-300">Loading Training Module...</p>
      </div>);
    }
    if (!moduleData) {
        return <div className="flex items-center justify-center h-screen">Module not found.</div>;
    }
    return (<>
      <header className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 p-4 sticky top-0 z-20 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2">
            <Icons_1.BookOpenIcon className="h-5 w-5"/>
            <span>Home</span>
          </button>
          <button onClick={handleCopyLink} className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2">
            <Icons_1.Share2Icon className="h-5 w-5"/>
            <span>Share</span>
          </button>
          {isAuthenticated && (<button onClick={() => navigate(`/modules/${moduleId}/edit`)} className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2">
              <Icons_1.PencilIcon className="h-5 w-5"/>
              <span>Edit Module</span>
            </button>)}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center absolute left-1/2 -translate-x-1/2">{moduleData.title}</h1>
        <span className="font-bold text-lg text-indigo-500 dark:text-indigo-400">Adapt</span>
      </header>

      {/* [UX] Progress Indicator */}
      <div className="h-1 w-full bg-slate-200 dark:bg-slate-700">
        <div style={{ width: `${progressPercentage}%` }} className="h-full bg-indigo-500 transition-all duration-500"/>
      </div>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-w-7xl mx-auto">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl overflow-hidden min-h-[400px]">
          {!moduleData?.video_url ? (<div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900">
              <Icons_1.VideoIcon className="h-16 w-16 text-slate-400 dark:text-slate-600"/>
              <p className="mt-4 text-slate-500">No video provided for this module.</p>
            </div>) : isLoadingVideo ? (<div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
              <Icons_1.SparklesIcon className="h-12 w-12 text-indigo-400 animate-pulse"/>
              <p className="mt-4 text-slate-500">Verifying video...</p>
            </div>) : isVideoError ? (<div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
              <Icons_1.AlertTriangleIcon className="h-12 w-12 text-red-500 mb-4"/>
              <p className="text-red-500 text-center">Could not load the video. The path might be missing or incorrect.</p>
              <button onClick={retryVideoUrl} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg flex items-center gap-2">
                <Icons_1.RefreshCwIcon className="h-5 w-5"/> Try Again
              </button>
            </div>) : publicVideoUrl ? (<VideoPlayer_1.VideoPlayer ref={videoRef} video_url={publicVideoUrl} onTimeUpdate={handleTimeUpdate}/>) : null}
        </div>
        <div className={`lg:col-span-1 h-[75vh] bg-white dark:bg-slate-800 rounded-lg shadow-xl flex flex-col ${isCompleted ? 'overflow-y-auto' : 'overflow-hidden'}`}>

          {isCompleted ? (isGeneratingReport ? (<div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400">
                <Icons_1.FileTextIcon className="h-12 w-12 mx-auto mb-4 text-slate-400 dark:text-slate-600 animate-pulse"/>
                <h3 className="font-bold text-lg text-slate-700 dark:text-slate-300">Generating Your Report...</h3>
                <p className="text-sm mt-1">The AI is analyzing your performance.</p>
              </div>) : performanceReport ? (<PerformanceReport_1.PerformanceReport report={performanceReport} onRestart={handleRestart}/>) : null) : (<>
              <div className="flex border-b border-slate-200 dark:border-slate-700">
                <button onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'steps' })} aria-current={activeTab === 'steps' ? 'page' : undefined} className={`flex-1 p-4 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'steps' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-700/50'}`}>
                  <Icons_1.BookOpenIcon className="h-5 w-5"/>
                  <span>Steps</span>
                </button>
                <button onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'transcript' })} aria-current={activeTab === 'transcript' ? 'page' : undefined} className={`flex-1 p-4 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'transcript' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-700/50'}`}>
                  <Icons_1.FileTextIcon className="h-5 w-5"/>
                  <span>Transcript</span>
                </button>
                <button onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'tutor' })} aria-current={activeTab === 'tutor' ? 'page' : undefined} className={`flex-1 p-4 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'tutor' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-700/50'}`}>
                  <Icons_1.BotIcon className="h-5 w-5"/>
                  <span>AI Tutor</span>
                </button>
              </div>

              {activeTab === 'steps' && (<ProcessSteps_1.ProcessSteps steps={steps} currentStepIndex={currentStepIndex} onStepSelect={handleStepSelect} markStep={handleMarkStep} goBack={goBack} onCheckpointAnswer={handleCheckpointAnswer} isEvaluatingCheckpoint={isEvaluatingCheckpoint || isAdvancing} checkpointFeedback={checkpointFeedback} instructionSuggestion={instructionSuggestion} onSuggestionSubmit={handleSuggestionSubmit} isSuggestionSubmitted={isSuggestionSubmitted} isAdmin={isAdmin} moduleId={moduleId} onTutorHelp={handleTutorHelp} checkpointFailureStats={checkpointFailureStats}/>)}

              {activeTab === 'transcript' && (transcript.length > 0 ? (<TranscriptViewer_1.TranscriptViewer transcript={transcript} currentTime={currentTime} onLineClick={handleSeekTo}/>) : (<div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400">
                    <Icons_1.FileTextIcon className="h-12 w-12 mx-auto mb-4 text-slate-400 dark:text-slate-600"/>
                    <h3 className="font-bold text-lg text-slate-700 dark:text-slate-300">No Transcript Available</h3>
                    <p className="text-sm mt-1">A transcript was not provided for this training module.</p>
                  </div>))}

              {activeTab === 'tutor' && moduleId && sessionToken && moduleData && (<ChatTutor_1.ChatTutor moduleId={moduleId} sessionToken={sessionToken} stepsContext={stepsContext} fullTranscript={fullTranscript} onTimestampClick={handleTimestampClick} currentStepIndex={currentStepIndex} steps={steps} onClose={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'steps' })} initialPrompt={initialChatPrompt} isDebug={isDebug} templateContext={moduleData.metadata?.templateContext} onSuggestionProposed={handleChatSuggestionSubmit} submittedSuggestions={submittedChatSuggestions}/>)}
            </>)}

        </div>
      </main>
    </>);
};
exports.default = TrainingPage;
