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
exports.TranscriptEditor = void 0;
const react_1 = __importStar(require("react"));
const Icons_1 = require("@/components/Icons");
const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0)
        return '00:00';
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substr(14, 5); // MM:SS
};
const TranscriptEditor = ({ transcript, currentTime, onSeek, onTranscriptChange }) => {
    const activeLineRef = (0, react_1.useRef)(null);
    // Find the index of the line that corresponds to the current video time
    const activeIndex = transcript.findIndex(line => currentTime >= line.start && currentTime < line.end);
    (0, react_1.useEffect)(() => {
        // Automatically scroll the active line into view
        if (activeLineRef.current) {
            activeLineRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
        }
    }, [activeIndex]);
    return (<div className="space-y-2 overflow-y-auto h-full pr-2">
            {transcript.map((line, index) => {
            const isActive = index === activeIndex;
            return (<div key={index} ref={isActive ? activeLineRef : null} className={`p-2 rounded-md transition-colors duration-200 flex items-start gap-3 ${isActive ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-white dark:bg-slate-800/50'}`}>
                        <button onClick={() => onSeek(line.start)} className="pt-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400" aria-label={`Play from ${formatTime(line.start)}`}>
                           <Icons_1.PlayCircleIcon className="h-5 w-5"/>
                        </button>
                        <span className="font-mono text-sm text-indigo-500 dark:text-indigo-300 pt-1.5 whitespace-nowrap">
                            [{formatTime(line.start)}]
                        </span>
                        <textarea value={line.text} onChange={(e) => onTranscriptChange(index, e.target.value)} aria-label={`Transcript line at ${formatTime(line.start)}`} className="w-full text-base text-slate-800 dark:text-slate-200 bg-transparent p-1 rounded-md border border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" rows={Math.max(2, Math.ceil(line.text.length / 50))}/>
                    </div>);
        })}
        </div>);
};
exports.TranscriptEditor = TranscriptEditor;
