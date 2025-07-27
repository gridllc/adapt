import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, registerables } from 'chart.js';
import { useQuery } from '@tanstack/react-query';
import { SparklesIcon, PlayCircleIcon } from "@/components/Icons";
import { getAllRoutines } from '@/services/routineService';
import { getAllTutorLogs } from '@/services/analyticsService';
ChartJS.register(...registerables);
const RoutineDashboardPage = () => {
    const { data: routines = [], isLoading: isLoadingRoutines } = useQuery({
        queryKey: ['allRoutines'],
        queryFn: getAllRoutines,
    });
    const { data: allTutorLogs = [], isLoading: isLoadingLogs } = useQuery({
        queryKey: ['allTutorLogs'],
        queryFn: getAllTutorLogs,
    });
    const isLoading = isLoadingRoutines || isLoadingLogs;
    const routineUsageLogs = useMemo(() => Array.isArray(allTutorLogs) ? allTutorLogs.filter(log => log.remote_type === 'ai-routine') : [], [allTutorLogs]);
    const intentCounts = useMemo(() => routineUsageLogs.reduce((acc, log) => {
        const intent = log.step_title || "(unspecified)";
        acc[intent] = (acc[intent] || 0) + 1;
        return acc;
    }, {}), [routineUsageLogs]);
    const routineGroups = useMemo(() => Array.isArray(routines) ? routines.reduce((acc, r) => {
        if (!acc[r.templateId])
            acc[r.templateId] = [];
        acc[r.templateId].push(r);
        return acc;
    }, {}) : {}, [routines]);
    const suggestedRoutines = useMemo(() => {
        if (!Array.isArray(routines) || routines.length === 0 || !Array.isArray(allTutorLogs) || allTutorLogs.length === 0)
            return [];
        const allIntentCounts = allTutorLogs.reduce((acc, log) => {
            const intent = log.step_title || "(unspecified)";
            if (intent !== "(unspecified)" && log.remote_type !== "ai-routine") {
                acc[intent] = (acc[intent] || 0) + 1;
            }
            return acc;
        }, {});
        const definedIntents = new Set(routines.map(r => r.intent.toLowerCase()));
        return Object.entries(allIntentCounts)
            .filter(([intent]) => !definedIntents.has(intent.toLowerCase()))
            .sort(([, countA], [, countB]) => countB - countA)
            .slice(0, 5)
            .map(([intent, count]) => ({ intent, count }));
    }, [routines, allTutorLogs]);
    return (_jsxs("div", { className: "max-w-6xl mx-auto p-4", children: [_jsx("h2", { className: "text-2xl font-bold mb-6", children: "\uD83D\uDCCA Routine Usage Dashboard" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-8", children: [_jsxs("div", { className: "bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700", children: [_jsx("h3", { className: "text-xl font-semibold mb-2", children: "Most Used Routines" }), isLoading ? _jsx("p", { children: "Loading chart..." }) : Object.keys(intentCounts).length > 0 ? (_jsx("div", { className: "h-64", children: _jsx(Bar, { data: {
                                        labels: Object.keys(intentCounts),
                                        datasets: [{ label: "Uses", data: Object.values(intentCounts), backgroundColor: "#4f46e5" }],
                                    }, options: { plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false } }) })) : _jsx("p", { className: "text-center text-slate-500 py-8", children: "No routine usage has been logged yet." })] }), _jsxs("div", { className: "bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700", children: [_jsxs("h3", { className: "text-xl font-semibold mb-2 flex items-center gap-2", children: [_jsx(SparklesIcon, { className: "h-6 w-6 text-yellow-500" }), " Suggested Routines to Create"] }), isLoading ? _jsx("p", { children: "Analyzing logs..." }) : suggestedRoutines.length > 0 ? (_jsx("ul", { className: "list-disc pl-6 space-y-2", children: suggestedRoutines.map(({ intent, count }) => (_jsxs("li", { children: [_jsx("strong", { children: intent }), " \u2014 ", _jsxs("span", { className: "text-slate-500", children: [count, " recent requests (no routine yet)"] })] }, intent))) })) : _jsx("p", { className: "text-center text-slate-500 py-8", children: "No new routine suggestions at this time." })] })] }), _jsxs("div", { className: "mt-10", children: [_jsx("h2", { className: "text-2xl font-bold mb-4", children: "Existing Routines" }), isLoading ? _jsx("p", { children: "Loading routines..." }) : Object.keys(routineGroups).length > 0 ? (Object.entries(routineGroups).map(([templateId, list]) => (_jsxs("div", { className: "mb-8", children: [_jsxs("div", { className: "flex justify-between items-center mb-2", children: [_jsxs("h3", { className: "text-xl font-semibold", children: ["Remote: ", templateId] }), _jsx(Link, { to: `/dashboard/routines/editor?templateId=${templateId}`, className: "bg-green-600 text-white font-semibold py-1 px-3 rounded-lg text-sm hover:bg-green-700", children: "+ Create New" })] }), _jsx("div", { className: "border rounded p-4 bg-white dark:bg-slate-800/50", children: list.map((r) => (_jsxs("div", { className: "border-b dark:border-slate-700 last:border-b-0 pb-4 mb-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("h4", { className: "font-semibold", children: ["Intent: ", r.intent] }), _jsx(Link, { to: `/dashboard/routines/editor/${r.id}`, className: "text-sm text-indigo-600 hover:underline", children: "Edit" })] }), _jsx("ol", { className: "list-decimal pl-6 text-sm mt-2 text-slate-600 dark:text-slate-300", children: Array.isArray(r.steps) && r.steps.map((s, i) => (_jsx("li", { children: s }, i))) }), r.videoUrl && (_jsxs("a", { href: r.videoUrl, target: "_blank", rel: "noopener noreferrer", className: "mt-2 w-full max-w-md rounded border inline-flex items-center gap-2 text-sm text-indigo-500 hover:underline", children: [_jsx(PlayCircleIcon, { className: "h-5 w-5" }), " View Video"] }))] }, r.id))) })] }, templateId)))) : (_jsxs("div", { className: "text-center p-8 bg-slate-100 dark:bg-slate-800 rounded-lg", children: [_jsx("p", { className: "text-slate-500", children: "No routines have been created yet." }), _jsx(Link, { to: "/dashboard/routines/editor", className: "mt-4 inline-block bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700", children: "Create Your First Routine" })] }))] })] }));
};
export default RoutineDashboardPage;
//# sourceMappingURL=RoutineDashboardPage.js.map