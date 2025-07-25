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
exports.PerformanceReport = void 0;
const react_1 = __importStar(require("react"));
const Icons_1 = require("@/components/Icons");
const PerformanceReport = ({ report, onRestart }) => {
    const handleDownload = (0, react_1.useCallback)(() => {
        let reportText = `Adapt Training Performance Report\n`;
        reportText += `===================================\n\n`;
        reportText += `Module: ${report.moduleTitle}\n`;
        reportText += `Completed On: ${report.completionDate}\n\n`;
        reportText += `--- AI Feedback ---\n${report.aiFeedback}\n\n`;
        if (report.unclearSteps.length > 0) {
            reportText += `--- Steps Marked "Unclear" ---\n`;
            report.unclearSteps.forEach(step => {
                reportText += `- ${step.title}\n`;
            });
            reportText += `\n`;
        }
        if (report.userQuestions.length > 0) {
            reportText += `--- Questions Asked ---\n`;
            report.userQuestions.forEach(q => {
                reportText += `- "${q}"\n`;
            });
            reportText += `\n`;
        }
        reportText += `Keep up the great work!`;
        const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Adapt-Report-${report.moduleTitle.replace(/\s+/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [report]);
    return (<div className="p-4 md:p-6 h-full flex flex-col animate-fade-in-up">
            <div className="bg-slate-100 dark:bg-slate-900/50 border border-indigo-200 dark:border-indigo-500/50 rounded-xl p-6 md:p-8 text-center flex-grow flex flex-col justify-center">
                <Icons_1.StarIcon className="h-12 w-12 text-yellow-400 mx-auto mb-4"/>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Training Complete!</h2>
                <p className="text-md text-slate-600 dark:text-slate-300 mt-1">You've successfully completed the module:</p>
                <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-300 mt-2">"{report.moduleTitle}"</p>
                <p className="text-xs text-slate-500 mt-1">Completed on {report.completionDate}</p>

                <div className="mt-6 bg-slate-200 dark:bg-slate-800/60 p-4 rounded-lg text-left">
                    <div className="flex items-start gap-3">
                        <Icons_1.LightbulbIcon className="h-6 w-6 text-yellow-500 dark:text-yellow-400 flex-shrink-0 mt-1"/>
                        <div>
                            <h3 className="font-bold text-md text-slate-800 dark:text-slate-200">Personalized Feedback</h3>
                            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 italic">
                                "{report.aiFeedback}"
                            </p>
                        </div>
                    </div>
                </div>

                {(report.unclearSteps.length > 0 || report.userQuestions.length > 0) && (<div className="mt-4 bg-slate-200 dark:bg-slate-800/60 p-4 rounded-lg text-left">
                        <div className="flex items-start gap-3">
                            <Icons_1.HelpCircleIcon className="h-6 w-6 text-indigo-500 dark:text-indigo-400 flex-shrink-0 mt-1"/>
                            <div>
                                <h3 className="font-bold text-md text-slate-800 dark:text-slate-200">Areas for Review</h3>
                                {report.unclearSteps.length > 0 && (<div className="mt-2">
                                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Steps you weren't sure about:</h4>
                                        <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400">
                                            {report.unclearSteps.map(step => <li key={step.title}>{step.title}</li>)}
                                        </ul>
                                    </div>)}
                                {report.userQuestions.length > 0 && (<div className="mt-2">
                                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Questions you asked:</h4>
                                        <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400">
                                            {report.userQuestions.slice(0, 3).map(q => <li key={q} className="truncate">"{q}"</li>)}
                                        </ul>
                                    </div>)}
                            </div>
                        </div>
                    </div>)}
            </div>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 flex-shrink-0">
                <button onClick={onRestart} className="w-full sm:w-auto bg-slate-500 dark:bg-slate-600 hover:bg-slate-600 dark:hover:bg-slate-700 text-white text-sm font-semibold py-2 px-4 rounded-full transition-colors">
                    Restart Training
                </button>
                <button onClick={handleDownload} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 px-4 rounded-full transition-transform transform hover:scale-105">
                    <Icons_1.DownloadIcon className="h-5 w-5"/>
                    <span>Download Report</span>
                </button>
            </div>
        </div>);
};
exports.PerformanceReport = PerformanceReport;
