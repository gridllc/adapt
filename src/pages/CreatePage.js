import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getTranscriptWithConfidence, generateModuleFromContext, generateModuleFromModelNumber } from '@/services/geminiService';
import { uploadManualForProcessing } from '@/services/manualService';
import { saveModule } from '@/services/moduleService';
import { ModuleEditor } from '@/components/ModuleEditor';
import { TranscriptEditor } from '@/components/TranscriptEditor';
import { UploadCloudIcon, XIcon, SparklesIcon, VideoIcon, FileTextIcon, ArrowLeftIcon, TvIcon, FileJsonIcon } from '@/components/Icons';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { VideoPlayer } from '@/components/VideoPlayer';
// Hook to prompt user to save as routine
const useRoutinePrompt = (onConfirm) => {
    const [showPrompt, setShowPrompt] = useState(false);
    const triggerPrompt = () => setShowPrompt(true);
    const cancelPrompt = () => setShowPrompt(false);
    const confirmPrompt = () => {
        setShowPrompt(false);
        onConfirm();
    };
    return { showPrompt, triggerPrompt, cancelPrompt, confirmPrompt };
};
// Defaults for AI context when creating modules from scratch
const DEFAULT_TEMPLATE_ID = 'generic-template';
const DEFAULT_INTENT = 'general-training';
const CreatePage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { isAuthenticated, user } = useAuth();
    const { addToast } = useToast();
    // --- Core state ---
    const [creationMode, setCreationMode] = useState('selection');
    const [isDragging, setIsDragging] = useState(false);
    // --- Flow State (shared across modes) ---
    const [flowStep, setFlowStep] = useState('initial');
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [manualFile, setManualFile] = useState(null);
    const [videoFile, setVideoFile] = useState(null);
    const [videoUrl, setVideoUrl] = useState(null);
    const [videoMetadata, setVideoMetadata] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [editedTranscript, setEditedTranscript] = useState([]);
    const [generatedModule, setGeneratedModule] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    // Routine prompt hook
    const { showPrompt, triggerPrompt, cancelPrompt, confirmPrompt } = useRoutinePrompt(() => {
        // TODO: In a future step, this could navigate to a routine editor pre-filled with this module's data.
        addToast('success', 'Routine Saved', 'This module has been saved as a reusable routine.');
    });
    // --- Refs and state for video player integration ---
    const videoRef = useRef(null);
    const [currentTime, setCurrentTime] = useState(0);
    const videoBlobUrlRef = useRef(null);
    useEffect(() => {
        if (!isAuthenticated)
            navigate('/login');
    }, [isAuthenticated, navigate]);
    useEffect(() => {
        const urlToClean = videoBlobUrlRef.current;
        return () => { if (urlToClean)
            URL.revokeObjectURL(urlToClean); };
    }, []);
    const resetForm = useCallback(() => {
        if (videoBlobUrlRef.current)
            URL.revokeObjectURL(videoBlobUrlRef.current);
        videoBlobUrlRef.current = null;
        setFlowStep('initial');
        setTitle('');
        setNotes('');
        setVideoFile(null);
        setVideoUrl(null);
        setVideoMetadata(null);
        setAnalysisResult(null);
        setGeneratedModule(null);
        setEditedTranscript([]);
        setIsSaving(false);
        setBrand('');
        setModel('');
        setManualFile(null);
    }, []);
    const handleBackToSelection = () => {
        resetForm();
        setCreationMode('selection');
    };
    // --- Module Upload Logic ---
    const handleModuleUpload = useCallback(async (file) => {
        if (!user) {
            addToast('error', 'Authentication Error', 'You must be logged in to upload a module.');
            return;
        }
        if (file.type !== 'application/json') {
            addToast('error', 'Invalid File', 'Please upload a .json file.');
            return;
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string')
                    throw new Error("Could not read file.");
                const moduleData = JSON.parse(text);
                const savedModule = await saveModule({ moduleData: { ...moduleData, user_id: user.uid } });
                await queryClient.invalidateQueries({ queryKey: ['modules'] });
                addToast('success', 'Upload Complete', `Module "${savedModule.title}" was imported.`);
                navigate(`/modules/${savedModule.slug}/edit`);
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to parse or save the module file.';
                addToast('error', 'Upload Failed', errorMessage);
            }
        };
        reader.onerror = () => addToast('error', 'Read Error', 'Could not read the selected file.');
        reader.readAsText(file);
    }, [navigate, queryClient, addToast, user]);
    // --- AI Video Processing Logic ---
    const processVideoFile = useCallback((file) => {
        if (!file.type.startsWith('video/')) {
            addToast('error', 'Invalid File Type', 'Please upload a video file.');
            return;
        }
        if (videoBlobUrlRef.current)
            URL.revokeObjectURL(videoBlobUrlRef.current);
        const newUrl = URL.createObjectURL(file);
        videoBlobUrlRef.current = newUrl;
        setVideoUrl(newUrl);
        setVideoFile(file);
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.onloadedmetadata = () => setVideoMetadata({ originalName: file.name, size: file.size, duration: Math.round(v.duration), width: v.videoWidth, height: v.videoHeight });
        v.onerror = () => addToast('error', 'Metadata Error', 'Could not read metadata from the video file.');
        v.src = newUrl;
    }, [addToast]);
    // --- Centralized File Handling ---
    const handleFileSelected = useCallback((file) => {
        if (!file)
            return;
        switch (creationMode) {
            case 'video':
                processVideoFile(file);
                break;
            case 'manual':
                setManualFile(file);
                break;
            case 'jsonUpload':
                handleModuleUpload(file);
                break;
            default:
                addToast('error', 'Invalid Action', 'File handling is not available in this context.');
        }
    }, [creationMode, processVideoFile, handleModuleUpload, addToast]);
    const handleFileChange = (event) => {
        handleFileSelected(event.target.files?.[0]);
    };
    const handleDrop = useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        handleFileSelected(event.dataTransfer.files?.[0]);
    }, [handleFileSelected]);
    const handleDragEvents = {
        onDragOver: (e) => { e.preventDefault(); e.stopPropagation(); },
        onDragEnter: (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); },
        onDragLeave: (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); },
    };
    const handleAnalyzeVideo = async () => {
        if (!videoFile || !title.trim()) {
            addToast('error', 'Input Required', 'Please provide a title and a video file.');
            return;
        }
        setFlowStep('analyzing');
        try {
            addToast('info', 'Analyzing Video...', 'AI is transcribing. This may take a moment.');
            const result = await getTranscriptWithConfidence(videoFile);
            setAnalysisResult(result);
            setEditedTranscript(result.transcript);
            addToast('success', 'Analysis Complete', `AI confidence: ${(result.confidence * 100).toFixed(0)}%`);
            setFlowStep('review');
        }
        catch (err) {
            addToast('error', 'Analysis Failed', err instanceof Error ? err.message : 'An unknown error occurred.');
            setFlowStep('initial');
        }
    };
    const handleGenerateModule = async () => {
        if (!analysisResult || !title || !videoFile)
            return;
        setFlowStep('generating');
        try {
            const transcriptText = editedTranscript.map(line => line.text).join('\n');
            const moduleData = await generateModuleFromContext({ title, transcript: transcriptText, notes, confidence: analysisResult.confidence });
            const timedModuleData = { ...moduleData, steps: moduleData.steps.map((step) => ({ ...step, start: editedTranscript.find(l => l.text.includes(step.title) || step.description.includes(l.text.substring(0, 30)))?.start ?? 0, end: editedTranscript.find(l => l.text.includes(step.title) || step.description.includes(l.text.substring(0, 30)))?.end ?? 0 })) };
            setGeneratedModule({ ...timedModuleData, transcript: editedTranscript, created_at: new Date().toISOString(), metadata: { is_ai_generated: true, templateId: DEFAULT_TEMPLATE_ID, intent: DEFAULT_INTENT }, user_id: user?.uid ?? null, video_url: null });
            setFlowStep('final');
            triggerPrompt();
            addToast('success', 'Module Generated', 'Review the final draft and save!');
        }
        catch (err) {
            addToast('error', 'Generation Failed', err instanceof Error ? err.message : 'An unknown error occurred.');
            setFlowStep('review');
        }
    };
    const handleGenerateFromModel = async () => {
        if (!brand.trim() || !model.trim()) {
            addToast('error', 'Input Required', 'Please provide a brand and model.');
            return;
        }
        setFlowStep('generating');
        try {
            addToast('info', 'Searching for Device...', 'AI is generating steps from the model number.');
            const moduleData = await generateModuleFromModelNumber(brand, model);
            setGeneratedModule({ ...moduleData, transcript: [], created_at: new Date().toISOString(), metadata: { is_ai_generated: true, source_model: `${brand} ${model}`, templateId: DEFAULT_TEMPLATE_ID, intent: DEFAULT_INTENT }, user_id: user?.uid ?? null, video_url: null });
            setFlowStep('final');
            triggerPrompt();
            addToast('success', 'Module Generated', 'Review the AI-generated steps.');
        }
        catch (err) {
            addToast('error', 'Generation Failed', err instanceof Error ? err.message : 'An unknown error occurred.');
            setFlowStep('initial');
        }
    };
    const handleManualUpload = async () => {
        if (!manualFile) {
            addToast('error', 'File Required', 'Please select a manual file to upload.');
            return;
        }
        setFlowStep('generating');
        try {
            addToast('info', 'Uploading Manual...', 'Your file is being securely uploaded.');
            await uploadManualForProcessing(manualFile);
            addToast('success', 'Upload Complete!', 'Your manual has been submitted. This feature is in development, and the AI will be able to use it soon.');
            setTimeout(() => { resetForm(); setCreationMode('selection'); }, 2000);
        }
        catch (err) {
            addToast('error', 'Upload Failed', err instanceof Error ? err.message : 'Could not upload the manual.');
            setFlowStep('initial');
        }
    };
    const handleSave = async () => {
        if (!generatedModule || !user)
            return;
        setIsSaving(true);
        try {
            const moduleToSave = { slug: generatedModule.slug, title: generatedModule.title, steps: generatedModule.steps, transcript: generatedModule.transcript, video_url: videoFile ? '' : null, metadata: { ...(videoFile ? videoMetadata : {}), ...(generatedModule.metadata || {}) }, user_id: user.uid };
            const savedModule = await saveModule({ moduleData: moduleToSave, videoFile });
            await queryClient.invalidateQueries({ queryKey: ['module', savedModule.slug], exact: true });
            await queryClient.invalidateQueries({ queryKey: ['modules'], exact: true });
            addToast('success', 'Module Saved', `Navigating to new training: "${savedModule.title}"`);
            navigate(`/modules/${savedModule.slug}`);
        }
        catch (err) {
            addToast('error', 'Save Failed', err instanceof Error ? err.message : 'Could not save the module.');
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleSeek = useCallback((time) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            videoRef.current.play().catch(console.error);
        }
    }, []);
    const handleTranscriptChange = useCallback((index, newText) => {
        setEditedTranscript(prev => prev.map((line, i) => i === index ? { ...line, text: newText } : line));
    }, []);
    // --- RENDER FUNCTIONS ---
    const renderSelection = () => (_jsxs("div", { className: "max-w-4xl mx-auto animate-fade-in-up", children: [_jsx("h2", { className: "text-3xl font-bold text-center text-slate-900 dark:text-white mb-2", children: "How do you want to create?" }), _jsx("p", { className: "text-slate-500 dark:text-slate-400 text-center mb-8", children: "Choose one of the AI-powered methods below." }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [_jsxs("button", { onClick: () => setCreationMode('video'), className: "p-6 bg-white dark:bg-slate-800 rounded-xl text-center hover:ring-2 hover:ring-indigo-500 transition-all transform hover:-translate-y-1 shadow-md hover:shadow-xl", children: [_jsx(VideoIcon, { className: "h-10 w-10 mx-auto text-indigo-500 mb-3" }), _jsx("h3", { className: "font-bold text-lg", children: "From Video" }), _jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400", children: "Upload a video for transcription and step generation." })] }), _jsxs("button", { onClick: () => setCreationMode('model'), className: "p-6 bg-white dark:bg-slate-800 rounded-xl text-center hover:ring-2 hover:ring-indigo-500 transition-all transform hover:-translate-y-1 shadow-md hover:shadow-xl", children: [_jsx(TvIcon, { className: "h-10 w-10 mx-auto text-indigo-500 mb-3" }), _jsx("h3", { className: "font-bold text-lg", children: "From Device Model" }), _jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400", children: "Provide a model number for AI to find instructions." })] }), _jsxs("button", { onClick: () => setCreationMode('manual'), className: "p-6 bg-white dark:bg-slate-800 rounded-xl text-center hover:ring-2 hover:ring-indigo-500 transition-all transform hover:-translate-y-1 shadow-md hover:shadow-xl", children: [_jsx(FileTextIcon, { className: "h-10 w-10 mx-auto text-indigo-500 mb-3" }), _jsx("h3", { className: "font-bold text-lg", children: "From a Manual" }), _jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400", children: "Upload a document for the AI to learn from." })] }), _jsxs("button", { onClick: () => setCreationMode('jsonUpload'), className: "p-6 bg-white dark:bg-slate-800 rounded-xl text-center hover:ring-2 hover:ring-indigo-500 transition-all transform hover:-translate-y-1 shadow-md hover:shadow-xl", children: [_jsx(FileJsonIcon, { className: "h-10 w-10 mx-auto text-indigo-500 mb-3" }), _jsx("h3", { className: "font-bold text-lg", children: "Upload Existing" }), _jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400", children: "Import a previously exported `.json` module file." })] })] })] }));
    const renderVideoInitial = () => (_jsxs("div", { className: "bg-slate-100 dark:bg-slate-800 p-8 rounded-2xl shadow-xl animate-fade-in-up", children: [_jsx("h2", { className: "text-2xl font-bold text-indigo-500 dark:text-indigo-400 mb-6 text-center", children: "1. Create from Video" }), _jsxs("div", { className: "max-w-2xl mx-auto space-y-6", children: [_jsx("input", { type: "text", value: title, onChange: (e) => setTitle(e.target.value), placeholder: "Training Title (e.g., How to Make a Sandwich)", className: "w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" }), videoFile && videoUrl ? (_jsxs("div", { children: [_jsxs("div", { className: "bg-slate-200 dark:bg-slate-900/50 p-3 rounded-lg flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(VideoIcon, { className: "h-6 w-6 text-indigo-500" }), _jsx("span", { className: "text-sm font-medium truncate", children: videoFile.name })] }), _jsx("button", { onClick: () => { setVideoFile(null); setVideoUrl(null); if (videoBlobUrlRef.current)
                                            URL.revokeObjectURL(videoBlobUrlRef.current); videoBlobUrlRef.current = null; }, className: "p-1 text-slate-500", children: _jsx(XIcon, { className: "h-5 w-5" }) })] }), _jsx("div", { className: "mt-4 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700", children: _jsx(VideoPlayer, { video_url: videoUrl, onTimeUpdate: () => { } }) })] })) : (_jsxs("label", { onDrop: handleDrop, ...handleDragEvents, className: `flex flex-col items-center justify-center w-full h-40 px-4 transition bg-white dark:bg-slate-900 border-2 ${isDragging ? 'border-indigo-400' : 'border-slate-300 dark:border-slate-700'} border-dashed rounded-md cursor-pointer hover:border-indigo-500`, children: [_jsx(UploadCloudIcon, { className: `w-10 h-10 ${isDragging ? 'text-indigo-400' : 'text-slate-400'}` }), _jsx("p", { className: "font-medium mt-2", children: "Click to upload or drag & drop a video" }), _jsx("input", { type: "file", className: "hidden", accept: "video/*", onChange: handleFileChange })] })), _jsx("textarea", { value: notes, onChange: (e) => setNotes(e.target.value), placeholder: "Additional Notes for AI (Optional)", className: "w-full h-24 p-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" }), _jsx("div", { className: "text-center pt-2", children: _jsxs("button", { onClick: handleAnalyzeVideo, disabled: !videoFile || !title.trim(), className: "bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors transform hover:scale-105 flex items-center justify-center gap-2", children: [_jsx(SparklesIcon, { className: "h-6 w-6" }), "Analyze & Transcribe"] }) })] })] }));
    const renderVideoReview = () => (_jsxs("div", { className: "animate-fade-in-up", children: [_jsx("h2", { className: "text-2xl font-bold text-center text-indigo-500 dark:text-indigo-400 mb-6", children: "2. Review AI Transcript" }), analysisResult && videoUrl && (_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-8", children: [_jsx("div", { className: "lg:col-span-1 lg:sticky top-6 space-y-4", children: _jsx(VideoPlayer, { ref: videoRef, video_url: videoUrl, onTimeUpdate: setCurrentTime }) }), _jsx("div", { className: "lg:col-span-2 bg-slate-100 dark:bg-slate-800 p-4 rounded-lg h-[70vh]", children: _jsx(TranscriptEditor, { transcript: editedTranscript, currentTime: currentTime, onSeek: handleSeek, onTranscriptChange: handleTranscriptChange }) })] })), _jsxs("div", { className: "mt-8 flex justify-center gap-4", children: [_jsx("button", { onClick: () => setFlowStep('initial'), className: "bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors", children: "Back" }), _jsxs("button", { onClick: handleGenerateModule, className: "bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors transform hover:scale-105 flex items-center justify-center gap-2", children: [_jsx(SparklesIcon, { className: "h-6 w-6" }), "Create Steps from Transcript"] })] })] }));
    const renderFinal = () => (_jsxs("div", { className: "animate-fade-in-up", children: [_jsx("h2", { className: "text-2xl font-bold text-center text-indigo-500 dark:text-indigo-400 mb-6", children: "3. Finalize Your Module" }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-8 items-start", children: [_jsx("div", { className: "lg:sticky top-6", children: videoUrl && _jsx(VideoPlayer, { ref: videoRef, video_url: videoUrl, onTimeUpdate: setCurrentTime }) }), _jsx("div", { children: generatedModule && _jsx(ModuleEditor, { module: generatedModule, onModuleChange: setGeneratedModule, isAdmin: true, currentTime: currentTime, onSeek: handleSeek }) })] }), _jsxs("div", { className: "mt-8 flex justify-center gap-4", children: [_jsx("button", { onClick: handleBackToSelection, className: "bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors", disabled: isSaving, children: "Start Over" }), _jsx("button", { onClick: handleSave, className: "bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg disabled:bg-slate-500", disabled: isSaving, children: isSaving ? 'Saving...' : 'Save Module' })] })] }));
    const renderVideoFlow = () => {
        switch (flowStep) {
            case 'initial': return renderVideoInitial();
            case 'review': return renderVideoReview();
            default: return null; // 'final' is handled by the main renderContent
        }
    };
    const renderModelFlow = () => (_jsxs("div", { className: "bg-slate-100 dark:bg-slate-800 p-8 rounded-2xl shadow-xl animate-fade-in-up max-w-2xl mx-auto", children: [_jsx("h2", { className: "text-2xl font-bold text-indigo-500 dark:text-indigo-400 mb-2 text-center", children: "Create from Device Model" }), _jsx("p", { className: "text-slate-600 dark:text-slate-300 mb-6 text-center", children: "The AI will search the web for your device and generate steps." }), _jsxs("div", { className: "space-y-4", children: [_jsx("input", { type: "text", value: brand, onChange: e => setBrand(e.target.value), placeholder: "Brand (e.g., LG)", className: "w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" }), _jsx("input", { type: "text", value: model, onChange: e => setModel(e.target.value), placeholder: "Model (e.g., MR20GA)", className: "w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" })] }), _jsx("div", { className: "mt-8 text-center", children: _jsxs("button", { onClick: handleGenerateFromModel, disabled: !brand.trim() || !model.trim(), className: "bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors transform hover:scale-105 flex items-center justify-center gap-2", children: [_jsx(SparklesIcon, { className: "h-6 w-6" }), "Generate Steps"] }) })] }));
    const renderManualFlow = () => (_jsxs("div", { className: "bg-slate-100 dark:bg-slate-800 p-8 rounded-2xl shadow-xl animate-fade-in-up max-w-2xl mx-auto", children: [_jsx("h2", { className: "text-2xl font-bold text-indigo-500 dark:text-indigo-400 mb-2 text-center", children: "Create from Manual" }), _jsx("p", { className: "text-slate-600 dark:text-slate-300 mb-6 text-center", children: "Upload a PDF, DOCX, or TXT file. The AI will learn its contents to provide expert guidance." }), manualFile ? (_jsxs("div", { className: "bg-slate-200 dark:bg-slate-900/50 p-3 rounded-lg flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(FileTextIcon, { className: "h-6 w-6 text-indigo-500" }), _jsx("span", { className: "text-sm font-medium", children: manualFile.name })] }), _jsx("button", { onClick: () => setManualFile(null), className: "p-1 text-slate-500", children: _jsx(XIcon, { className: "h-5 w-5" }) })] })) : (_jsxs("label", { onDrop: handleDrop, ...handleDragEvents, className: `flex flex-col items-center justify-center w-full h-40 px-4 transition bg-white dark:bg-slate-900 border-2 ${isDragging ? 'border-indigo-400' : 'border-slate-300 dark:border-slate-700'} border-dashed rounded-md cursor-pointer hover:border-indigo-500`, children: [_jsx(UploadCloudIcon, { className: `w-10 h-10 ${isDragging ? 'text-indigo-400' : 'text-slate-400'}` }), _jsx("p", { className: "font-medium mt-2", children: "Click to upload or drag & drop" }), _jsx("p", { className: "text-xs text-slate-500", children: "PDF, DOCX, or TXT" }), _jsx("input", { type: "file", className: "hidden", accept: ".pdf,.doc,.docx,.txt", onChange: handleFileChange })] })), _jsx("div", { className: "mt-8 text-center", children: _jsxs("button", { onClick: handleManualUpload, disabled: !manualFile, className: "bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors transform hover:scale-105 flex items-center justify-center gap-2", children: [_jsx(UploadCloudIcon, { className: "h-6 w-6" }), "Upload for Processing"] }) })] }));
    const renderJsonUploadFlow = () => (_jsxs("div", { className: "bg-slate-100 dark:bg-slate-800 p-8 rounded-2xl shadow-xl animate-fade-in-up max-w-2xl mx-auto", children: [_jsx("h2", { className: "text-2xl font-bold text-indigo-500 dark:text-indigo-400 mb-2 text-center", children: "Upload Existing Module" }), _jsx("p", { className: "text-slate-600 dark:text-slate-300 mb-6 text-center", children: "Upload a previously exported `.json` module file to add it to the platform." }), _jsxs("label", { onDrop: handleDrop, ...handleDragEvents, className: `flex flex-col items-center justify-center w-full h-48 px-4 transition bg-white dark:bg-slate-900 border-2 ${isDragging ? 'border-indigo-400' : 'border-slate-300 dark:border-slate-700'} border-dashed rounded-md cursor-pointer hover:border-indigo-500`, children: [_jsx(UploadCloudIcon, { className: `w-12 h-12 ${isDragging ? 'text-indigo-400' : 'text-slate-400'}` }), _jsx("p", { className: "font-medium mt-2", children: "Drop a .json file here, or click to upload" }), _jsx("input", { type: "file", className: "hidden", accept: "application/json", onChange: handleFileChange })] })] }));
    const renderContent = () => {
        if (flowStep === 'generating' || flowStep === 'analyzing') {
            return _jsxs("div", { className: "text-center p-8", children: [_jsx(SparklesIcon, { className: "h-12 w-12 mx-auto text-indigo-500 animate-pulse" }), _jsx("p", { className: "mt-4 text-lg", children: "AI is working its magic..." })] });
        }
        if (flowStep === 'final')
            return renderFinal();
        switch (creationMode) {
            case 'selection': return renderSelection();
            case 'video': return renderVideoFlow();
            case 'model': return renderModelFlow();
            case 'manual': return renderManualFlow();
            case 'jsonUpload': return renderJsonUploadFlow();
            default: return renderSelection();
        }
    };
    return (_jsxs("div", { className: "p-6", children: [_jsxs("header", { className: "flex justify-between items-center mb-6", children: [_jsx("div", { className: "w-40", children: creationMode !== 'selection' && _jsxs("button", { onClick: handleBackToSelection, className: "flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-500", children: [_jsx(ArrowLeftIcon, { className: "h-4 w-4" }), " Back to selection"] }) }), _jsx("h1", { className: "text-3xl font-bold text-slate-900 dark:text-white text-center", children: "Create Custom Module" }), _jsx("span", { className: "w-40" })] }), renderContent(), showPrompt && (_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4", onClick: cancelPrompt, children: _jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center animate-fade-in-up", onClick: (e) => e.stopPropagation(), children: [_jsx(SparklesIcon, { className: "h-12 w-12 mx-auto text-indigo-500 mb-4" }), _jsx("h2", { className: "text-2xl font-bold text-slate-900 dark:text-white", children: "Save as a Routine?" }), _jsx("p", { className: "text-slate-600 dark:text-slate-300 mt-2 mb-6", children: "Would you like to save this process as a reusable routine for quick access later? (e.g., \"Watch ESPN\")" }), _jsxs("div", { className: "flex justify-center gap-4", children: [_jsx("button", { onClick: cancelPrompt, className: "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold py-2 px-6 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600", children: "Maybe Later" }), _jsx("button", { onClick: confirmPrompt, className: "bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700", children: "Save as Routine" })] })] }) }))] }));
};
export default CreatePage;
//# sourceMappingURL=CreatePage.js.map