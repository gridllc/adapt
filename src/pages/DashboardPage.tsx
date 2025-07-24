import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAvailableModules, saveModule, deleteModule } from '@/services/moduleService';
import { getQuestionFrequency, findHotspots, getAllTutorLogs, findPlatformHotspot } from '@/services/analyticsService';
import { getCompletedSessionCount, getTotalSessionCount } from '@/services/sessionService';
import { getAllPendingSuggestions, getLatestAiSuggestionForStep, refineStep } from '@/services/suggestionsService';
import { generateBranchModule } from '@/services/geminiService';
import { BarChartIcon, LightbulbIcon, SparklesIcon, GitBranchIcon, BookOpenIcon, ClockIcon, HelpCircleIcon, VideoIcon, DownloadIcon, TrashIcon } from '@/components/Icons';
import { RefinementModal } from '@/components/RefinementModal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import type { AnalysisHotspot, RefinementSuggestion, ProcessStep, QuestionStats, AiSuggestion, TraineeSuggestion, TutorLogRow, AppModuleWithStats, AppModule, ModuleForInsert, Json } from '@/types';
import { ModuleCardSkeleton } from '@/components/ModuleCardSkeleton';


const StatCard: React.FC<{ title: string; value: number | string; icon: React.ElementType; isLoading: boolean }> = ({ title, value, icon: Icon, isLoading }) => (
    <div className="bg-slate-100 dark:bg-slate-900/50 p-6 rounded-xl flex items-center gap-4">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-600/30 rounded-lg">
            <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
        </div>
        <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
            {isLoading ? (
                <div className="h-7 w-12 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse mt-1" />
            ) : (
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            )}
        </div>
    </div>
);


const DashboardPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { user, isAuthenticated } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [selectedModule, setSelectedModule] = useState<AppModuleWithStats | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeSuggestion, setActiveSuggestion] = useState<RefinementSuggestion | null>(null);

    // --- Platform-Wide Data Fetching ---
    const { data: availableModules = [], isLoading: isLoadingModules, error: modulesError } = useQuery<AppModuleWithStats[], Error>({ queryKey: ['modules'], queryFn: getAvailableModules });
    const { data: totalSessions, isLoading: isLoadingTotalSessions } = useQuery<number>({ queryKey: ['totalSessions'], queryFn: getTotalSessionCount });
    const { data: completedSessions, isLoading: isLoadingCompletedSessions } = useQuery<number>({ queryKey: ['completedSessions'], queryFn: getCompletedSessionCount });
    const { data: pendingSuggestions = [], isLoading: isLoadingSuggestions } = useQuery<(TraineeSuggestion & { module_title?: string })[]>({ queryKey: ['pendingSuggestions'], queryFn: getAllPendingSuggestions });
    const { data: allLogs = [], isLoading: isLoadingLogs } = useQuery<TutorLogRow[]>({ queryKey: ['allTutorLogs'], queryFn: getAllTutorLogs });

    // --- Module-Specific Data Fetching ---
    const { data: analysisData, isLoading: isAnalyzing } = useQuery<{ stats: QuestionStats[]; hotspot: AnalysisHotspot | null }, Error>({
        queryKey: ['dashboardAnalysis', selectedModule?.slug],
        queryFn: async () => {
            if (!selectedModule?.slug) return { stats: [], hotspot: null };
            const stats = await getQuestionFrequency(selectedModule.slug);
            const hotspot = findHotspots(stats, selectedModule);
            return { stats, hotspot };
        },
        enabled: !!selectedModule?.slug,
    });

    const moduleHotspot: AnalysisHotspot | null = analysisData?.hotspot ?? null;

    const { data: existingAiSuggestion, isLoading: isLoadingExistingSuggestion } = useQuery<AiSuggestion | null, Error>({
        queryKey: ['aiSuggestion', selectedModule?.slug, moduleHotspot?.stepIndex],
        queryFn: () => {
            if (!moduleHotspot || !selectedModule?.slug) return null;
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
            if (data.error) throw new Error(`Suggestion generation failed: ${data.error}`);
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
        mutationFn: async ({ stepTitle, questions }: { stepTitle: string; questions: string[] }) => {
            if (!user) throw new Error("Authentication required.");
            addToast('info', 'Drafting Module...', 'The AI is creating a new remedial module.');
            const generatedData = await generateBranchModule(stepTitle, questions);
            const newModuleSlug = generatedData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const newSteps: ProcessStep[] = generatedData.steps.map((desc: string, index: number) => ({ title: `Step ${index + 1}`, description: desc, start: 0, end: 0, checkpoint: null, alternativeMethods: [] }));
            const newModule: ModuleForInsert = { slug: newModuleSlug, title: generatedData.title, steps: newSteps as unknown as Json, user_id: user.uid, metadata: { generated_by_ai: true, source_module: selectedModule?.slug, source_step: moduleHotspot?.stepIndex } as Json };
            await saveModule({ moduleData: newModule });
            return newModule;
        },
        onSuccess: (data) => {
            addToast('success', 'Remedial Module Created', `"${data.title}" has been saved.`);
            queryClient.invalidateQueries({ queryKey: ['modules'] });
        },
        onError: (error) => addToast('error', 'Module Drafting Failed', error.message)
    });

    const handleDeleteModule = useCallback(async (e: React.MouseEvent, slug: string | null) => {
        e.preventDefault();
        e.stopPropagation();
        if (!slug) return;

        const confirmation = window.confirm(
            'Are you sure you want to delete this module? This will also remove ALL associated training progress and chat histories from the database. This action cannot be undone.'
        );

        if (confirmation) {
            try {
                await deleteModule(slug);
                await queryClient.invalidateQueries({ queryKey: ['modules'] });
                addToast('success', 'Module Deleted', `The module was successfully removed.`);
            } catch (err) {
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

    const platformHotspot: (AnalysisHotspot & { moduleId: string }) | null = useMemo(() => findPlatformHotspot(allLogs, availableModules), [allLogs, availableModules]);

    const handleGenerateSuggestion = () => {
        if (!moduleHotspot || !selectedModule?.slug) return;
        refinementMutation.mutate();
    };

    const handleGenerateBranchModule = () => {
        if (!moduleHotspot) return;
        branchModuleMutation.mutate({ stepTitle: moduleHotspot.stepTitle, questions: moduleHotspot.questions });
    };

    const openSuggestionModal = (suggestion: RefinementSuggestion) => {
        setActiveSuggestion(suggestion);
        setIsModalOpen(true);
    };

    const handleApplyRefinement = useCallback(() => {
        if (!selectedModule?.slug || !moduleHotspot || !activeSuggestion) return;
        navigate(`/modules/${selectedModule.slug}/edit`, { state: { suggestion: activeSuggestion.newDescription, stepIndex: moduleHotspot.stepIndex } });
        setIsModalOpen(false);
    }, [selectedModule, moduleHotspot, activeSuggestion, navigate]);

    const handleModuleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const module = availableModules.find(m => m.slug === event.target.value);
        setSelectedModule(module || null);
    };

    const newAiSuggestion = refinementMutation.data;

    return (
        <div className="w-full max-w-screen-lg mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 text-center flex items-center gap-3 justify-center">
                <BarChartIcon className="h-8 w-8" />
                Platform Overview
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8 animate-fade-in-up">
                <StatCard title="Total Modules" value={availableModules.length} icon={BookOpenIcon} isLoading={isLoadingModules} />
                <StatCard title="Completed Sessions" value={completedSessions ?? 0} icon={ClockIcon} isLoading={isLoadingCompletedSessions} />
                <StatCard title="Pending Suggestions" value={pendingSuggestions.length} icon={HelpCircleIcon} isLoading={isLoadingSuggestions} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-indigo-500 dark:text-indigo-400 mb-4">Module-Specific Analytics</h2>
                        <select
                            id="module-select"
                            value={selectedModule?.slug || ''}
                            onChange={handleModuleChange}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={availableModules.length === 0 || isLoadingModules}
                        >
                            {isLoadingModules && <option>Loading modules...</option>}
                            {!isLoadingModules && availableModules.map(m => (
                                m.slug && <option key={m.slug} value={m.slug}>{m.title}</option>
                            ))}
                            {!isLoadingModules && availableModules.length === 0 && <option>No modules available</option>}
                        </select>
                    </div>

                    {isAnalyzing ? (
                        <div className="text-center p-6 bg-slate-200 dark:bg-slate-900/50 rounded-lg"><SparklesIcon className="h-8 w-8 mx-auto text-indigo-500 dark:text-indigo-400 animate-pulse" /><p className="mt-2 text-slate-600 dark:text-slate-300">AI is analyzing trainee data...</p></div>
                    ) : moduleHotspot ? (
                        <div className="bg-gradient-to-br from-indigo-200 dark:from-indigo-900/70 to-slate-200/50 dark:to-slate-900/50 p-6 rounded-xl border border-indigo-300 dark:border-indigo-700 animate-fade-in-up">
                            <h3 className="text-lg font-bold text-yellow-700 dark:text-yellow-300 mb-2">Top Module Hotspot</h3>
                            <div className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-lg">
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Confusing Step</p>
                                <p className="text-md font-bold text-slate-800 dark:text-slate-200 mb-3">{moduleHotspot.stepTitle}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Common Questions</p>
                                <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 mb-4">{moduleHotspot.questions.slice(0, 3).map((q, i) => <li key={i} className="italic truncate">&quot;{q}&quot;</li>)}</ul>
                            </div>
                            <div className="flex flex-wrap justify-center items-center gap-4 mt-4">
                                {isLoadingExistingSuggestion ? <p className="text-sm text-slate-600 dark:text-slate-300">Checking for suggestions...</p>
                                    : existingAiSuggestion ? <button onClick={() => openSuggestionModal({ newDescription: existingAiSuggestion.suggestion, newAlternativeMethod: null })} className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors transform hover:scale-105">Preview & Apply Fix</button>
                                        : newAiSuggestion ? <button onClick={() => openSuggestionModal(newAiSuggestion)} className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors transform hover:scale-105">Preview & Apply Fix</button>
                                            : <button onClick={handleGenerateSuggestion} disabled={refinementMutation.isPending} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 transition-colors transform hover:scale-105 disabled:opacity-50 flex items-center gap-2"><SparklesIcon className="h-5 w-5" />{refinementMutation.isPending ? 'Generating...' : 'Refine This Step'}</button>
                                }
                                <button onClick={handleGenerateBranchModule} disabled={branchModuleMutation.isPending} className="bg-cyan-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-cyan-700 transition-colors transform hover:scale-105 disabled:opacity-50 flex items-center gap-2"><GitBranchIcon className="h-5 w-5" />{branchModuleMutation.isPending ? 'Drafting...' : 'Draft Remedial Module'}</button>
                            </div>
                        </div>
                    ) : <p className="text-center p-4">No significant confusion hotspots found for this module.</p>}

                </div>

                <div className="lg:col-span-1 space-y-8">
                    {isLoadingLogs ? <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" /> : platformHotspot && (
                        <div className="bg-gradient-to-br from-yellow-100 dark:from-yellow-900/70 to-slate-100/50 dark:to-slate-900/50 p-6 rounded-xl border border-yellow-300 dark:border-yellow-700 animate-fade-in-up">
                            <div className="flex items-center gap-3 mb-4"><LightbulbIcon className="h-8 w-8 text-yellow-500 dark:text-yellow-400 flex-shrink-0" /><div><h3 className="text-lg font-bold text-yellow-700 dark:text-yellow-300">Top Platform Hotspot</h3><p className="text-sm text-slate-800 dark:text-slate-200">This step causes the most confusion across ALL modules.</p></div></div>
                            <div className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-lg"><p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Confusing Step</p><p className="text-md font-bold text-slate-800 dark:text-slate-200">{platformHotspot.stepTitle}</p><p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase mt-2">In Module</p><p className="text-md text-slate-800 dark:text-slate-200">{(availableModules.find(m => m.slug === platformHotspot.moduleId))?.title}</p></div>
                            <div className="mt-4 flex justify-end"><button onClick={() => navigate(`/modules/${platformHotspot.moduleId}/edit`)} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"><SparklesIcon className="h-5 w-5" />Go to Editor</button></div>
                        </div>
                    )}
                    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-indigo-500 dark:text-indigo-400 mb-4">Pending Suggestions</h2>
                        {isLoadingSuggestions ? <p className="text-slate-500">Loading suggestions...</p>
                            : pendingSuggestions.length > 0 ? (
                                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">{pendingSuggestions.map(sug => (
                                    <div key={sug.id} className="p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg"><p className="text-sm italic text-slate-800 dark:text-slate-200">&quot;{sug.text}&quot;</p><button onClick={() => navigate(`/modules/${sug.moduleId}/edit`)} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mt-1">Review in {sug.module_title || 'module'} &rarr;</button></div>
                                ))}</div>
                            ) : <p className="text-slate-500 text-center py-4">No pending suggestions from trainees.</p>}
                    </div>
                </div>
            </div>

            {/* Existing Modules List */}
            <div className="mt-12 bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Your Training Modules</h2>
                {isLoadingModules ? (
                    <div className="space-y-4">
                        <ModuleCardSkeleton />
                        <ModuleCardSkeleton />
                    </div>
                ) : modulesError ? (
                    <div className="text-center text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/50 p-4 rounded-lg">
                        Error fetching modules: {modulesError.message}
                    </div>
                ) : availableModules.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {availableModules.map(module => {
                            if (!module.slug) return null;

                            return (
                                <div key={module.slug} className="w-full text-left p-6 bg-white dark:bg-slate-800 rounded-xl hover:ring-2 hover:ring-indigo-500 transition-all duration-300 shadow-md dark:shadow-lg relative group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-indigo-100 dark:bg-indigo-600/30 p-3 rounded-lg">
                                                <BookOpenIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                    {module.title}
                                                    {module.is_ai_generated && <span title="AI Generated"><SparklesIcon className="h-5 w-5 text-yellow-500" /></span>}
                                                </h3>
                                                <p className="text-slate-500 dark:text-slate-400">{module.steps.length} steps</p>
                                            </div>
                                        </div>
                                        <div className="absolute top-4 right-4 flex gap-2 items-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handleDeleteModule(e, module.slug)}
                                                className="p-2 bg-slate-200/50 dark:bg-slate-700/50 rounded-full text-slate-500 dark:text-slate-400 hover:bg-red-500/80 hover:text-white transition-all"
                                                aria-label="Delete module"
                                                title="Delete module"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Link to={`/modules/${module.slug}`} className="flex-1 text-center bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                                            Start Training
                                        </Link>
                                        <Link to={`/modules/${module.slug}/edit`} className="flex-1 text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                                            <LightbulbIcon className="h-5 w-5" />
                                            Edit Module
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center bg-slate-100 dark:bg-slate-800 p-8 rounded-lg">
                        <p className="text-slate-500 dark:text-slate-400">No training modules found in the database.</p>
                    </div>
                )}
            </div>

            {isModalOpen && moduleHotspot && activeSuggestion && selectedModule && (
                <RefinementModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} currentStep={selectedModule.steps[moduleHotspot.stepIndex]} suggestion={activeSuggestion} onApply={handleApplyRefinement} />
            )}
        </div>
    );
};

export default DashboardPage;
