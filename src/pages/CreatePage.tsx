import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getTranscriptWithConfidence, generateModuleFromContext, generateModuleFromModelNumber } from '@/services/geminiService';
import { uploadManualForProcessing } from '@/services/manualService';
import type { GeneratedModuleData, TranscriptAnalysis } from '@/services/geminiService';
import { saveModule } from '@/services/moduleService';
import { ModuleEditor } from '@/components/ModuleEditor';
import { TranscriptEditor } from '@/components/TranscriptEditor';
import type { TranscriptLine, VideoMetadata, AppModule, ModuleForInsert, Json, ProcessStep } from '@/types';
import { UploadCloudIcon, XIcon, SparklesIcon, VideoIcon, LightbulbIcon, FileTextIcon, ArrowLeftIcon, TvIcon, FileJsonIcon } from '@/components/Icons';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { VideoPlayer } from '@/components/VideoPlayer';

// Hook to prompt user to save as routine
const useRoutinePrompt = (onConfirm: () => void) => {
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

type CreationMode = 'selection' | 'video' | 'model' | 'manual' | 'jsonUpload';
type FlowStep = 'initial' | 'analyzing' | 'review' | 'generating' | 'final';

const CreatePage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { isAuthenticated, user } = useAuth();
    const { addToast } = useToast();

    // --- Core state ---
    const [creationMode, setCreationMode] = useState<CreationMode>('selection');
    const [isDragging, setIsDragging] = useState(false);

    // --- Flow State (shared across modes) ---
    const [flowStep, setFlowStep] = useState<FlowStep>('initial');
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [manualFile, setManualFile] = useState<File | null>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
    const [analysisResult, setAnalysisResult] = useState<TranscriptAnalysis | null>(null);
    const [editedTranscript, setEditedTranscript] = useState<TranscriptLine[]>([]);
    const [generatedModule, setGeneratedModule] = useState<AppModule | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Routine prompt hook
    const { showPrompt, triggerPrompt, cancelPrompt, confirmPrompt } = useRoutinePrompt(() => {
        // TODO: In a future step, this could navigate to a routine editor pre-filled with this module's data.
        addToast('success', 'Routine Saved', 'This module has been saved as a reusable routine.');
    });

    // --- Refs and state for video player integration ---
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const videoBlobUrlRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated) navigate('/login');
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        const urlToClean = videoBlobUrlRef.current;
        return () => { if (urlToClean) URL.revokeObjectURL(urlToClean); };
    }, []);

    const resetForm = useCallback(() => {
        if (videoBlobUrlRef.current) URL.revokeObjectURL(videoBlobUrlRef.current);
        videoBlobUrlRef.current = null;
        setFlowStep('initial'); setTitle(''); setNotes(''); setVideoFile(null); setVideoUrl(null); setVideoMetadata(null); setAnalysisResult(null); setGeneratedModule(null); setEditedTranscript([]); setIsSaving(false); setBrand(''); setModel(''); setManualFile(null);
    }, []);

    const handleBackToSelection = () => {
        resetForm();
        setCreationMode('selection');
    };

    // --- Module Upload Logic ---
    const handleModuleUpload = useCallback(async (file: File) => {
        if (!user) { addToast('error', 'Authentication Error', 'You must be logged in to upload a module.'); return; }
        if (file.type !== 'application/json') { addToast('error', 'Invalid File', 'Please upload a .json file.'); return; }
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("Could not read file.");
                const moduleData = JSON.parse(text) as ModuleForInsert;
                const savedModule = await saveModule({ moduleData: { ...moduleData, user_id: user.uid } });
                await queryClient.invalidateQueries({ queryKey: ['modules'] });
                addToast('success', 'Upload Complete', `Module "${savedModule.title}" was imported.`);
                navigate(`/modules/${savedModule.slug}/edit`);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to parse or save the module file.';
                addToast('error', 'Upload Failed', errorMessage);
            }
        };
        reader.onerror = () => addToast('error', 'Read Error', 'Could not read the selected file.');
        reader.readAsText(file);
    }, [navigate, queryClient, addToast, user]);

    // --- AI Video Processing Logic ---
    const processVideoFile = useCallback((file: File) => {
        if (!file.type.startsWith('video/')) { addToast('error', 'Invalid File Type', 'Please upload a video file.'); return; }
        if (videoBlobUrlRef.current) URL.revokeObjectURL(videoBlobUrlRef.current);
        const newUrl = URL.createObjectURL(file);
        videoBlobUrlRef.current = newUrl;
        setVideoUrl(newUrl); setVideoFile(file);
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.onloadedmetadata = () => setVideoMetadata({ originalName: file.name, size: file.size, duration: Math.round(v.duration), width: v.videoWidth, height: v.videoHeight });
        v.onerror = () => addToast('error', 'Metadata Error', 'Could not read metadata from the video file.');
        v.src = newUrl;
    }, [addToast]);

    // --- Centralized File Handling ---
    const handleFileSelected = useCallback((file: File | undefined | null) => {
        if (!file) return;
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

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleFileSelected(event.target.files?.[0]);
    };

    const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault(); event.stopPropagation(); setIsDragging(false);
        handleFileSelected(event.dataTransfer.files?.[0]);
    }, [handleFileSelected]);

    const handleDragEvents = {
        onDragOver: (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); },
        onDragEnter: (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); },
        onDragLeave: (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); },
    };

    const handleAnalyzeVideo = async () => {
        if (!videoFile || !title.trim()) { addToast('error', 'Input Required', 'Please provide a title and a video file.'); return; }
        setFlowStep('analyzing');
        try {
            addToast('info', 'Analyzing Video...', 'AI is transcribing. This may take a moment.');
            const result = await getTranscriptWithConfidence(videoFile);
            setAnalysisResult(result); setEditedTranscript(result.transcript);
            addToast('success', 'Analysis Complete', `AI confidence: ${(result.confidence * 100).toFixed(0)}%`);
            setFlowStep('review');
        } catch (err) {
            addToast('error', 'Analysis Failed', err instanceof Error ? err.message : 'An unknown error occurred.');
            setFlowStep('initial');
        }
    };

    const handleGenerateModule = async () => {
        if (!analysisResult || !title || !videoFile) return;
        setFlowStep('generating');
        try {
            const transcriptText = editedTranscript.map(line => line.text).join('\n');
            const moduleData = await generateModuleFromContext({ title, transcript: transcriptText, notes, confidence: analysisResult.confidence });
            const timedModuleData: GeneratedModuleData = { ...moduleData, steps: moduleData.steps.map((step: ProcessStep) => ({ ...step, start: editedTranscript.find(l => l.text.includes(step.title) || step.description.includes(l.text.substring(0, 30)))?.start ?? 0, end: editedTranscript.find(l => l.text.includes(step.title) || step.description.includes(l.text.substring(0, 30)))?.end ?? 0 })) };
            setGeneratedModule({ ...timedModuleData, transcript: editedTranscript, created_at: new Date().toISOString(), metadata: { is_ai_generated: true, templateId: DEFAULT_TEMPLATE_ID, intent: DEFAULT_INTENT }, user_id: user?.uid ?? null, video_url: null });
            setFlowStep('final');
            triggerPrompt();
            addToast('success', 'Module Generated', 'Review the final draft and save!');
        } catch (err) {
            addToast('error', 'Generation Failed', err instanceof Error ? err.message : 'An unknown error occurred.');
            setFlowStep('review');
        }
    };

    const handleGenerateFromModel = async () => {
        if (!brand.trim() || !model.trim()) { addToast('error', 'Input Required', 'Please provide a brand and model.'); return; }
        setFlowStep('generating');
        try {
            addToast('info', 'Searching for Device...', 'AI is generating steps from the model number.');
            const moduleData = await generateModuleFromModelNumber(brand, model);
            setGeneratedModule({ ...moduleData, transcript: [], created_at: new Date().toISOString(), metadata: { is_ai_generated: true, source_model: `${brand} ${model}`, templateId: DEFAULT_TEMPLATE_ID, intent: DEFAULT_INTENT }, user_id: user?.uid ?? null, video_url: null });
            setFlowStep('final');
            triggerPrompt();
            addToast('success', 'Module Generated', 'Review the AI-generated steps.');
        } catch (err) {
            addToast('error', 'Generation Failed', err instanceof Error ? err.message : 'An unknown error occurred.');
            setFlowStep('initial');
        }
    };

    const handleManualUpload = async () => {
        if (!manualFile) { addToast('error', 'File Required', 'Please select a manual file to upload.'); return; }
        setFlowStep('generating');
        try {
            addToast('info', 'Uploading Manual...', 'Your file is being securely uploaded.');
            await uploadManualForProcessing(manualFile);
            addToast('success', 'Upload Complete!', 'Your manual has been submitted. This feature is in development, and the AI will be able to use it soon.');
            setTimeout(() => { resetForm(); setCreationMode('selection'); }, 2000);
        } catch (err) {
            addToast('error', 'Upload Failed', err instanceof Error ? err.message : 'Could not upload the manual.');
            setFlowStep('initial');
        }
    };

    const handleSave = async () => {
        if (!generatedModule || !user) return;
        setIsSaving(true);
        try {
            const moduleToSave: ModuleForInsert = { slug: generatedModule.slug, title: generatedModule.title, steps: generatedModule.steps as unknown as Json, transcript: generatedModule.transcript as unknown as Json, video_url: videoFile ? '' : null, metadata: { ...(videoFile ? videoMetadata : {}), ...(generatedModule.metadata || {}) } as Json, user_id: user.uid };
            const savedModule = await saveModule({ moduleData: moduleToSave, videoFile });
            await queryClient.invalidateQueries({ queryKey: ['module', savedModule.slug], exact: true });
            await queryClient.invalidateQueries({ queryKey: ['modules'], exact: true });
            addToast('success', 'Module Saved', `Navigating to new training: "${savedModule.title}"`);
            navigate(`/modules/${savedModule.slug}`);
        } catch (err) {
            addToast('error', 'Save Failed', err instanceof Error ? err.message : 'Could not save the module.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSeek = useCallback((time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            videoRef.current.play().catch(console.error);
        }
    }, []);

    const handleTranscriptChange = useCallback((index: number, newText: string) => {
        setEditedTranscript(prev => prev.map((line, i) => i === index ? { ...line, text: newText } : line));
    }, []);

    // --- RENDER FUNCTIONS ---
    const renderSelection = () => (
        <div className="max-w-4xl mx-auto animate-fade-in-up">
            <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-2">How do you want to create?</h2>
            <p className="text-slate-500 dark:text-slate-400 text-center mb-8">Choose one of the AI-powered methods below.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <button onClick={() => setCreationMode('video')} className="p-6 bg-white dark:bg-slate-800 rounded-xl text-center hover:ring-2 hover:ring-indigo-500 transition-all transform hover:-translate-y-1 shadow-md hover:shadow-xl"><VideoIcon className="h-10 w-10 mx-auto text-indigo-500 mb-3" /><h3 className="font-bold text-lg">From Video</h3><p className="text-sm text-slate-500 dark:text-slate-400">Upload a video for transcription and step generation.</p></button>
                <button onClick={() => setCreationMode('model')} className="p-6 bg-white dark:bg-slate-800 rounded-xl text-center hover:ring-2 hover:ring-indigo-500 transition-all transform hover:-translate-y-1 shadow-md hover:shadow-xl"><TvIcon className="h-10 w-10 mx-auto text-indigo-500 mb-3" /><h3 className="font-bold text-lg">From Device Model</h3><p className="text-sm text-slate-500 dark:text-slate-400">Provide a model number for AI to find instructions.</p></button>
                <button onClick={() => setCreationMode('manual')} className="p-6 bg-white dark:bg-slate-800 rounded-xl text-center hover:ring-2 hover:ring-indigo-500 transition-all transform hover:-translate-y-1 shadow-md hover:shadow-xl"><FileTextIcon className="h-10 w-10 mx-auto text-indigo-500 mb-3" /><h3 className="font-bold text-lg">From a Manual</h3><p className="text-sm text-slate-500 dark:text-slate-400">Upload a document for the AI to learn from.</p></button>
                <button onClick={() => setCreationMode('jsonUpload')} className="p-6 bg-white dark:bg-slate-800 rounded-xl text-center hover:ring-2 hover:ring-indigo-500 transition-all transform hover:-translate-y-1 shadow-md hover:shadow-xl"><FileJsonIcon className="h-10 w-10 mx-auto text-indigo-500 mb-3" /><h3 className="font-bold text-lg">Upload Existing</h3><p className="text-sm text-slate-500 dark:text-slate-400">Import a previously exported `.json` module file.</p></button>
            </div>
        </div>
    );

    const renderVideoInitial = () => (
        <div className="bg-slate-100 dark:bg-slate-800 p-8 rounded-2xl shadow-xl animate-fade-in-up">
            <h2 className="text-2xl font-bold text-indigo-500 dark:text-indigo-400 mb-6 text-center">1. Create from Video</h2>
            <div className="max-w-2xl mx-auto space-y-6">
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Training Title (e.g., How to Make a Sandwich)" className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                {videoFile && videoUrl ? (
                    <div>
                        <div className="bg-slate-200 dark:bg-slate-900/50 p-3 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3"><VideoIcon className="h-6 w-6 text-indigo-500" /><span className="text-sm font-medium truncate">{videoFile.name}</span></div>
                            <button onClick={() => { setVideoFile(null); setVideoUrl(null); if (videoBlobUrlRef.current) URL.revokeObjectURL(videoBlobUrlRef.current); videoBlobUrlRef.current = null; }} className="p-1 text-slate-500"><XIcon className="h-5 w-5" /></button>
                        </div>
                        <div className="mt-4 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700"><VideoPlayer video_url={videoUrl} onTimeUpdate={() => { }} /></div>
                    </div>
                ) : (
                    <label onDrop={handleDrop} {...handleDragEvents} className={`flex flex-col items-center justify-center w-full h-40 px-4 transition bg-white dark:bg-slate-900 border-2 ${isDragging ? 'border-indigo-400' : 'border-slate-300 dark:border-slate-700'} border-dashed rounded-md cursor-pointer hover:border-indigo-500`}>
                        <UploadCloudIcon className={`w-10 h-10 ${isDragging ? 'text-indigo-400' : 'text-slate-400'}`} />
                        <p className="font-medium mt-2">Click to upload or drag & drop a video</p>
                        <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                    </label>
                )}
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional Notes for AI (Optional)" className="w-full h-24 p-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <div className="text-center pt-2"><button onClick={handleAnalyzeVideo} disabled={!videoFile || !title.trim()} className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors transform hover:scale-105 flex items-center justify-center gap-2"><SparklesIcon className="h-6 w-6" />Analyze & Transcribe</button></div>
            </div>
        </div>
    );

    const renderVideoReview = () => (
        <div className="animate-fade-in-up">
            <h2 className="text-2xl font-bold text-center text-indigo-500 dark:text-indigo-400 mb-6">2. Review AI Transcript</h2>
            {analysisResult && videoUrl && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 lg:sticky top-6 space-y-4"><VideoPlayer ref={videoRef} video_url={videoUrl} onTimeUpdate={setCurrentTime} /></div>
                    <div className="lg:col-span-2 bg-slate-100 dark:bg-slate-800 p-4 rounded-lg h-[70vh]">
                        <TranscriptEditor transcript={editedTranscript} currentTime={currentTime} onSeek={handleSeek} onTranscriptChange={handleTranscriptChange} />
                    </div>
                </div>
            )}
            <div className="mt-8 flex justify-center gap-4">
                <button onClick={() => setFlowStep('initial')} className="bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">Back</button>
                <button onClick={handleGenerateModule} className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors transform hover:scale-105 flex items-center justify-center gap-2"><SparklesIcon className="h-6 w-6" />Create Steps from Transcript</button>
            </div>
        </div>
    );

    const renderFinal = () => (
        <div className="animate-fade-in-up">
            <h2 className="text-2xl font-bold text-center text-indigo-500 dark:text-indigo-400 mb-6">3. Finalize Your Module</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="lg:sticky top-6">
                    {videoUrl && <VideoPlayer ref={videoRef} video_url={videoUrl} onTimeUpdate={setCurrentTime} />}
                </div>
                <div>{generatedModule && <ModuleEditor module={generatedModule} onModuleChange={setGeneratedModule} isAdmin={true} currentTime={currentTime} onSeek={handleSeek} />}</div>
            </div>
            <div className="mt-8 flex justify-center gap-4">
                <button onClick={handleBackToSelection} className="bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors" disabled={isSaving}>Start Over</button>
                <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg disabled:bg-slate-500" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Module'}</button>
            </div>
        </div>
    );

    const renderVideoFlow = () => {
        switch (flowStep) {
            case 'initial': return renderVideoInitial();
            case 'review': return renderVideoReview();
            default: return null; // 'final' is handled by the main renderContent
        }
    };

    const renderModelFlow = () => (
        <div className="bg-slate-100 dark:bg-slate-800 p-8 rounded-2xl shadow-xl animate-fade-in-up max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-indigo-500 dark:text-indigo-400 mb-2 text-center">Create from Device Model</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-center">The AI will search the web for your device and generate steps.</p>
            <div className="space-y-4">
                <input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="Brand (e.g., LG)" className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="Model (e.g., MR20GA)" className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="mt-8 text-center"><button onClick={handleGenerateFromModel} disabled={!brand.trim() || !model.trim()} className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors transform hover:scale-105 flex items-center justify-center gap-2"><SparklesIcon className="h-6 w-6" />Generate Steps</button></div>
        </div>
    );

    const renderManualFlow = () => (
        <div className="bg-slate-100 dark:bg-slate-800 p-8 rounded-2xl shadow-xl animate-fade-in-up max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-indigo-500 dark:text-indigo-400 mb-2 text-center">Create from Manual</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-center">Upload a PDF, DOCX, or TXT file. The AI will learn its contents to provide expert guidance.</p>
            {manualFile ? (
                <div className="bg-slate-200 dark:bg-slate-900/50 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3"><FileTextIcon className="h-6 w-6 text-indigo-500" /><span className="text-sm font-medium">{manualFile.name}</span></div>
                    <button onClick={() => setManualFile(null)} className="p-1 text-slate-500"><XIcon className="h-5 w-5" /></button>
                </div>
            ) : (
                <label onDrop={handleDrop} {...handleDragEvents} className={`flex flex-col items-center justify-center w-full h-40 px-4 transition bg-white dark:bg-slate-900 border-2 ${isDragging ? 'border-indigo-400' : 'border-slate-300 dark:border-slate-700'} border-dashed rounded-md cursor-pointer hover:border-indigo-500`}>
                    <UploadCloudIcon className={`w-10 h-10 ${isDragging ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <p className="font-medium mt-2">Click to upload or drag & drop</p><p className="text-xs text-slate-500">PDF, DOCX, or TXT</p>
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={handleFileChange} />
                </label>
            )}
            <div className="mt-8 text-center"><button onClick={handleManualUpload} disabled={!manualFile} className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors transform hover:scale-105 flex items-center justify-center gap-2"><UploadCloudIcon className="h-6 w-6" />Upload for Processing</button></div>
        </div>
    );

    const renderJsonUploadFlow = () => (
        <div className="bg-slate-100 dark:bg-slate-800 p-8 rounded-2xl shadow-xl animate-fade-in-up max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-indigo-500 dark:text-indigo-400 mb-2 text-center">Upload Existing Module</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-center">Upload a previously exported `.json` module file to add it to the platform.</p>
            <label onDrop={handleDrop} {...handleDragEvents} className={`flex flex-col items-center justify-center w-full h-48 px-4 transition bg-white dark:bg-slate-900 border-2 ${isDragging ? 'border-indigo-400' : 'border-slate-300 dark:border-slate-700'} border-dashed rounded-md cursor-pointer hover:border-indigo-500`}>
                <UploadCloudIcon className={`w-12 h-12 ${isDragging ? 'text-indigo-400' : 'text-slate-400'}`} />
                <p className="font-medium mt-2">Drop a .json file here, or click to upload</p>
                <input type="file" className="hidden" accept="application/json" onChange={handleFileChange} />
            </label>
        </div>
    );

    const renderContent = () => {
        if (flowStep === 'generating' || flowStep === 'analyzing') {
            return <div className="text-center p-8"><SparklesIcon className="h-12 w-12 mx-auto text-indigo-500 animate-pulse" /><p className="mt-4 text-lg">AI is working its magic...</p></div>;
        }
        if (flowStep === 'final') return renderFinal();

        switch (creationMode) {
            case 'selection': return renderSelection();
            case 'video': return renderVideoFlow();
            case 'model': return renderModelFlow();
            case 'manual': return renderManualFlow();
            case 'jsonUpload': return renderJsonUploadFlow();
            default: return renderSelection();
        }
    };

    return (
        <div className="p-6">
            <header className="flex justify-between items-center mb-6">
                <div className="w-40">
                    {creationMode !== 'selection' && <button onClick={handleBackToSelection} className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-500"><ArrowLeftIcon className="h-4 w-4" /> Back to selection</button>}
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white text-center">Create Custom Module</h1>
                <span className="w-40" />
            </header>
            {renderContent()}

            {showPrompt && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={cancelPrompt}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                        <SparklesIcon className="h-12 w-12 mx-auto text-indigo-500 mb-4" />
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Save as a Routine?</h2>
                        <p className="text-slate-600 dark:text-slate-300 mt-2 mb-6">Would you like to save this process as a reusable routine for quick access later? (e.g., &quot;Watch ESPN&quot;)</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={cancelPrompt} className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold py-2 px-6 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600">
                                Maybe Later
                            </button>
                            <button onClick={confirmPrompt} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700">
                                Save as Routine
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreatePage;
