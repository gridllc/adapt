"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformStats = void 0;
const react_1 = __importDefault(require("react"));
const Icons_1 = require("@/components/Icons");
const StatCard = ({ title, value, icon: Icon, isLoading }) => (<div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
            <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-lg">
                <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400"/>
            </div>
            <div>
                <h3 className="text-slate-500 dark:text-slate-400 font-semibold">{title}</h3>
                {isLoading ? (<div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse mt-1"/>) : (<p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>)}
            </div>
        </div>
    </div>);
const PlatformStats = ({ stats, isLoading }) => {
    return (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Modules" value={stats.totalModules} icon={Icons_1.BookOpenIcon} isLoading={isLoading.modules}/>
            <StatCard title="Total Sessions" value={stats.totalSessions} icon={Icons_1.ClockIcon} isLoading={isLoading.sessions}/>
            <StatCard title="Completion Rate" value={`${stats.completionRate}%`} icon={Icons_1.BarChartIcon} isLoading={isLoading.sessions}/>
            <StatCard title="Pending Suggestions" value={stats.pendingSuggestions} icon={Icons_1.LightbulbIcon} isLoading={isLoading.suggestions}/>
        </div>);
};
exports.PlatformStats = PlatformStats;
