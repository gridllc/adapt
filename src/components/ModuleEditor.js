import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { XIcon, LightbulbIcon, CheckCircleIcon, DownloadIcon, SparklesIcon, ArrowUpIcon, ArrowDownIcon, PlayCircleIcon, } from './Icons';
import { useToast } from '../hooks/useToast';
import { CheckpointDashboard } from './CheckpointDashboard';
const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0)
        return '00:00';
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substr(14, 5); // MM:SS
};
export const ModuleEditor = ({ module, onModuleChange, traineeSuggestions = [], aiSuggestions = [], checkpointResponses = [], onAcceptSuggestion = () => { }, onRejectSuggestion = () => { }, isAdmin, currentTime, onSeek, initialFocusStepIndex, }) => {
    const { addToast } = useToast();
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [openTranscripts, setOpenTranscripts] = useState({});
    const stepRefs = useRef([]);
    const steps = useMemo(() => module.steps || [], [module.steps]);
    const transcript = useMemo(() => module.transcript || [], [module.transcript]);
    /**
     * Effect to scroll to a specific step when a suggestion is applied from another page.
     */
    useEffect(() => {
        if (initialFocusStepIndex !== undefined && stepRefs.current[initialFocusStepIndex]) {
            setTimeout(() => {
                stepRefs.current[initialFocusStepIndex]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }, 100);
        }
    }, [initialFocusStepIndex]);
    /**
     * Effect to scroll the active step into view during video playback.
     */
    useEffect(() => {
        if (currentTime !== undefined) {
            const activeIndex = steps.findIndex(step => currentTime >= step.start && currentTime < step.end);
            if (activeIndex !== -1 && stepRefs.current[activeIndex]) {
                const rect = stepRefs.current[activeIndex].getBoundingClientRect();
                const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
                if (!isVisible) {
                    stepRefs.current[activeIndex]?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                    });
                }
            }
        }
    }, [currentTime, steps]);
    const toggleTranscript = useCallback((index) => {
        setOpenTranscripts(prev => ({ ...prev, [index]: !prev[index] }));
    }, []);
    const handleDownload = useCallback(() => {
        if (!module)
            return;
        let content = `Module: ${module.title}\n`;
        if (module.video_url && typeof module.video_url === 'string' && !module.video_url.startsWith('blob:')) {
            content += `Video URL: ${module.video_url}\n`;
        }
        content += `\n===================================\n\n`;
        const moduleSteps = module.steps || [];
        moduleSteps.forEach((step, index) => {
            content += `Step ${index + 1}: ${step.title}\n`;
            content += `-----------------------------------\n`;
            content += `Description: ${step.description}\n`;
            if (step.checkpoint) {
                content += `Checkpoint: ${step.checkpoint}\n`;
            }
            if (step.alternativeMethods && step.alternativeMethods.length > 0) {
                content += `Alternative Methods:\n`;
                step.alternativeMethods.forEach(alt => {
                    content += `  - ${alt.title}: ${alt.description}\n`;
                });
            }
            content += `\n`;
        });
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const slug = (module.slug || 'module').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `adapt-module-${slug}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        addToast('success', 'Download Started', 'Your module draft is downloading.');
    }, [module, addToast]);
    /**
     * Refactoring Note: Added step reordering logic. This allows admins to
     * change the sequence of steps without needing to manually delete and recreate them.
     */
    const moveStep = useCallback((index, direction) => {
        const newSteps = [...steps];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newSteps.length) {
            return; // Cannot move outside of array bounds
        }
        // Swap elements
        [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
        onModuleChange({ ...module, steps: newSteps });
        addToast('info', 'Step Reordered', `The step has been moved ${direction}. Don't forget to save your changes.`);
    }, [steps, module, onModuleChange, addToast]);
    const handleFieldChange = useCallback((field, value) => {
        onModuleChange({ ...module, [field]: value });
    }, [module, onModuleChange]);
    const handleStepChange = useCallback((index, field, value) => {
        const newSteps = steps.map((s, i) => i === index ? { ...s, [field]: value } : s);
        onModuleChange({ ...module, steps: newSteps });
    }, [module, onModuleChange, steps]);
    const handleTranscriptChange = useCallback((lineIndex, newText) => {
        if (!transcript)
            return;
        const newTranscript = transcript.map((line, index) => index === lineIndex ? { ...line, text: newText } : line);
        onModuleChange({ ...module, transcript: newTranscript });
    }, [module, onModuleChange, transcript]);
    const handleAltChange = useCallback((stepIndex, altIndex, field, value) => {
        const newSteps = steps.map((s, i) => {
            if (i !== stepIndex)
                return s;
            const alternativeMethods = s.alternativeMethods.map((a, j) => j === altIndex ? { ...a, [field]: value } : a);
            return { ...s, alternativeMethods };
        });
        onModuleChange({ ...module, steps: newSteps });
    }, [module, onModuleChange, steps]);
    const addAlternativeMethod = useCallback((stepIndex) => {
        const newSteps = steps.map((s, i) => i === stepIndex
            ? {
                ...s,
                alternativeMethods: [
                    ...s.alternativeMethods,
                    { title: 'New Method', description: '' }
                ]
            }
            : s);
        onModuleChange({ ...module, steps: newSteps });
    }, [module, onModuleChange, steps]);
    const removeAlternativeMethod = useCallback((stepIndex, altIndex) => {
        const newSteps = steps.map((s, i) => i === stepIndex
            ? {
                ...s,
                alternativeMethods: s.alternativeMethods.filter((_, j) => j !== altIndex)
            }
            : s);
        onModuleChange({ ...module, steps: newSteps });
    }, [module, onModuleChange, steps]);
    const addStep = useCallback(() => {
        const newStep = {
            title: 'New Step',
            description: '',
            start: 0,
            end: 0,
            checkpoint: null,
            alternativeMethods: []
        };
        onModuleChange({ ...module, steps: [...steps, newStep] });
    }, [module, onModuleChange, steps]);
    const removeStep = useCallback((index) => {
        const newSteps = steps.filter((_, i) => i !== index);
        onModuleChange({ ...module, steps: newSteps });
    }, [module, onModuleChange, steps]);
    return (_jsxs("div", { className: "bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl space-y-6", children: [_jsx("div", { className: "space-y-4", children: _jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Module Title" }), _jsx("input", { type: "text", className: "w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-900 focus:outline-none", value: module.title, onChange: (e) => handleFieldChange('title', e.currentTarget.value) })] }), _jsxs("button", { onClick: handleDownload, className: "flex items-center gap-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white text-sm font-semibold py-2 px-3 rounded-lg transition-colors self-end", children: [_jsx(DownloadIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Download Draft" })] })] }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex justify-between items-center mb-3", children: [_jsx("h2", { className: "font-semibold text-lg", children: "Process Steps" }), traineeSuggestions.length > 0 && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", id: "show-suggestions-toggle", checked: showSuggestions, onChange: () => setShowSuggestions(!showSuggestions), className: "h-4 w-4 rounded border-slate-300 dark:border-slate-500 text-indigo-600 focus:ring-indigo-500" }), _jsx("label", { htmlFor: "show-suggestions-toggle", className: "text-sm font-medium text-slate-700 dark:text-slate-300 select-none", children: "Show Trainee Suggestions" })] }))] }), _jsxs("div", { className: "space-y-4 max-h-[60vh] overflow-y-auto p-1", children: [steps.map((step, idx) => {
                                const stepTraineeSuggestions = traineeSuggestions.filter((s) => s.stepIndex === idx);
                                const stepAiSuggestion = aiSuggestions?.find(s => s.stepIndex === idx);
                                const stepTranscriptLines = transcript
                                    .map((line, index) => ({ ...line, originalIndex: index }))
                                    .filter(line => line.start >= step.start && line.end <= step.end && step.end > step.start);
                                const stepCheckpointResponses = checkpointResponses.filter(r => r.step_index === idx && r.answer.toLowerCase() === 'no');
                                const isActive = currentTime !== undefined && currentTime >= step.start && currentTime < step.end;
                                const isInvalidTime = step.end > 0 && step.start > step.end;
                                const isFocused = initialFocusStepIndex === idx;
                                return (_jsxs("div", { ref: (el) => { stepRefs.current[idx] = el; }, className: `p-4 bg-slate-100 dark:bg-slate-900 rounded-lg space-y-3 transition-all duration-300 ${isActive || isFocused ? 'ring-2 ring-indigo-500' : ''}`, children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("h3", { className: "font-bold", children: ["Step ", idx + 1] }), _jsxs("div", { className: "flex items-center", children: [_jsx("button", { onClick: () => moveStep(idx, 'up'), disabled: idx === 0, className: "p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed", children: _jsx(ArrowUpIcon, { className: "h-4 w-4" }) }), _jsx("button", { onClick: () => moveStep(idx, 'down'), disabled: idx === steps.length - 1, className: "p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed", children: _jsx(ArrowDownIcon, { className: "h-4 w-4" }) })] })] }), _jsx("button", { onClick: () => removeStep(idx), className: "text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900", children: _jsx(XIcon, { className: "h-5 w-5" }) })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Title" }), _jsx("input", { type: "text", className: "w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-1 bg-white dark:bg-slate-900 focus:outline-none", value: step.title, onChange: (e) => handleStepChange(idx, 'title', e.currentTarget.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Description" }), _jsx("textarea", { className: "w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-1 h-20 bg-white dark:bg-slate-900 focus:outline-none", value: step.description, onChange: (e) => handleStepChange(idx, 'description', e.currentTarget.value) })] })] }), stepAiSuggestion && (_jsxs("div", { className: "bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg border border-yellow-200 dark:border-yellow-700 animate-fade-in-up", children: [_jsxs("h4", { className: "flex items-center gap-2 font-bold text-yellow-800 dark:text-yellow-300 mb-2", children: [_jsx(SparklesIcon, { className: "h-5 w-5" }), "AI-Suggested Fix"] }), _jsxs("p", { className: "text-yellow-800 dark:text-yellow-200 italic mb-2", children: ["\"", stepAiSuggestion.suggestion, "\""] }), _jsxs("button", { onClick: () => handleStepChange(idx, 'description', stepAiSuggestion.suggestion), className: "bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 text-xs font-semibold flex items-center gap-1.5", children: [_jsx(CheckCircleIcon, { className: "h-4 w-4" }), " Apply to Step"] })] })), _jsxs("div", { className: "grid gap-4 grid-cols-2", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Start (sec)" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "number", className: `w-full border rounded px-3 py-1 bg-white dark:bg-slate-900 focus:outline-none transition-colors ${isInvalidTime ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`, value: step.start, onChange: (e) => handleStepChange(idx, 'start', Number(e.currentTarget.value)) }), onSeek && (_jsx("button", { onClick: () => onSeek(step.start), className: "text-slate-500 hover:text-indigo-600", title: "Preview start time", children: _jsx(PlayCircleIcon, { className: "h-6 w-6" }) }))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "End (sec)" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "number", className: `w-full border rounded px-3 py-1 bg-white dark:bg-slate-900 focus:outline-none transition-colors ${isInvalidTime ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`, value: step.end, onChange: (e) => handleStepChange(idx, 'end', Number(e.currentTarget.value)) }), onSeek && (_jsx("button", { onClick: () => onSeek(step.end), className: "text-slate-500 hover:text-indigo-600", title: "Preview end time", children: _jsx(PlayCircleIcon, { className: "h-6 w-6" }) }))] })] })] }), isInvalidTime && _jsx("p", { className: "text-xs text-red-500 text-center", children: "End time cannot be before start time." }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Checkpoint (optional)" }), _jsx("input", { type: "text", className: "w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-1 bg-white dark:bg-slate-900 focus:outline-none", value: step.checkpoint ?? '', onChange: (e) => handleStepChange(idx, 'checkpoint', e.currentTarget.value), placeholder: "e.g., How many screws did you use?" })] }), stepCheckpointResponses.length > 0 && (_jsxs("div", { className: "mt-3 p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg text-sm border border-yellow-200 dark:border-yellow-700", children: [_jsx("h4", { className: "font-semibold text-yellow-800 dark:text-yellow-300", children: "Trainee Feedback" }), _jsxs("p", { className: "text-xs text-yellow-700 dark:text-yellow-400 mb-2", children: [stepCheckpointResponses.length, " trainee(s) answered \"No\" to this checkpoint."] }), _jsx("ul", { className: "space-y-1 max-h-24 overflow-y-auto pr-2", children: stepCheckpointResponses.map(resp => (_jsx("li", { className: "text-xs italic text-yellow-800 dark:text-yellow-300 border-l-2 border-yellow-400 pl-2", children: resp.comment || "No comment provided." }, resp.id))) })] })), step.alternativeMethods.map((alt, aIdx) => (_jsxs("div", { className: "p-2 bg-white dark:bg-slate-800 rounded-lg relative", children: [_jsx("button", { onClick: () => removeAlternativeMethod(idx, aIdx), className: "absolute top-1 right-1 text-red-500 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50", children: _jsx(XIcon, { className: "h-4 w-4" }) }), _jsx("input", { type: "text", placeholder: "Method title", className: "w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1 mb-1 bg-white dark:bg-slate-900 focus:outline-none", value: alt.title, onChange: (e) => handleAltChange(idx, aIdx, 'title', e.currentTarget.value) }), _jsx("textarea", { placeholder: "Method description", className: "w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-900 focus:outline-none", value: alt.description, onChange: (e) => handleAltChange(idx, aIdx, 'description', e.currentTarget.value) })] }, aIdx))), _jsxs("button", { onClick: () => addAlternativeMethod(idx), className: "mt-2 inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm", children: [_jsx(LightbulbIcon, { className: "h-4 w-4" }), "Add alternative method"] }), transcript && transcript.length > 0 && step.end > step.start && (_jsxs("div", { children: [_jsxs("button", { onClick: () => toggleTranscript(idx), className: "text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-2", children: [openTranscripts[idx] ? 'Hide' : 'Show', " Original Transcript (", stepTranscriptLines.length, " lines)"] }), openTranscripts[idx] && (_jsx("div", { className: "mt-2 p-3 bg-white dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto space-y-2", children: stepTranscriptLines.length > 0 ? (stepTranscriptLines.map((line) => (_jsxs("div", { className: "flex items-start gap-3", children: [_jsxs("span", { className: "font-mono text-xs text-indigo-500 dark:text-indigo-300 pt-1.5 whitespace-nowrap", children: ["[", formatTime(line.start), "]"] }), _jsx("textarea", { value: line.text, onChange: (e) => handleTranscriptChange(line.originalIndex, e.target.value), className: "w-full text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700/50 p-1 rounded-md border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500", rows: 2 })] }, line.originalIndex)))) : (_jsx("p", { className: "text-xs text-slate-500 italic", children: "No transcript lines fall within this step's time range." })) }))] })), showSuggestions && stepTraineeSuggestions.length > 0 && (_jsxs("div", { className: "mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg", children: [_jsx("h4", { className: "font-semibold mb-2", children: "Trainee Suggestions" }), stepTraineeSuggestions.map((sug) => (_jsxs("div", { className: "flex justify-between items-center mb-2", children: [_jsxs("span", { className: "italic flex-1 text-sm text-slate-800 dark:text-slate-200", children: ["\"", sug.text, "\""] }), _jsxs("div", { className: "flex gap-2 ml-4", children: [_jsx("button", { onClick: () => onAcceptSuggestion?.(sug), className: "px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs", children: "Accept" }), _jsx("button", { onClick: () => onRejectSuggestion?.(sug.id), className: "px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs", children: "Reject" })] })] }, sug.id)))] }))] }, idx));
                            }), _jsxs("button", { onClick: addStep, className: "mt-4 inline-flex items-center gap-2 text-green-600 hover:text-green-800 font-semibold", children: [_jsx(CheckCircleIcon, { className: "h-5 w-5" }), " Add Step"] })] })] }), _jsx(CheckpointDashboard, { moduleId: module.slug, moduleTitle: module.title, isAdmin: isAdmin })] }));
};
//# sourceMappingURL=ModuleEditor.js.map