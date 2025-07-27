import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useEffect } from 'react';
import { PlayCircleIcon } from '@/components/Icons';
const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0)
        return '00:00';
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substr(14, 5); // MM:SS
};
export const TranscriptEditor = ({ transcript, currentTime, onSeek, onTranscriptChange }) => {
    const activeLineRef = useRef(null);
    // Find the index of the line that corresponds to the current video time
    const activeIndex = transcript.findIndex(line => currentTime >= line.start && currentTime < line.end);
    useEffect(() => {
        // Automatically scroll the active line into view
        if (activeLineRef.current) {
            activeLineRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
        }
    }, [activeIndex]);
    return (_jsx("div", { className: "space-y-2 overflow-y-auto h-full pr-2", children: transcript.map((line, index) => {
            const isActive = index === activeIndex;
            return (_jsxs("div", { ref: isActive ? activeLineRef : null, className: `p-2 rounded-md transition-colors duration-200 flex items-start gap-3 ${isActive ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-white dark:bg-slate-800/50'}`, children: [_jsx("button", { onClick: () => onSeek(line.start), className: "pt-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400", "aria-label": `Play from ${formatTime(line.start)}`, children: _jsx(PlayCircleIcon, { className: "h-5 w-5" }) }), _jsxs("span", { className: "font-mono text-sm text-indigo-500 dark:text-indigo-300 pt-1.5 whitespace-nowrap", children: ["[", formatTime(line.start), "]"] }), _jsx("textarea", { value: line.text, onChange: (e) => onTranscriptChange(index, e.target.value), "aria-label": `Transcript line at ${formatTime(line.start)}`, className: "w-full text-base text-slate-800 dark:text-slate-200 bg-transparent p-1 rounded-md border border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none", rows: Math.max(2, Math.ceil(line.text.length / 50)) })] }, index));
        }) }));
};
//# sourceMappingURL=TranscriptEditor.js.map