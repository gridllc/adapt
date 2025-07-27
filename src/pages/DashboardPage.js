import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAvailableModules, saveModule, deleteModule } from '@/services/moduleService';
import { getQuestionFrequency, findHotspots, getAllTutorLogs, findPlatformHotspot } from '@/services/analyticsService';
import { getCompletedSessionCount, getTotalSessionCount } from '@/services/sessionsService';
import { getAllPendingSuggestions, getLatestAiSuggestionForStep, refineStep } from '@/services/suggestionsService';
import { generateBranchModule } from '@/services/geminiService';
import { BarChartIcon, LightbulbIcon, SparklesIcon, GitBranchIcon, BookOpenIcon, ClockIcon, HelpCircleIcon, TrashIcon } from '@/components/Icons';
import { SuggestionModal } from '@/components/dashboard/SuggestionModal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { ModuleCardSkeleton } from '@/components/ModuleCardSkeleton';
const StatCard = ({ title, value, icon: Icon, isLoading }) => (_jsxs("div", { className: "bg-slate-100 dark:bg-slate-900/50 p-6 rounded-xl flex items-center gap-4", children: [_jsx("div", { className: "p-3 bg-indigo-100 dark:bg-indigo-600/30 rounded-lg", children: _jsx(Icon, { className: "h-6 w-6 text-indigo-600 dark:text-indigo-300" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-slate-500 dark:text-slate-400", children: title }), isLoading ? (_jsx("div", { className: "h-7 w-12 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse mt-1" })) : (_jsx("p", { className: "text-2xl font-bold text-slate-900 dark:text-white", children: value }))] })] }));
const DashboardPage = () => {
    const queryClient = useQueryClient();
    const { user, isAuthenticated } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [selectedModule, setSelectedModule] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeSuggestion, setActiveSuggestion] = useState(null);
    // --- Platform-Wide Data Fetching ---
    const { data: availableModules = [], isLoading: isLoadingModules, error: modulesError } = useQuery({ queryKey: ['modules'], queryFn: getAvailableModules });
    const { data: totalSessions, isLoading: isLoadingTotalSessions } = useQuery({ queryKey: ['totalSessions'], queryFn: getTotalSessionCount });
    const { data: completedSessions, isLoading: isLoadingCompletedSessions } = useQuery({ queryKey: ['completedSessions'], queryFn: getCompletedSessionCount });
    const { data: pendingSuggestions = [], isLoading: isLoadingSuggestions } = useQuery({ queryKey: ['pendingSuggestions'], queryFn: getAllPendingSuggestions });
    const { data: allLogs = [], isLoading: isLoadingLogs } = useQuery({ queryKey: ['allTutorLogs'], queryFn: getAllTutorLogs });
    // --- Module-Specific Data Fetching ---
    const { data: analysisData, isLoading: isAnalyzing } = useQuery({
        queryKey: ['dashboardAnalysis', selectedModule?.slug],
        queryFn: async () => {
            if (!selectedModule?.slug)
                return { stats: [], hotspot: null };
            const stats = await getQuestionFrequency(selectedModule.slug);
            const hotspot = findHotspots(stats, selectedModule);
            return { stats, hotspot };
        },
        enabled: !!selectedModule?.slug,
    });
    const moduleHotspot = analysisData?.hotspot ?? null;
    const { data: existingAiSuggestion, isLoading: isLoadingExistingSuggestion } = useQuery({
        queryKey: ['aiSuggestion', selectedModule?.slug, moduleHotspot?.stepIndex],
        queryFn: () => {
            if (!moduleHotspot || !selectedModule?.slug)
                return null;
            return getLatestAiSuggestionForStep(selectedModule.slug, moduleHotspot.stepIndex);
        },
        enabled: !!moduleHotspot && !!selectedModule?.slug,
    });
    // --- Mutations ---
    const refinementMutation = useMutation({
        mutationFn: async () => {
            if (!selectedModule?.slug || moduleHotspot?.stepIndex === undefined) {
                throw new Error("A module and a hotspot step must be selected to generate a suggestion.");
            }
            const data = await refineStep(selectedModule.slug, moduleHotspot.stepIndex);
            if (data.error)
                throw new Error(`Suggestion generation failed: ${data.error}`);
            return data.suggestion;
        },
        onSuccess: (data) => {
            if (!data) {
                addToast('info', 'No Suggestion', 'The AI did not find any questions for this step to generate a suggestion.');
                return;
            }
            addToast('success', 'Suggestion Ready', 'The AI has generated and saved a refinement suggestion.');
            queryClient.invalidateQueries({ queryKey: ['aiSuggestion', selectedModule?.slug, moduleHotspot?.stepIndex] });
        },
        onError: (error) => addToast('error', 'Suggestion Failed', error.message),
    });
    const branchModuleMutation = useMutation({
        mutationFn: async ({ stepTitle, questions }) => {
            if (!user)
                throw new Error("Authentication required.");
            addToast('info', 'Drafting Module...', 'The AI is creating a new remedial module.');
            const generatedData = await generateBranchModule(stepTitle, questions);
            const newModuleSlug = generatedData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const newSteps = generatedData.steps.map((desc, index) => ({ title: `Step ${index + 1}`, description: desc, start: 0, end: 0, checkpoint: null, alternativeMethods: [] }));
            const newModule = { slug: newModuleSlug, title: generatedData.title, steps: newSteps, user_id: user.uid, metadata: { generated_by_ai: true, source_module: selectedModule?.slug, source_step: moduleHotspot?.stepIndex } };
            await saveModule({ moduleData: newModule });
            return newModule;
        },
        onSuccess: (data) => {
            addToast('success', 'Remedial Module Created', `"${data.title}" has been saved.`);
            queryClient.invalidateQueries({ queryKey: ['modules'] });
        },
        onError: (error) => addToast('error', 'Module Drafting Failed', error.message)
    });
    const handleDeleteModule = useCallback(async (e, slug) => {
        e.preventDefault();
        e.stopPropagation();
        if (!slug)
            return;
        const confirmation = window.confirm('Are you sure you want to delete this module? This will also remove ALL associated training progress and chat histories from the database. This action cannot be undone.');
        if (confirmation) {
            try {
                await deleteModule(slug);
                await queryClient.invalidateQueries({ queryKey: ['modules'] });
                addToast('success', 'Module Deleted', `The module was successfully removed.`);
            }
            catch (err) {
                console.error("Failed to delete module:", err);
                const errorMessage = err instanceof Error ? err.message : 'An error occurred during deletion.';
                addToast('error', 'Deletion Failed', errorMessage);
            }
        }
    }, [queryClient, addToast]);
    // --- Derived Data & Callbacks ---
    useEffect(() => {
        if (availableModules.length > 0 && !selectedModule) {
            setSelectedModule(availableModules[0]);
        }
    }, [availableModules, selectedModule]);
    const platformHotspot = useMemo(() => findPlatformHotspot(allLogs, availableModules), [allLogs, availableModules]);
    const handleGenerateSuggestion = () => {
        if (!moduleHotspot || !selectedModule?.slug)
            return;
        refinementMutation.mutate();
    };
    const handleGenerateBranchModule = () => {
        if (!moduleHotspot)
            return;
        branchModuleMutation.mutate({ stepTitle: moduleHotspot.stepTitle, questions: moduleHotspot.questions });
    };
    const openSuggestionModal = (suggestion) => {
        setActiveSuggestion(suggestion);
        setIsModalOpen(true);
    };
    const handleApplyRefinement = useCallback(() => {
        if (!selectedModule?.slug || !moduleHotspot || !activeSuggestion)
            return;
        navigate(`/modules/${selectedModule.slug}/edit`, { state: { suggestion: activeSuggestion.newDescription, stepIndex: moduleHotspot.stepIndex } });
        setIsModalOpen(false);
    }, [selectedModule, moduleHotspot, activeSuggestion, navigate]);
    const handleModuleChange = (event) => {
        const module = availableModules.find(m => m.slug === event.target.value);
        setSelectedModule(module || null);
    };
    const newAiSuggestion = refinementMutation.data;
    return (_jsxs("div", { className: "w-full max-w-screen-lg mx-auto px-4 py-8", children: [_jsxs("h1", { className: "text-3xl font-bold text-slate-900 dark:text-white mb-8 text-center flex items-center gap-3 justify-center", children: [_jsx(BarChartIcon, { className: "h-8 w-8" }), "Platform Overview"] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8 animate-fade-in-up", children: [_jsx(StatCard, { title: "Total Modules", value: availableModules.length, icon: BookOpenIcon, isLoading: isLoadingModules }), _jsx(StatCard, { title: "Completed Sessions", value: completedSessions ?? 0, icon: ClockIcon, isLoading: isLoadingCompletedSessions }), _jsx(StatCard, { title: "Pending Suggestions", value: pendingSuggestions.length, icon: HelpCircleIcon, isLoading: isLoadingSuggestions })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-8", children: [_jsxs("div", { className: "lg:col-span-2 space-y-8", children: [_jsxs("div", { className: "bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700", children: [_jsx("h2", { className: "text-xl font-bold text-indigo-500 dark:text-indigo-400 mb-4", children: "Module-Specific Analytics" }), _jsxs("select", { id: "module-select", value: selectedModule?.slug || '', onChange: handleModuleChange, className: "w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500", disabled: availableModules.length === 0 || isLoadingModules, children: [isLoadingModules && _jsx("option", { children: "Loading modules..." }), !isLoadingModules && availableModules.map(m => (m.slug && _jsx("option", { value: m.slug, children: m.title }, m.slug))), !isLoadingModules && availableModules.length === 0 && _jsx("option", { children: "No modules available" })] })] }), isAnalyzing ? (_jsxs("div", { className: "text-center p-6 bg-slate-200 dark:bg-slate-900/50 rounded-lg", children: [_jsx(SparklesIcon, { className: "h-8 w-8 mx-auto text-indigo-500 dark:text-indigo-400 animate-pulse" }), _jsx("p", { className: "mt-2 text-slate-600 dark:text-slate-300", children: "AI is analyzing trainee data..." })] })) : moduleHotspot ? (_jsxs("div", { className: "bg-gradient-to-br from-indigo-200 dark:from-indigo-900/70 to-slate-200/50 dark:to-slate-900/50 p-6 rounded-xl border border-indigo-300 dark:border-indigo-700 animate-fade-in-up", children: [_jsx("h3", { className: "text-lg font-bold text-yellow-700 dark:text-yellow-300 mb-2", children: "Top Module Hotspot" }), _jsxs("div", { className: "bg-white/60 dark:bg-slate-900/60 p-4 rounded-lg", children: [_jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase", children: "Confusing Step" }), _jsx("p", { className: "text-md font-bold text-slate-800 dark:text-slate-200 mb-3", children: moduleHotspot.stepTitle }), _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase", children: "Common Questions" }), _jsx("ul", { className: "list-disc list-inside text-sm text-slate-700 dark:text-slate-300 mb-4", children: moduleHotspot.questions.slice(0, 3).map((q, i) => _jsxs("li", { className: "italic truncate", children: ["\"", q, "\""] }, i)) })] }), _jsxs("div", { className: "flex flex-wrap justify-center items-center gap-4 mt-4", children: [isLoadingExistingSuggestion ? _jsx("p", { className: "text-sm text-slate-600 dark:text-slate-300", children: "Checking for suggestions..." })
                                                : existingAiSuggestion ? _jsx("button", { onClick: () => openSuggestionModal({ newDescription: existingAiSuggestion.suggestion, newAlternativeMethod: null }), className: "bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors transform hover:scale-105", children: "Preview & Apply Fix" })
                                                    : newAiSuggestion ? _jsx("button", { onClick: () => openSuggestionModal(newAiSuggestion), className: "bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors transform hover:scale-105", children: "Preview & Apply Fix" })
                                                        : _jsxs("button", { onClick: handleGenerateSuggestion, disabled: refinementMutation.isPending, className: "bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 transition-colors transform hover:scale-105 disabled:opacity-50 flex items-center gap-2", children: [_jsx(SparklesIcon, { className: "h-5 w-5" }), refinementMutation.isPending ? 'Generating...' : 'Refine This Step'] }), _jsxs("button", { onClick: handleGenerateBranchModule, disabled: branchModuleMutation.isPending, className: "bg-cyan-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-cyan-700 transition-colors transform hover:scale-105 disabled:opacity-50 flex items-center gap-2", children: [_jsx(GitBranchIcon, { className: "h-5 w-5" }), branchModuleMutation.isPending ? 'Drafting...' : 'Draft Remedial Module'] })] })] })) : _jsx("p", { className: "text-center p-4", children: "No significant confusion hotspots found for this module." })] }), _jsxs("div", { className: "lg:col-span-1 space-y-8", children: [isLoadingLogs ? _jsx("div", { className: "h-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" }) : platformHotspot && (_jsxs("div", { className: "bg-gradient-to-br from-yellow-100 dark:from-yellow-900/70 to-slate-100/50 dark:to-slate-900/50 p-6 rounded-xl border border-yellow-300 dark:border-yellow-700 animate-fade-in-up", children: [_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsx(LightbulbIcon, { className: "h-8 w-8 text-yellow-500 dark:text-yellow-400 flex-shrink-0" }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-bold text-yellow-700 dark:text-yellow-300", children: "Top Platform Hotspot" }), _jsx("p", { className: "text-sm text-slate-800 dark:text-slate-200", children: "This step causes the most confusion across ALL modules." })] })] }), _jsxs("div", { className: "bg-white/60 dark:bg-slate-900/60 p-4 rounded-lg", children: [_jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase", children: "Confusing Step" }), _jsx("p", { className: "text-md font-bold text-slate-800 dark:text-slate-200", children: platformHotspot.stepTitle }), _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase mt-2", children: "In Module" }), _jsx("p", { className: "text-md text-slate-800 dark:text-slate-200", children: (availableModules.find(m => m.slug === platformHotspot.moduleId))?.title })] }), _jsx("div", { className: "mt-4 flex justify-end", children: _jsxs("button", { onClick: () => navigate(`/modules/${platformHotspot.moduleId}/edit`), className: "bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2", children: [_jsx(SparklesIcon, { className: "h-5 w-5" }), "Go to Editor"] }) })] })), _jsxs("div", { className: "bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700", children: [_jsx("h2", { className: "text-xl font-bold text-indigo-500 dark:text-indigo-400 mb-4", children: "Pending Suggestions" }), isLoadingSuggestions ? _jsx("p", { className: "text-slate-500", children: "Loading suggestions..." })
                                        : pendingSuggestions.length > 0 ? (_jsx("div", { className: "space-y-3 max-h-96 overflow-y-auto pr-2", children: pendingSuggestions.map(sug => (_jsxs("div", { className: "p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg", children: [_jsxs("p", { className: "text-sm italic text-slate-800 dark:text-slate-200", children: ["\"", sug.text, "\""] }), _jsxs("button", { onClick: () => navigate(`/modules/${sug.moduleId}/edit`), className: "text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mt-1", children: ["Review in ", sug.module_title || 'module', " \u2192"] })] }, sug.id))) })) : _jsx("p", { className: "text-slate-500 text-center py-4", children: "No pending suggestions from trainees." })] })] })] }), _jsxs("div", { className: "mt-12 bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700", children: [_jsx("h2", { className: "text-2xl font-bold text-slate-900 dark:text-white mb-6", children: "Your Training Modules" }), isLoadingModules ? (_jsxs("div", { className: "space-y-4", children: [_jsx(ModuleCardSkeleton, {}), _jsx(ModuleCardSkeleton, {})] })) : modulesError ? (_jsxs("div", { className: "text-center text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/50 p-4 rounded-lg", children: ["Error fetching modules: ", modulesError.message] })) : availableModules.length > 0 ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: availableModules.map(module => {
                            if (!module.slug)
                                return null;
                            return (_jsxs("div", { className: "w-full text-left p-6 bg-white dark:bg-slate-800 rounded-xl hover:ring-2 hover:ring-indigo-500 transition-all duration-300 shadow-md dark:shadow-lg relative group", children: [_jsxs("div", { className: "flex justify-between items-start mb-4", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "bg-indigo-100 dark:bg-indigo-600/30 p-3 rounded-lg", children: _jsx(BookOpenIcon, { className: "h-6 w-6 text-indigo-600 dark:text-indigo-300" }) }), _jsxs("div", { children: [_jsxs("h3", { className: "text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2", children: [module.title, module.is_ai_generated && _jsx("span", { title: "AI Generated", children: _jsx(SparklesIcon, { className: "h-5 w-5 text-yellow-500" }) })] }), _jsxs("p", { className: "text-slate-500 dark:text-slate-400", children: [module.steps.length, " steps"] })] })] }), _jsx("div", { className: "absolute top-4 right-4 flex gap-2 items-end opacity-0 group-hover:opacity-100 transition-opacity", children: _jsx("button", { onClick: (e) => handleDeleteModule(e, module.slug), className: "p-2 bg-slate-200/50 dark:bg-slate-700/50 rounded-full text-slate-500 dark:text-slate-400 hover:bg-red-500/80 hover:text-white transition-all", "aria-label": "Delete module", title: "Delete module", children: _jsx(TrashIcon, { className: "h-5 w-5" }) }) })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Link, { to: `/modules/${module.slug}`, className: "flex-1 text-center bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors", children: "Start Training" }), _jsxs(Link, { to: `/modules/${module.slug}/edit`, className: "flex-1 text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2", children: [_jsx(LightbulbIcon, { className: "h-5 w-5" }), "Edit Module"] })] })] }, module.slug));
                        }) })) : (_jsx("div", { className: "text-center bg-slate-100 dark:bg-slate-800 p-8 rounded-lg", children: _jsx("p", { className: "text-slate-500 dark:text-slate-400", children: "No training modules found in the database." }) }))] }), isModalOpen && moduleHotspot && activeSuggestion && selectedModule && (_jsx(SuggestionModal, { isOpen: isModalOpen, onClose: () => setIsModalOpen(false), currentStep: selectedModule.steps[moduleHotspot.stepIndex], suggestion: activeSuggestion, onApply: handleApplyRefinement }))] }));
};
export default DashboardPage;
//# sourceMappingURL=DashboardPage.js.map