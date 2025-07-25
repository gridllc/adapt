import React from 'react';
import { BookOpenIcon, ClockIcon, BarChartIcon, LightbulbIcon } from '@/components/Icons';

interface PlatformStatsProps {
    stats: {
        totalModules: number;
        totalSessions: number;
        completionRate: number;
        pendingSuggestions: number;
    };
    isLoading: {
        modules: boolean;
        sessions: boolean;
        suggestions: boolean;
    };
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; isLoading: boolean }> = ({ title, value, icon: Icon, isLoading }) => (
    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
            <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-lg">
                <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
                <h3 className="text-slate-500 dark:text-slate-400 font-semibold">{title}</h3>
                {isLoading ? (
                    <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse mt-1" />
                ) : (
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
                )}
            </div>
        </div>
    </div>
);

export const PlatformStats: React.FC<PlatformStatsProps> = ({ stats, isLoading }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Modules" value={stats.totalModules} icon={BookOpenIcon} isLoading={isLoading.modules} />
            <StatCard title="Total Sessions" value={stats.totalSessions} icon={ClockIcon} isLoading={isLoading.sessions} />
            <StatCard title="Completion Rate" value={`${stats.completionRate}%`} icon={BarChartIcon} isLoading={isLoading.sessions} />
            <StatCard title="Pending Suggestions" value={stats.pendingSuggestions} icon={LightbulbIcon} isLoading={isLoading.suggestions} />
        </div>
    );
};
