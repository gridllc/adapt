import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getModule, saveModule, deleteModule } from '@/services/moduleService';
import { getTraineeSuggestionsForModule, deleteTraineeSuggestion, getAiSuggestionsForModule } from '@/services/suggestionsService';
import { getCheckpointResponsesForModule } from '@/services/checkpointService';
import { ModuleEditor } from '@/components/ModuleEditor';
import { VideoPlayer } from '@/components/VideoPlayer';
import { TrashIcon, VideoIcon, AlertTriangleIcon, RefreshCwIcon, SparklesIcon } from '@/components/Icons';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useSafeVideoUrl } from '@/hooks/useSafeVideoUrl';
const EditPage = () => {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const { isAuthenticated, user } = useAuth();
    const { addToast } = useToast();
    const [module, setModule] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const isAdmin = !!user;
    const [initialFocusStepIndex, setInitialFocusStepIndex] = useState();
    const videoRef = useRef(null);
    const [currentTime, setCurrentTime] = useState(0);
    const { data: initialModuleData, isLoading, isError: isModuleError, error: queryError } = useQuery({
        queryKey: ['module', moduleId],
        queryFn: () => getModule(moduleId),
        enabled: !!moduleId,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });
    const videoPath = useMemo(() => {
        // With the new GCS implementation, initialModuleData.video_url directly stores the GCS file path.
        return initialModuleData?.video_url || null;
    }, [initialModuleData?.video_url]);
    const { videoUrl: publicVideoUrl, isLoading: isLoadingVideo, isError: isVideoError, retry: retryVideoUrl, } = useSafeVideoUrl(videoPath);
    const { data: traineeSuggestions = [] } = useQuery({
        queryKey: ['traineeSuggestions', moduleId],
        queryFn: () => getTraineeSuggestionsForModule(moduleId),
        enabled: !!moduleId && isAdmin,
    });
    const { data: aiSuggestions = [] } = useQuery({
        queryKey: ['aiSuggestions', moduleId],
        queryFn: () => getAiSuggestionsForModule(moduleId),
        enabled: !!moduleId && isAdmin,
    });
    const { data: checkpointResponses = [] } = useQuery({
        queryKey: ['checkpointResponses', moduleId],
        queryFn: () => getCheckpointResponsesForModule(moduleId),
        enabled: !!moduleId && isAdmin,
    });
    // TODO: Re-implement realtime updates using Firebase (e.g., Firestore onSnapshot).
    // The previous implementation using Supabase channels has been removed.
    // useEffect(() => {
    //     ...
    // }, [moduleId, queryClient, addToast]);
    const pendingTraineeSuggestions = useMemo(() => {
        return traineeSuggestions.filter((s) => s.status === 'pending');
    }, [traineeSuggestions]);
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);
    useEffect(() => {
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
    useEffect(() => {
        if (!isLoading && (isModuleError || !initialModuleData)) {
            console.error(`Failed to load module for editing: ${moduleId}`, queryError);
            navigate('/not-found');
        }
    }, [isLoading, isModuleError, initialModuleData, moduleId, navigate, queryError]);
    const handleSeek = useCallback((time) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            if (videoRef.current.paused) {
                videoRef.current.play().catch(console.error);
            }
        }
    }, []);
    const handleSuggestionAccept = useCallback(async (suggestion) => {
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
                await deleteTraineeSuggestion(suggestion.id);
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
            await deleteTraineeSuggestion(suggestionId);
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
            const savedModule = await saveModule({
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
                await deleteModule(module.slug);
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
        return (_jsx("div", { className: "flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900", children: _jsx("p", { className: "text-xl text-slate-700 dark:text-slate-300", children: "Loading Module for Editing..." }) }));
    }
    return (_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 h-screen", children: [_jsxs("div", { className: "lg:col-span-2 flex flex-col h-full", children: [_jsxs("header", { className: "flex-shrink-0 flex justify-between items-center mb-4", children: [_jsxs("h1", { className: "text-2xl font-bold text-slate-900 dark:text-white", children: ["Edit: ", module.title] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx(Link, { to: `/modules/${module.slug}`, className: "text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline", children: "Go to Training Page" }), _jsxs("button", { onClick: handleDelete, disabled: isDeleting, className: "bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors disabled:bg-slate-400", children: [_jsx(TrashIcon, { className: "h-5 w-5" }), isDeleting ? 'Deleting...' : 'Delete'] }), _jsx("button", { onClick: handleSave, disabled: isSaving, className: "bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-slate-400", children: isSaving ? 'Saving...' : 'Save Changes' })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto", children: _jsx(ModuleEditor, { module: module, onModuleChange: setModule, traineeSuggestions: pendingTraineeSuggestions, aiSuggestions: aiSuggestions, checkpointResponses: checkpointResponses, onAcceptSuggestion: handleSuggestionAccept, onRejectSuggestion: handleSuggestionReject, isAdmin: isAdmin, currentTime: currentTime, onSeek: handleSeek, initialFocusStepIndex: initialFocusStepIndex }) })] }), _jsxs("div", { className: "lg:col-span-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl flex flex-col h-full overflow-hidden", children: [_jsx("h2", { className: "text-lg font-bold p-4 border-b border-slate-200 dark:border-slate-700", children: "Video Preview" }), _jsxs("div", { className: "flex-1 bg-slate-900 flex items-center justify-center", children: [!publicVideoUrl && !isLoadingVideo && (_jsxs("div", { className: "w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900", children: [_jsx(VideoIcon, { className: "h-16 w-16 text-slate-400 dark:text-slate-600" }), _jsx("p", { className: "mt-4 text-slate-500", children: "No video provided for this module." })] })), isLoadingVideo && (_jsxs("div", { className: "w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 p-4", children: [_jsx(SparklesIcon, { className: "h-12 w-12 text-indigo-400 animate-pulse" }), _jsx("p", { className: "mt-4 text-slate-500", children: "Verifying video..." })] })), isVideoError && (_jsxs("div", { className: "w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 p-4", children: [_jsx(AlertTriangleIcon, { className: "h-12 w-12 text-red-500 mb-4" }), _jsx("p", { className: "text-red-500 text-center", children: "Could not load the video. The path might be missing or incorrect." }), _jsxs("button", { onClick: retryVideoUrl, className: "mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg flex items-center gap-2", children: [_jsx(RefreshCwIcon, { className: "h-5 w-5" }), " Try Again"] })] })), publicVideoUrl && (_jsx(VideoPlayer, { ref: videoRef, video_url: publicVideoUrl, onTimeUpdate: setCurrentTime }))] })] })] }));
};
export default EditPage;
//# sourceMappingURL=EditPage.js.map