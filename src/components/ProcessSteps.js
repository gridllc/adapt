import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon, ArrowLeftIcon, ArrowDownIcon, ArrowUpIcon, AlertTriangleIcon, PencilIcon, } from '@/components/Icons';
import { CheckpointPrompt } from './CheckpointPrompt';
// Helper function to format seconds into MM:SS format
const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0)
        return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};
export const ProcessSteps = ({ steps, currentStepIndex, onStepSelect, markStep, goBack, onCheckpointAnswer, isEvaluatingCheckpoint, checkpointFeedback, instructionSuggestion, onSuggestionSubmit, isSuggestionSubmitted, isAdmin, moduleId, onTutorHelp, checkpointFailureStats = [], }) => {
    const activeStepRef = useRef(null);
    const navigate = useNavigate();
    const [collapsedSteps, setCollapsedSteps] = useState(new Set());
    const hotspotSteps = useMemo(() => {
        const hotspots = new Map();
        checkpointFailureStats.forEach(stat => {
            hotspots.set(stat.step_index, stat.count);
        });
        return hotspots;
    }, [checkpointFailureStats]);
    useEffect(() => {
        if (activeStepRef.current) {
            activeStepRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [currentStepIndex]);
    // [UX] Auto-collapse completed steps when a new one is activated
    useEffect(() => {
        setCollapsedSteps(prev => {
            const newSet = new Set(prev);
            // Collapse all steps before the current one
            for (let i = 0; i < currentStepIndex; i++) {
                newSet.add(i);
            }
            // Ensure the current step is not collapsed
            newSet.delete(currentStepIndex);
            return newSet;
        });
    }, [currentStepIndex]);
    const toggleCollapse = (e, index) => {
        e.stopPropagation();
        setCollapsedSteps(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            }
            else {
                newSet.add(index);
            }
            return newSet;
        });
    };
    // [UX] Add Keyboard Shortcut for "Mark as Done"
    useEffect(() => {
        const handler = (e) => {
            // Only trigger if the current step is active and has no checkpoint
            if (currentStepIndex !== -1 && !steps[currentStepIndex]?.checkpoint && e.key.toLowerCase() === 'm') {
                markStep('done');
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [currentStepIndex, steps, markStep]);
    return (_jsx("div", { className: "p-4 space-y-3 overflow-y-auto flex-1", children: steps.map((step, index) => {
            const isActive = currentStepIndex === index;
            const isCompleted = currentStepIndex > index;
            const isCollapsed = collapsedSteps.has(index);
            const hotspotCount = hotspotSteps.get(index);
            return (_jsxs("div", { ref: isActive ? activeStepRef : null, onClick: () => onStepSelect(step.start, index), className: `cursor-pointer p-4 rounded-lg transition-all duration-300 border-l-4 ${isActive
                    ? 'bg-indigo-100 dark:bg-indigo-600/30 border-indigo-500 shadow-lg'
                    : isCompleted
                        ? `bg-slate-100/60 dark:bg-slate-700/40 border-green-500 ${isCollapsed ? 'opacity-50' : 'opacity-80'}`
                        : 'bg-slate-100 dark:bg-slate-700/80 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'}`, children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [_jsx("h3", { className: "font-bold text-md text-slate-800 dark:text-slate-100 truncate", title: step.title, children: step.title }), isAdmin && hotspotCount && hotspotCount > 0 && (_jsxs("div", { className: "flex items-center gap-1 text-yellow-600 dark:text-yellow-400", title: `${hotspotCount} trainee(s) failed this checkpoint`, children: [_jsx(AlertTriangleIcon, { className: "h-4 w-4" }), _jsx("span", { className: "text-xs font-bold", children: hotspotCount })] }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "text-xs font-mono text-slate-500 dark:text-slate-400", children: ["(", formatTime(step.start), " - ", formatTime(step.end), ")"] }), isCompleted && (_jsx("button", { onClick: (e) => toggleCollapse(e, index), className: "p-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-full", "aria-label": isCollapsed ? 'Expand step' : 'Collapse step', "aria-expanded": !isCollapsed, "aria-controls": `step-content-${index}`, "data-testid": `step-${index}-collapse-btn`, children: isCollapsed ? _jsx(ArrowDownIcon, { className: "h-4 w-4" }) : _jsx(ArrowUpIcon, { className: "h-4 w-4" }) }))] })] }), !isCollapsed && (_jsxs("div", { id: `step-content-${index}`, className: "mt-2 space-y-3", children: [_jsx("p", { className: "text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap", children: step.description }), isActive && (_jsxs("div", { className: "space-y-3", children: [step.checkpoint && (_jsx(CheckpointPrompt, { question: step.checkpoint, onAnswer: onCheckpointAnswer, isLoading: isEvaluatingCheckpoint, onTutorHelp: onTutorHelp, alternativeHelp: step.alternativeMethods?.[0]?.description })), checkpointFeedback && (_jsxs("div", { className: `p-3 rounded-lg text-sm border ${checkpointFeedback.isCorrect
                                            ? 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-600 text-green-800 dark:text-green-200'
                                            : 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-600 text-red-800 dark:text-red-200'}`, children: [_jsx("p", { className: "font-semibold", children: checkpointFeedback.isCorrect ? 'Correct!' : 'Not Quite...' }), _jsx("p", { children: checkpointFeedback.feedback })] })), instructionSuggestion && !isSuggestionSubmitted && (_jsxs("div", { className: "p-3 rounded-lg bg-indigo-100/70 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700", children: [_jsxs("p", { className: "text-sm text-indigo-800 dark:text-indigo-200 italic", children: [_jsx("span", { className: "font-bold", children: "AI Suggestion:" }), " Could this instruction be clearer? Maybe: \"", instructionSuggestion, "\""] }), _jsxs("button", { onClick: onSuggestionSubmit, "data-testid": "propose-change-btn", className: "mt-2 text-xs bg-indigo-600 text-white font-semibold py-1 px-3 rounded-full hover:bg-indigo-700 flex items-center gap-1", children: [_jsx(PencilIcon, { className: "h-3 w-3" }), " Propose this change to the owner"] })] })), isSuggestionSubmitted && (_jsxs("div", { className: "p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-600 text-sm text-green-800 dark:text-green-200 flex items-center gap-2", children: [_jsx(CheckCircleIcon, { className: "h-4 w-4" }), " Suggestion submitted for review!"] }))] }))] })), isActive && (_jsxs("div", { className: "flex items-center justify-between mt-4 pt-3 border-t border-slate-200 dark:border-slate-700", children: [_jsxs("button", { onClick: goBack, disabled: index === 0, "data-testid": `step-${index}-back-btn`, className: "flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 transition-colors", children: [_jsx(ArrowLeftIcon, { className: "h-4 w-4" }), "Back"] }), !step.checkpoint && (_jsx("button", { onClick: () => markStep('done'), "data-testid": `step-${index}-done-btn`, className: "bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700", children: "Mark as Done" }))] }))] }, index));
        }) }));
};
//# sourceMappingURL=ProcessSteps.js.map