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
const moduleService_1 = require("@/services/moduleService");
const suggestionsService_1 = require("@/services/suggestionsService");
const checkpointService_1 = require("@/services/checkpointService");
const ModuleEditor_1 = require("@/components/ModuleEditor");
const VideoPlayer_1 = require("@/components/VideoPlayer");
const Icons_1 = require("@/components/Icons");
const useAuth_1 = require("@/hooks/useAuth");
const useToast_1 = require("@/hooks/useToast");
const useSafeVideoUrl_1 = require("@/hooks/useSafeVideoUrl");
const EditPage = () => {
    const { moduleId } = (0, react_router_dom_1.useParams)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const location = (0, react_router_dom_1.useLocation)();
    const queryClient = (0, react_query_1.useQueryClient)();
    const { isAuthenticated, user } = (0, useAuth_1.useAuth)();
    const { addToast } = (0, useToast_1.useToast)();
    const [module, setModule] = (0, react_1.useState)(null);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const [isDeleting, setIsDeleting] = (0, react_1.useState)(false);
    const isAdmin = !!user;
    const [initialFocusStepIndex, setInitialFocusStepIndex] = (0, react_1.useState)();
    const videoRef = (0, react_1.useRef)(null);
    const [currentTime, setCurrentTime] = (0, react_1.useState)(0);
    const { data: initialModuleData, isLoading, isError: isModuleError, error: queryError } = (0, react_query_1.useQuery)({
        queryKey: ['module', moduleId],
        queryFn: () => (0, moduleService_1.getModule)(moduleId),
        enabled: !!moduleId,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });
    const videoPath = (0, react_1.useMemo)(() => {
        // With the new GCS implementation, initialModuleData.video_url directly stores the GCS file path.
        return initialModuleData?.video_url || null;
    }, [initialModuleData?.video_url]);
    const { videoUrl: publicVideoUrl, isLoading: isLoadingVideo, isError: isVideoError, retry: retryVideoUrl, } = (0, useSafeVideoUrl_1.useSafeVideoUrl)(videoPath);
    const { data: traineeSuggestions = [] } = (0, react_query_1.useQuery)({
        queryKey: ['traineeSuggestions', moduleId],
        queryFn: () => (0, suggestionsService_1.getTraineeSuggestionsForModule)(moduleId),
        enabled: !!moduleId && isAdmin,
    });
    const { data: aiSuggestions = [] } = (0, react_query_1.useQuery)({
        queryKey: ['aiSuggestions', moduleId],
        queryFn: () => (0, suggestionsService_1.getAiSuggestionsForModule)(moduleId),
        enabled: !!moduleId && isAdmin,
    });
    const { data: checkpointResponses = [] } = (0, react_query_1.useQuery)({
        queryKey: ['checkpointResponses', moduleId],
        queryFn: () => (0, checkpointService_1.getCheckpointResponsesForModule)(moduleId),
        enabled: !!moduleId && isAdmin,
    });
    // TODO: Re-implement realtime updates using Firebase (e.g., Firestore onSnapshot).
    // The previous implementation using Supabase channels has been removed.
    // useEffect(() => {
    //     ...
    // }, [moduleId, queryClient, addToast]);
    const pendingTraineeSuggestions = (0, react_1.useMemo)(() => {
        return traineeSuggestions.filter((s) => s.status === 'pending');
    }, [traineeSuggestions]);
    (0, react_1.useEffect)(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);
    (0, react_1.useEffect)(() => {
        if (initialModuleData) {
            const moduleToEdit = { ...initialModuleData };
            const navigationState = location.state;
            if (navigationState?.suggestion && typeof navigationState.stepIndex === 'number') {
                const { suggestion, stepIndex } = navigationState;
                const steps = moduleToEdit.steps;
                if (steps && steps[stepIndex]) {
                    steps[stepIndex] = { ...steps[stepIndex], description: suggestion };
                    moduleToEdit.steps = steps;
                    setInitialFocusStepIndex(stepIndex);
                    addToast('info', 'Suggestion Applied', `AI fix pre-filled for Step ${stepIndex + 1}. Review and save changes.`);
                    navigate(location.pathname, { replace: true, state: {} });
                }
            }
            setModule(moduleToEdit);
        }
    }, [initialModuleData, location.state, location.pathname, navigate, addToast]);
    (0, react_1.useEffect)(() => {
        if (!isLoading && (isModuleError || !initialModuleData)) {
            console.error(`Failed to load module for editing: ${moduleId}`, queryError);
            navigate('/not-found');
        }
    }, [isLoading, isModuleError, initialModuleData, moduleId, navigate, queryError]);
    const handleSeek = (0, react_1.useCallback)((time) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            if (videoRef.current.paused) {
                videoRef.current.play().catch(console.error);
            }
        }
    }, []);
    const handleSuggestionAccept = (0, react_1.useCallback)(async (suggestion) => {
        if (!module)
            return;
        const newSteps = [...(module.steps ?? [])];
        const stepIndex = suggestion.stepIndex;
        if (stepIndex >= 0 && stepIndex < newSteps.length) {
            const stepToUpdate = newSteps[stepIndex];
            // Appends the trainee's suggestion to the existing description.
            const newDescription = `${stepToUpdate.description}\n\n--- Trainee Suggestion ---\n${suggestion.text}`;
            newSteps[stepIndex] = { ...stepToUpdate, description: newDescription };
            setModule({ ...module, steps: newSteps });
            // After applying the change, remove the suggestion from the pending list.
            try {
                await (0, suggestionsService_1.deleteTraineeSuggestion)(suggestion.id);
                await queryClient.invalidateQueries({ queryKey: ['traineeSuggestions', moduleId] });
                addToast('success', 'Suggestion Applied', 'The suggestion has been added to the step description.');
            }
            catch (err) {
                addToast('error', 'Update Failed', 'Could not remove the pending suggestion.');
            }
        }
        else {
            // This case handles data inconsistency where a suggestion points to a non-existent step.
            addToast('error', 'Step Not Found', `Cannot apply suggestion: Step at index ${stepIndex} not found.`);
        }
    }, [module, moduleId, queryClient, addToast]);
    const handleSuggestionReject = async (suggestionId) => {
        try {
            await (0, suggestionsService_1.deleteTraineeSuggestion)(suggestionId);
            queryClient.invalidateQueries({ queryKey: ['traineeSuggestions', moduleId] });
            addToast('info', 'Suggestion Rejected', 'The suggestion has been removed.');
        }
        catch (err) {
            addToast('error', 'Rejection Failed', 'Could not remove the pending suggestion.');
        }
    };
    const handleSave = async () => {
        if (!module || !user)
            return;
        setIsSaving(true);
        addToast('info', 'Saving...', 'Your changes are being saved to the database.');
        try {
            // The video file is not being re-uploaded here.
            // The video_url should persist from the initial load.
            const moduleToSave = {
                slug: module.slug,
                title: module.title,
                steps: module.steps,
                transcript: module.transcript,
                video_url: module.video_url,
                metadata: module.metadata,
                user_id: user.uid,
                created_at: module.created_at,
            };
            const savedModule = await (0, moduleService_1.saveModule)({
                moduleData: moduleToSave,
                videoFile: null
            });
            await queryClient.invalidateQueries({ queryKey: ['module', savedModule.slug] });
            await queryClient.invalidateQueries({ queryKey: ['modules'] });
            addToast('success', 'Module Saved', 'Your changes have been successfully saved.');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Could not save module.";
            addToast('error', 'Save Failed', errorMessage);
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleDelete = async () => {
        if (!module?.slug)
            return;
        const confirmed = window.confirm('Are you sure you want to delete this module? This action is irreversible and will delete all associated session data and suggestions.');
        if (confirmed) {
            setIsDeleting(true);
            try {
                await (0, moduleService_1.deleteModule)(module.slug);
                await queryClient.invalidateQueries({ queryKey: ['modules'] });
                addToast('success', 'Module Deleted', `The module "${module.title}" has been removed.`);
                navigate('/');
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Could not delete module.';
                addToast('error', 'Deletion Failed', errorMessage);
            }
            finally {
                setIsDeleting(false);
            }
        }
    };
    if (isLoading || !module) {
        return (<div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900">
                <p className="text-xl text-slate-700 dark:text-slate-300">Loading Module for Editing...</p>
            </div>);
    }
    return (<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 h-screen">
            <div className="lg:col-span-2 flex flex-col h-full">
                <header className="flex-shrink-0 flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit: {module.title}</h1>
                    <div className="flex items-center gap-4">
                        <react_router_dom_1.Link to={`/modules/${module.slug}`} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                            Go to Training Page
                        </react_router_dom_1.Link>
                        <button onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors disabled:bg-slate-400">
                            <Icons_1.TrashIcon className="h-5 w-5"/>
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                        <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-slate-400">
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto">
                    <ModuleEditor_1.ModuleEditor module={module} onModuleChange={setModule} traineeSuggestions={pendingTraineeSuggestions} aiSuggestions={aiSuggestions} checkpointResponses={checkpointResponses} onAcceptSuggestion={handleSuggestionAccept} onRejectSuggestion={handleSuggestionReject} isAdmin={isAdmin} currentTime={currentTime} onSeek={handleSeek} initialFocusStepIndex={initialFocusStepIndex}/>
                </div>
            </div>
            <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl flex flex-col h-full overflow-hidden">
                <h2 className="text-lg font-bold p-4 border-b border-slate-200 dark:border-slate-700">Video Preview</h2>
                <div className="flex-1 bg-slate-900 flex items-center justify-center">
                    {!publicVideoUrl && !isLoadingVideo && (<div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900">
                            <Icons_1.VideoIcon className="h-16 w-16 text-slate-400 dark:text-slate-600"/>
                            <p className="mt-4 text-slate-500">No video provided for this module.</p>
                        </div>)}
                    {isLoadingVideo && (<div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
                            <Icons_1.SparklesIcon className="h-12 w-12 text-indigo-400 animate-pulse"/>
                            <p className="mt-4 text-slate-500">Verifying video...</p>
                        </div>)}
                    {isVideoError && (<div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
                            <Icons_1.AlertTriangleIcon className="h-12 w-12 text-red-500 mb-4"/>
                            <p className="text-red-500 text-center">Could not load the video. The path might be missing or incorrect.</p>
                            <button onClick={retryVideoUrl} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg flex items-center gap-2">
                                <Icons_1.RefreshCwIcon className="h-5 w-5"/> Try Again
                            </button>
                        </div>)}
                    {publicVideoUrl && (<VideoPlayer_1.VideoPlayer ref={videoRef} video_url={publicVideoUrl} onTimeUpdate={setCurrentTime}/>)}
                </div>
            </div>
        </div>);
};
exports.default = EditPage;
