import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { findHotspots, getQuestionFrequency } from '@/services/analyticsService';
import { getLatestAiSuggestionForStep } from '@/services/suggestionsService';
import { SparklesIcon, GitBranchIcon, HelpCircleIcon, LightbulbIcon, LoaderIcon } from '@/components/Icons';
import type { AppModuleWithStats, TraineeSuggestion } from '@/types';

interface ModuleAnalyticsProps {
    modules: AppModuleWithStats[];
    selectedModule: AppModuleWithStats | null;
    onModuleChange: (slug: string) => void;
    allLogs: any[]; // Kept as any to match DashboardPage state, though TutorLogRow[] is expected
    allPendingSuggestions: (TraineeSuggestion & { module_title?: string })[];
    onRefineStep: (moduleId: string, stepIndex: number) => void;
    isRefining: boolean;
    onDraftBranchModule: (moduleId: string, stepIndex: number, stepTitle: string, questions: string[]) => void;
    isBranching: boolean;
}

export const ModuleAnalytics: React.FC<ModuleAnalyticsProps> = ({
    modules,
    selectedModule,
    onModuleChange,
    allPendingSuggestions,
    onRefineStep,
    isRefining,
    onDraftBranchModule,
    isBranching,
}) => {
    const { data: questionStats = [], isLoading: isLoadingStats } = useQuery({
        queryKey: ['questionFrequency', selectedModule?.slug],
        queryFn: () => getQuestionFrequency(selectedModule!.slug!),
        enabled: !!selectedModule,
    });

    const moduleHotspot = useMemo(() => {
        if (!selectedModule || !questionStats || questionStats.length === 0) return null;
        return findHotspots(questionStats, selectedModule);
    }, [questionStats, selectedModule]);

    const pendingSuggestionsForModule = useMemo(() => {
        if (!selectedModule) return [];
        return allPendingSuggestions.filter(s => s.moduleId === selectedModule.slug);
    }, [allPendingSuggestions, selectedModule]);

    return (
        <div className="space-y-6 bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 h-full">
            <div>
                <label htmlFor="module-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Analyze a Module</label>
                <select
                    id="module-select"
                    value={selectedModule?.slug || ''}
                    onChange={(e) => onModuleChange(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={modules.length === 0}
                >
                    {modules.length === 0 && <option>No modules available</option>}
                    {modules.map(module => (
                        <option key={module.slug} value={module.slug!}>{module.title}</option>
                    ))}
                </select>
            </div>

            {!selectedModule ? (
                <div className="text-center py-10 text-slate-500">Select a module to see its analytics.</div>
            ) : isLoadingStats ? (
                <div className="text-center py-10 text-slate-500">Loading analytics...</div>
            ) : (
                <div className="space-y-6">
                    {moduleHotspot && (
                        <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700">
                            <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 flex items-center gap-2"><HelpCircleIcon className="h-5 w-5" /> Top Module Hotspot</h4>
                            <p className="text-sm text-yellow-700 dark:text-yellow-200 mt-1">
                                The most confusing step is <strong>&quot;{moduleHotspot.stepTitle}&quot;</strong> with {moduleHotspot.questionCount} questions logged.
                            </p>
                            {isRefining || isBranching ? (
                                <div className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                    <LoaderIcon className="h-4 w-4 animate-spin" />
                                    <span>AI is analyzing trainee data...</span>
                                </div>
                            ) : (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                        onClick={() => onRefineStep(selectedModule.slug!, moduleHotspot.stepIndex)}
                                        className="bg-indigo-600 text-white text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-indigo-700 flex items-center gap-1.5"
                                    >
                                        <SparklesIcon className="h-4 w-4" />
                                        AI: Refine This Step
                                    </button>
                                    <button
                                        onClick={() => onDraftBranchModule(selectedModule.slug!, moduleHotspot.stepIndex, moduleHotspot.stepTitle, moduleHotspot.questions)}
                                        className="bg-cyan-600 text-white text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-cyan-700 flex items-center gap-1.5"
                                    >
                                        <GitBranchIcon className="h-4 w-4" />
                                        AI: Draft Remedial Module
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {pendingSuggestionsForModule.length > 0 && (
                        <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                            <h4 className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2"><LightbulbIcon className="h-5 w-5" /> Pending Trainee Suggestions</h4>
                            <ul className="mt-2 space-y-2">
                                {pendingSuggestionsForModule.map(sug => (
                                    <li key={sug.id} className="text-sm text-blue-700 dark:text-blue-200 italic">
                                        &quot;{sug.text}&quot;
                                        <Link to={`/modules/${sug.moduleId}/edit`} className="ml-2 text-xs font-semibold text-indigo-600 hover:underline">(Review)</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {!moduleHotspot && pendingSuggestionsForModule.length === 0 && (
                        <div className="text-center py-10 text-slate-500">No significant pain points or suggestions for this module yet.</div>
                    )}
                </div>
            )}
        </div>
    );
};