import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { SendIcon, HelpCircleIcon } from '@/components/Icons';
export const CheckpointPrompt = ({ question, options = ['Yes', 'No'], allowTextInputOn = 'No', alternativeHelp, onAnswer, onTutorHelp, isLoading, }) => {
    const [selected, setSelected] = useState(null);
    const [comment, setComment] = useState('');
    const textareaRef = useRef(null);
    // Auto-focus the textarea when it appears.
    useEffect(() => {
        if (selected?.toLowerCase() === allowTextInputOn?.toLowerCase()) {
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 100); // Small delay to ensure the element is rendered and visible
        }
    }, [selected, allowTextInputOn]);
    const handleSubmit = (e) => {
        e.stopPropagation();
        if (!selected)
            return;
        onAnswer(selected, comment.trim() || undefined);
    };
    // Handle Enter key submission from the textarea
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!selected || isLoading)
                return;
            onAnswer(selected, comment.trim() || undefined);
        }
    };
    const handleSelectOption = (e, opt) => {
        e.stopPropagation();
        setSelected(opt);
    };
    const handleAIHelp = (e) => {
        e.stopPropagation();
        if (onTutorHelp) {
            onTutorHelp(question, selected ?? undefined);
        }
    };
    const showCommentBox = selected && selected.toLowerCase() === allowTextInputOn?.toLowerCase();
    return (_jsxs("div", { className: "mt-4 p-4 bg-slate-200/50 dark:bg-slate-900/50 rounded-md border border-slate-300 dark:border-slate-700 animate-fade-in-up", children: [_jsx("p", { className: "font-semibold text-sm text-indigo-700 dark:text-indigo-300 italic", children: question }), _jsx("div", { className: "flex gap-3 mt-3 flex-wrap", children: options.map(opt => (_jsx("button", { onClick: (e) => handleSelectOption(e, opt), disabled: isLoading, className: `px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${selected === opt
                        ? 'bg-indigo-600 text-white ring-2 ring-offset-2 ring-indigo-500 ring-offset-slate-100 dark:ring-offset-slate-800'
                        : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600'} disabled:opacity-50`, children: opt }, opt))) }), showCommentBox && (_jsxs("div", { className: "mt-4", children: [_jsx("label", { className: "block text-sm text-slate-600 dark:text-slate-300 mb-1", children: "Want to explain why? (Optional)" }), _jsx("textarea", { ref: textareaRef, value: comment, onClick: (e) => e.stopPropagation(), onChange: (e) => setComment(e.target.value), onKeyDown: handleKeyDown, disabled: isLoading, className: "w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50", rows: 2, placeholder: "Your comment..." })] })), alternativeHelp && showCommentBox && (_jsxs("div", { className: "mt-3 text-sm text-yellow-800 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800", children: [_jsx("span", { className: "font-bold", children: "\uD83D\uDCA1 Tip:" }), " ", alternativeHelp] })), _jsxs("div", { className: "flex gap-4 items-center mt-4 pt-3 border-t border-slate-300 dark:border-slate-600", children: [_jsxs("button", { onClick: handleSubmit, disabled: !selected || isLoading, className: "bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center gap-2 transition-all transform hover:scale-105", children: [_jsx(SendIcon, { className: "h-4 w-4" }), isLoading ? 'Submitting...' : 'Submit Answer'] }), onTutorHelp && (_jsxs("button", { onClick: handleAIHelp, disabled: isLoading, className: `text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 disabled:opacity-50 transition-all ${showCommentBox ? 'animate-pulse' : ''}`, children: [_jsx(HelpCircleIcon, { className: "h-4 w-4" }), "Ask the AI Tutor"] }))] })] }));
};
//# sourceMappingURL=CheckpointPrompt.js.map