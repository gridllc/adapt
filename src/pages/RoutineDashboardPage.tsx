import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, registerables } from 'chart.js';
import { useQuery } from '@tanstack/react-query';
import type { Routine, TutorLogRow } from "@/types";
import { SparklesIcon, PlayCircleIcon } from "@/components/Icons";
import { getAllRoutines } from '@/services/routineService';
import { getAllTutorLogs } from '@/services/analyticsService';

ChartJS.register(...registerables);

const RoutineDashboardPage: React.FC = () => {
    const { data: routines = [], isLoading: isLoadingRoutines } = useQuery<Routine[]>({
        queryKey: ['allRoutines'],
        queryFn: getAllRoutines,
    });

    const { data: allTutorLogs = [], isLoading: isLoadingLogs } = useQuery<TutorLogRow[]>({
        queryKey: ['allTutorLogs'],
        queryFn: getAllTutorLogs,
    });

    const isLoading = isLoadingRoutines || isLoadingLogs;

    const routineUsageLogs = useMemo(() =>
        Array.isArray(allTutorLogs) ? allTutorLogs.filter(log => log.remote_type === 'ai-routine') : [],
        [allTutorLogs]);

    const intentCounts = useMemo(() =>
        routineUsageLogs.reduce<Record<string, number>>((acc, log) => {
            const intent = log.step_title || "(unspecified)";
            acc[intent] = (acc[intent] || 0) + 1;
            return acc;
        }, {}),
        [routineUsageLogs]);

    const routineGroups = useMemo(() =>
        Array.isArray(routines) ? routines.reduce<Record<string, Routine[]>>((acc, r) => {
            if (!acc[r.templateId]) acc[r.templateId] = [];
            acc[r.templateId].push(r);
            return acc;
        }, {}) : {},
        [routines]);

    const suggestedRoutines = useMemo(() => {
        if (!Array.isArray(routines) || routines.length === 0 || !Array.isArray(allTutorLogs) || allTutorLogs.length === 0) return [];

        const allIntentCounts = allTutorLogs.reduce<Record<string, number>>((acc, log) => {
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


    return (
        <div className="max-w-6xl mx-auto p-4">
            <h2 className="text-2xl font-bold mb-6">📊 Routine Usage Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-semibold mb-2">Most Used Routines</h3>
                    {isLoading ? <p>Loading chart...</p> : Object.keys(intentCounts).length > 0 ? (
                        <div className="h-64">
                            <Bar
                                data={{
                                    labels: Object.keys(intentCounts),
                                    datasets: [{ label: "Uses", data: Object.values(intentCounts), backgroundColor: "#4f46e5" }],
                                }}
                                options={{ plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false }}
                            />
                        </div>
                    ) : <p className="text-center text-slate-500 py-8">No routine usage has been logged yet.</p>}
                </div>

                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-semibold mb-2 flex items-center gap-2"><SparklesIcon className="h-6 w-6 text-yellow-500" /> Suggested Routines to Create</h3>
                    {isLoading ? <p>Analyzing logs...</p> : suggestedRoutines.length > 0 ? (
                        <ul className="list-disc pl-6 space-y-2">
                            {suggestedRoutines.map(({ intent, count }) => (
                                <li key={intent}>
                                    <strong>{intent}</strong> — <span className="text-slate-500">{count} recent requests (no routine yet)</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-center text-slate-500 py-8">No new routine suggestions at this time.</p>}
                </div>
            </div>

            <div className="mt-10">
                <h2 className="text-2xl font-bold mb-4">Existing Routines</h2>
                {isLoading ? <p>Loading routines...</p> : Object.keys(routineGroups).length > 0 ? (
                    Object.entries(routineGroups).map(([templateId, list]) => (
                        <div key={templateId} className="mb-8">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xl font-semibold">Remote: {templateId}</h3>
                                <Link to={`/dashboard/routines/editor?templateId=${templateId}`} className="bg-green-600 text-white font-semibold py-1 px-3 rounded-lg text-sm hover:bg-green-700">
                                    + Create New
                                </Link>
                            </div>
                            <div className="border rounded p-4 bg-white dark:bg-slate-800/50">
                                {list.map((r) => (
                                    <div key={r.id} className="border-b dark:border-slate-700 last:border-b-0 pb-4 mb-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-semibold">Intent: {r.intent}</h4>
                                            <Link to={`/dashboard/routines/editor/${r.id}`} className="text-sm text-indigo-600 hover:underline">Edit</Link>
                                        </div>
                                        <ol className="list-decimal pl-6 text-sm mt-2 text-slate-600 dark:text-slate-300">
                                            {Array.isArray(r.steps) && r.steps.map((s, i) => (<li key={i}>{s}</li>))}
                                        </ol>
                                        {r.videoUrl && (
                                            <a href={r.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 w-full max-w-md rounded border inline-flex items-center gap-2 text-sm text-indigo-500 hover:underline">
                                                <PlayCircleIcon className="h-5 w-5" /> View Video
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center p-8 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <p className="text-slate-500">No routines have been created yet.</p>
                        <Link to="/dashboard/routines/editor" className="mt-4 inline-block bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700">
                            Create Your First Routine
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoutineDashboardPage;