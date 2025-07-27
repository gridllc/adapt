import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from 'react';
import { StarIcon, LightbulbIcon, HelpCircleIcon, DownloadIcon } from '@/components/Icons';
export const PerformanceReport = ({ report, onRestart }) => {
    const handleDownload = useCallback(() => {
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
    return (_jsxs("div", { className: "p-4 md:p-6 h-full flex flex-col animate-fade-in-up", children: [_jsxs("div", { className: "bg-slate-100 dark:bg-slate-900/50 border border-indigo-200 dark:border-indigo-500/50 rounded-xl p-6 md:p-8 text-center flex-grow flex flex-col justify-center", children: [_jsx(StarIcon, { className: "h-12 w-12 text-yellow-400 mx-auto mb-4" }), _jsx("h2", { className: "text-2xl md:text-3xl font-bold text-slate-900 dark:text-white", children: "Training Complete!" }), _jsx("p", { className: "text-md text-slate-600 dark:text-slate-300 mt-1", children: "You've successfully completed the module:" }), _jsxs("p", { className: "text-lg font-semibold text-indigo-600 dark:text-indigo-300 mt-2", children: ["\"", report.moduleTitle, "\""] }), _jsxs("p", { className: "text-xs text-slate-500 mt-1", children: ["Completed on ", report.completionDate] }), _jsx("div", { className: "mt-6 bg-slate-200 dark:bg-slate-800/60 p-4 rounded-lg text-left", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx(LightbulbIcon, { className: "h-6 w-6 text-yellow-500 dark:text-yellow-400 flex-shrink-0 mt-1" }), _jsxs("div", { children: [_jsx("h3", { className: "font-bold text-md text-slate-800 dark:text-slate-200", children: "Personalized Feedback" }), _jsxs("p", { className: "text-sm text-slate-700 dark:text-slate-300 mt-1 italic", children: ["\"", report.aiFeedback, "\""] })] })] }) }), (report.unclearSteps.length > 0 || report.userQuestions.length > 0) && (_jsx("div", { className: "mt-4 bg-slate-200 dark:bg-slate-800/60 p-4 rounded-lg text-left", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx(HelpCircleIcon, { className: "h-6 w-6 text-indigo-500 dark:text-indigo-400 flex-shrink-0 mt-1" }), _jsxs("div", { children: [_jsx("h3", { className: "font-bold text-md text-slate-800 dark:text-slate-200", children: "Areas for Review" }), report.unclearSteps.length > 0 && (_jsxs("div", { className: "mt-2", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-700 dark:text-slate-300", children: "Steps you weren't sure about:" }), _jsx("ul", { className: "list-disc list-inside text-sm text-slate-600 dark:text-slate-400", children: report.unclearSteps.map(step => _jsx("li", { children: step.title }, step.title)) })] })), report.userQuestions.length > 0 && (_jsxs("div", { className: "mt-2", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-700 dark:text-slate-300", children: "Questions you asked:" }), _jsx("ul", { className: "list-disc list-inside text-sm text-slate-600 dark:text-slate-400", children: report.userQuestions.slice(0, 3).map(q => _jsxs("li", { className: "truncate", children: ["\"", q, "\""] }, q)) })] }))] })] }) }))] }), _jsxs("div", { className: "mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 flex-shrink-0", children: [_jsx("button", { onClick: onRestart, className: "w-full sm:w-auto bg-slate-500 dark:bg-slate-600 hover:bg-slate-600 dark:hover:bg-slate-700 text-white text-sm font-semibold py-2 px-4 rounded-full transition-colors", children: "Restart Training" }), _jsxs("button", { onClick: handleDownload, className: "w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 px-4 rounded-full transition-transform transform hover:scale-105", children: [_jsx(DownloadIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Download Report" })] })] })] }));
};
//# sourceMappingURL=PerformanceReport.js.map