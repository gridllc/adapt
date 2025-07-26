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
exports.TranscriptViewer = void 0;
const react_1 = __importStar(require("react"));
const Icons_1 = require("@/components/Icons");
const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0)
        return '00:00';
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substr(14, 5);
};
const TranscriptViewer = ({ transcript, currentTime, onLineClick }) => {
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const activeLineRef = (0, react_1.useRef)(null);
    // Performance Optimization: Memoize the filtered transcript to avoid re-calculating on every render
    const filteredTranscript = (0, react_1.useMemo)(() => {
        if (!searchTerm)
            return transcript;
        return transcript.filter(line => line.text.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [transcript, searchTerm]);
    const activeIndex = (0, react_1.useMemo)(() => filteredTranscript.findIndex(line => currentTime >= line.start && currentTime < line.end), [filteredTranscript, currentTime]);
    (0, react_1.useEffect)(() => {
        if (activeLineRef.current) {
            activeLineRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [activeIndex]);
    const handleDownload = () => {
        const transcriptText = transcript
            .map(line => `[${formatTime(line.start)}] ${line.text}`)
            .join('\n');
        const blob = new Blob([transcriptText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transcript.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    const totalDuration = (0, react_1.useMemo)(() => {
        if (transcript.length === 0)
            return 0;
        return transcript[transcript.length - 1]?.end || 0;
    }, [transcript]);
    return (<div className="p-4 flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 mb-4">
        <div className="flex gap-2">
          <input type="text" placeholder="Search transcript..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-grow bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          <button onClick={handleDownload} className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md transition-colors" aria-label="Download transcript">
            <Icons_1.DownloadIcon className="h-5 w-5 text-slate-600 dark:text-slate-300"/>
          </button>
        </div>
        {/* UX Enhancement: Show total line count and duration */}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          {transcript.length} lines • {formatTime(totalDuration)} total
        </p>
      </div>
      <div className="space-y-1 overflow-y-auto flex-1">
        {filteredTranscript.map((line, index) => {
            const isActive = index === activeIndex;
            return (<div key={index} ref={isActive ? activeLineRef : null} onClick={() => onLineClick(line.start)} className={`cursor-pointer p-2 rounded-md transition-colors duration-200 flex items-start gap-3 ${isActive ? 'bg-indigo-600/50 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80'}`}>
              <span className="font-mono text-xs text-indigo-500 dark:text-indigo-300 pt-0.5">{formatTime(line.start)}</span>
              <p className="text-sm flex-1">{line.text}</p>
            </div>);
        })}
      </div>
    </div>);
};
exports.TranscriptViewer = TranscriptViewer;
