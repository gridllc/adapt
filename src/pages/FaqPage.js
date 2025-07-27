import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAvailableModules } from '@/services/moduleService';
import { getTutorLogs } from '@/services/analyticsService';
import { HelpCircleIcon } from '@/components/Icons';
const FaqPage = () => {
    const [selectedModule, setSelectedModule] = useState(null);
    const { data: availableModules = [], isLoading: isLoadingModules } = useQuery({
        queryKey: ['modules'],
        queryFn: getAvailableModules,
    });
    const { data: tutorLogs = [], isLoading: isLoadingLogs } = useQuery({
        queryKey: ['tutorLogs', selectedModule?.slug],
        queryFn: () => {
            if (!selectedModule?.slug)
                return []; // Should not happen due to 'enabled', but for type safety.
            return getTutorLogs(selectedModule.slug);
        },
        enabled: !!selectedModule?.slug,
    });
    useEffect(() => {
        if (availableModules.length > 0 && !selectedModule) {
            setSelectedModule(availableModules[0]);
        }
    }, [availableModules, selectedModule]);
    const handleModuleChange = (event) => {
        const newSelectedModuleId = event.target.value;
        const module = availableModules.find(m => m.slug === newSelectedModuleId);
        setSelectedModule(module || null);
    };
    return (_jsxs("div", { className: "w-full max-w-screen-md mx-auto px-4 py-8", children: [_jsxs("h1", { className: "text-3xl font-bold text-slate-900 dark:text-white text-center mb-8 flex items-center gap-3 justify-center", children: [_jsx(HelpCircleIcon, { className: "h-8 w-8 text-indigo-500 dark:text-indigo-400" }), "Tutor Question Log"] }), _jsxs("div", { className: "bg-white dark:bg-slate-800/50 p-8 rounded-2xl shadow-xl animate-fade-in-up border border-slate-200 dark:border-slate-700", children: [_jsxs("div", { className: "mb-6", children: [_jsx("label", { htmlFor: "module-select", className: "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1", children: "Select Module to View Logs" }), _jsxs("select", { id: "module-select", value: selectedModule?.slug || '', onChange: handleModuleChange, className: "w-full max-w-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500", disabled: availableModules.length === 0 || isLoadingModules, children: [isLoadingModules && _jsx("option", { children: "Loading modules..." }), !isLoadingModules && availableModules.map(module => (module.slug && _jsx("option", { value: module.slug, children: module.title }, module.slug))), !isLoadingModules && availableModules.length === 0 && _jsx("option", { children: "No modules available" })] })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-slate-200 dark:divide-slate-700", children: [_jsx("thead", { className: "bg-slate-50 dark:bg-slate-700", children: _jsxs("tr", { children: [_jsx("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider", children: "Trainee Question" }), _jsx("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider", children: "AI Response" }), _jsx("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider", children: "Step" }), _jsx("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider", children: "Timestamp" })] }) }), _jsx("tbody", { className: "bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700", children: isLoadingLogs ? (_jsx("tr", { children: _jsx("td", { colSpan: 4, className: "text-center p-6 text-slate-500 dark:text-slate-400", children: "Loading logs..." }) })) : tutorLogs.length > 0 ? (tutorLogs.map(log => (_jsxs("tr", { children: [_jsxs("td", { className: "px-6 py-4 whitespace-normal text-sm text-slate-700 dark:text-slate-300 italic", children: ["\"", log.user_question, "\""] }), _jsxs("td", { className: "px-6 py-4 whitespace-normal text-sm text-slate-500 dark:text-slate-400", children: [log.tutor_response.substring(0, 150), "..."] }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 text-center", children: log.step_index != null ? log.step_index + 1 : 'N/A' }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400", children: log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A' })] }, log.id)))) : (_jsx("tr", { children: _jsx("td", { colSpan: 4, className: "text-center p-6 text-slate-500 dark:text-slate-400", children: "No questions have been logged for this module yet." }) })) })] }) })] })] }));
};
export default FaqPage;
//# sourceMappingURL=FaqPage.js.map