import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { getCheckpointFailureStats } from '@/services/checkpointService';
import { useToast } from '@/hooks/useToast';
export const CheckpointDashboard = ({ moduleId, moduleTitle, isAdmin }) => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();
    useEffect(() => {
        async function fetchStats() {
            if (!moduleId)
                return;
            setLoading(true);
            const result = await getCheckpointFailureStats(moduleId);
            setStats(result);
            setLoading(false);
        }
        fetchStats();
    }, [moduleId]);
    if (!isAdmin)
        return null;
    if (loading)
        return _jsx("p", { className: "text-sm text-center text-slate-500 dark:text-slate-400 py-4", children: "Loading checkpoint analytics..." });
    if (stats.length === 0)
        return _jsx("p", { className: "text-sm text-center text-slate-500 dark:text-slate-400 py-4", children: "No \"No\" responses recorded for checkpoints yet." });
    return (_jsxs("div", { className: "bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mt-6", children: [_jsx("h3", { className: "text-lg font-semibold text-slate-800 dark:text-white mb-3", children: "\uD83D\uDEA8 Most-Missed Checkpoints" }), _jsx("div", { className: "space-y-3 max-h-60 overflow-y-auto pr-2", children: stats.map((s, i) => (_jsxs("div", { className: "text-sm text-slate-700 dark:text-slate-300 p-3 bg-white dark:bg-slate-800 rounded-lg", children: [_jsxs("p", { children: [_jsxs("span", { className: "font-bold text-red-600 dark:text-red-400", children: ["Step ", s.step_index + 1, ":"] }), " ", s.checkpoint_text] }), _jsxs("p", { className: "text-xs text-slate-500 text-right", children: [s.count, " ", s.count > 1 ? 'trainees' : 'trainee', " answered \"No\""] })] }, i))) })] }));
};
//# sourceMappingURL=CheckpointDashboard.js.map