import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getModule } from '@/services/moduleService';
import { getSessionSummary } from '@/services/sessionsService';
import { ClockIcon, LightbulbIcon, AlertTriangleIcon, TrophyIcon } from '@/components/Icons';
/**
 * A small component to render the correct icon based on the event type.
 * @param {object} props - The component props.
 * @param {LiveCoachEvent['eventType']} props.type - The type of the coaching event.
 * @returns {React.ReactElement} The corresponding icon.
 */
const EventIcon = ({ type }) => {
    switch (type) {
        case 'hint': return _jsx("span", { title: "Hint Provided", children: _jsx(LightbulbIcon, { className: "h-5 w-5 text-yellow-400" }) });
        case 'correction': return _jsx("span", { title: "Correction Made", children: _jsx(AlertTriangleIcon, { className: "h-5 w-5 text-red-400" }) });
        case 'tutoring': return _jsx("span", { title: "Tutoring Session", children: _jsx(LightbulbIcon, { className: "h-5 w-5 text-orange-400" }) });
        default: return _jsx("span", { title: "Step Advanced", children: _jsx(ClockIcon, { className: "h-5 w-5 text-slate-400" }) });
    }
};
/**
 * Formats milliseconds into a human-readable string (e.g., "1m 32s", "15.2s", "980ms").
 * @param {number} ms - The duration in milliseconds.
 * @returns {string} The formatted duration string.
 */
const formatDuration = (ms) => {
    if (isNaN(ms) || ms < 0)
        return '0s';
    if (ms < 1000)
        return `${ms}ms`;
    const seconds = ms / 1000;
    if (seconds < 60)
        return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
};
/**
 * Renders a read-only review page for a completed or in-progress Live Coach session.
 * It provides administrators with a detailed timeline of events and performance metrics.
 */
const SessionReviewPage = () => {
    const { moduleId, session_key } = useParams();
    // Fetch the core module data (title, steps, etc.)
    const { data: moduleData, isLoading: isLoadingModule } = useQuery({
        queryKey: ['module', moduleId],
        queryFn: () => getModule(moduleId),
        enabled: !!moduleId,
    });
    // Fetch the detailed session summary, which includes events and calculated stats
    const { data: sessionSummary, isLoading: isLoadingSession } = useQuery({
        queryKey: ['liveCoachSessionSummary', moduleId, session_key],
        queryFn: () => getSessionSummary(moduleId, session_key),
        enabled: !!moduleId && !!session_key,
    });
    const isLoading = isLoadingModule || isLoadingSession;
    if (isLoading) {
        return _jsx("div", { className: "text-center p-8 text-slate-500 dark:text-slate-400", children: "Loading session review..." });
    }
    if (!moduleData || !sessionSummary) {
        return _jsx("div", { className: "text-center p-8 text-red-500", children: "Could not find the requested module or session data." });
    }
    const events = sessionSummary.liveCoachEvents || [];
    const totalDuration = sessionSummary.endedAt - sessionSummary.startedAt;
    return (_jsxs("div", { className: "p-8", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-slate-900 dark:text-white", children: "Session Review" }), _jsx("p", { className: "text-indigo-500 dark:text-indigo-400", children: moduleData.title }), _jsxs("p", { className: "text-xs text-slate-500 truncate", title: session_key, children: ["Session Token: ", session_key] })] }), _jsxs("div", { className: "bg-white dark:bg-slate-800/50 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 space-y-8", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 text-center", children: [_jsxs("div", { className: "bg-slate-200 dark:bg-slate-900/50 p-4 rounded-lg", children: [_jsx("h2", { className: "text-lg font-bold text-indigo-500 dark:text-indigo-400", children: "Final Score" }), _jsxs("div", { className: "flex items-center justify-center gap-2 text-4xl font-bold mt-2", children: [_jsx(TrophyIcon, { className: "h-10 w-10 text-yellow-400" }), _jsxs("span", { className: "text-slate-800 dark:text-white", children: [sessionSummary.score ?? 'N/A', "%"] })] })] }), _jsxs("div", { className: "bg-slate-200 dark:bg-slate-900/50 p-4 rounded-lg", children: [_jsx("h2", { className: "text-lg font-bold text-indigo-500 dark:text-indigo-400", children: "Total Duration" }), _jsxs("div", { className: "flex items-center justify-center gap-2 text-4xl font-bold mt-2", children: [_jsx(ClockIcon, { className: "h-10 w-10 text-slate-500 dark:text-slate-400" }), _jsx("span", { className: "text-slate-800 dark:text-white", children: formatDuration(totalDuration) })] })] })] }), _jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold text-indigo-500 dark:text-indigo-400 mb-4", children: "Time per Step" }), Object.keys(sessionSummary.durationsPerStep).length > 0 ? (_jsx("div", { className: "space-y-2", children: Object.entries(sessionSummary.durationsPerStep).map(([stepIndex, duration]) => (_jsxs("div", { className: "flex justify-between items-center bg-white dark:bg-slate-700/50 p-3 rounded-md text-sm", children: [_jsxs("span", { className: "font-semibold text-slate-800 dark:text-slate-200", children: ["Step ", Number(stepIndex) + 1, ": ", moduleData.steps[Number(stepIndex)]?.title] }), _jsx("span", { className: "text-slate-600 dark:text-slate-300 font-mono", children: formatDuration(Number(duration)) })] }, stepIndex))) })) : (_jsx("p", { className: "text-center text-sm text-slate-500 py-4", children: "No step duration data was recorded." }))] }), _jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold text-indigo-500 dark:text-indigo-400 mb-6", children: "Event Timeline" }), events.length > 0 ? (_jsx("div", { className: "flow-root", children: _jsx("ul", { className: "-mb-8", children: events.map((event, eventIdx) => (_jsx("li", { children: _jsxs("div", { className: "relative pb-8", children: [eventIdx !== events.length - 1 ? (_jsx("span", { className: "absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200 dark:bg-slate-700", "aria-hidden": "true" })) : null, _jsxs("div", { className: "relative flex space-x-3", children: [_jsx("div", { children: _jsx("span", { className: "h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center ring-4 ring-slate-100 dark:ring-slate-800", children: _jsx(EventIcon, { type: event.eventType }) }) }), _jsxs("div", { className: "min-w-0 flex-1 pt-1.5 flex justify-between space-x-4", children: [_jsx("div", { children: _jsxs("p", { className: "text-sm text-slate-600 dark:text-slate-300", children: [_jsx("span", { className: "font-bold capitalize", children: event.eventType.replace('_', ' ') }), " on step ", event.stepIndex + 1, ": ", _jsxs("span", { className: "italic", children: ["\"", moduleData.steps[event.stepIndex]?.title, "\""] })] }) }), _jsx("div", { className: "text-right text-sm whitespace-nowrap text-slate-500", children: _jsx("time", { dateTime: new Date(event.timestamp).toISOString(), children: new Date(event.timestamp).toLocaleTimeString() }) })] })] })] }) }, eventIdx))) }) })) : (_jsx("div", { className: "text-center text-slate-500 bg-slate-200 dark:bg-slate-900/50 p-6 rounded-lg", children: "No coaching events were recorded for this session. The trainee completed it without assistance." }))] })] })] }));
};
export default SessionReviewPage;
//# sourceMappingURL=SessionReviewPage.js.map