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
const react_1 = __importStar(require("react"));
const react_query_1 = require("@tanstack/react-query");
const moduleService_1 = require("@/services/moduleService");
const analyticsService_1 = require("@/services/analyticsService");
const Icons_1 = require("@/components/Icons");
const FaqPage = () => {
    const [selectedModule, setSelectedModule] = (0, react_1.useState)(null);
    const { data: availableModules = [], isLoading: isLoadingModules } = (0, react_query_1.useQuery)({
        queryKey: ['modules'],
        queryFn: moduleService_1.getAvailableModules,
    });
    const { data: tutorLogs = [], isLoading: isLoadingLogs } = (0, react_query_1.useQuery)({
        queryKey: ['tutorLogs', selectedModule?.slug],
        queryFn: () => {
            if (!selectedModule?.slug)
                return []; // Should not happen due to 'enabled', but for type safety.
            return (0, analyticsService_1.getTutorLogs)(selectedModule.slug);
        },
        enabled: !!selectedModule?.slug,
    });
    (0, react_1.useEffect)(() => {
        if (availableModules.length > 0 && !selectedModule) {
            setSelectedModule(availableModules[0]);
        }
    }, [availableModules, selectedModule]);
    const handleModuleChange = (event) => {
        const newSelectedModuleId = event.target.value;
        const module = availableModules.find(m => m.slug === newSelectedModuleId);
        setSelectedModule(module || null);
    };
    return (<div className="w-full max-w-screen-md mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-8 flex items-center gap-3 justify-center">
                <Icons_1.HelpCircleIcon className="h-8 w-8 text-indigo-500 dark:text-indigo-400"/>
                Tutor Question Log
            </h1>

            <div className="bg-white dark:bg-slate-800/50 p-8 rounded-2xl shadow-xl animate-fade-in-up border border-slate-200 dark:border-slate-700">
                <div className="mb-6">
                    <label htmlFor="module-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Module to View Logs</label>
                    <select id="module-select" value={selectedModule?.slug || ''} onChange={handleModuleChange} className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" disabled={availableModules.length === 0 || isLoadingModules}>
                        {isLoadingModules && <option>Loading modules...</option>}
                        {!isLoadingModules && availableModules.map(module => (module.slug && <option key={module.slug} value={module.slug}>{module.title}</option>))}
                        {!isLoadingModules && availableModules.length === 0 && <option>No modules available</option>}
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Trainee Question</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">AI Response</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Step</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {isLoadingLogs ? (<tr>
                                    <td colSpan={4} className="text-center p-6 text-slate-500 dark:text-slate-400">Loading logs...</td>
                                </tr>) : tutorLogs.length > 0 ? (tutorLogs.map(log => (<tr key={log.id}>
                                        <td className="px-6 py-4 whitespace-normal text-sm text-slate-700 dark:text-slate-300 italic">&quot;{log.user_question}&quot;</td>
                                        <td className="px-6 py-4 whitespace-normal text-sm text-slate-500 dark:text-slate-400">{log.tutor_response.substring(0, 150)}...</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 text-center">{log.step_index != null ? log.step_index + 1 : 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}</td>
                                    </tr>))) : (<tr>
                                    <td colSpan={4} className="text-center p-6 text-slate-500 dark:text-slate-400">No questions have been logged for this module yet.</td>
                                </tr>)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>);
};
exports.default = FaqPage;
