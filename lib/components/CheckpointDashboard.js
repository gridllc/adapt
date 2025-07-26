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
exports.CheckpointDashboard = void 0;
const react_1 = __importStar(require("react"));
const checkpointService_1 = require("@/services/checkpointService");
const useToast_1 = require("@/hooks/useToast");
const CheckpointDashboard = ({ moduleId, moduleTitle, isAdmin }) => {
    const [stats, setStats] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const { addToast } = (0, useToast_1.useToast)();
    (0, react_1.useEffect)(() => {
        async function fetchStats() {
            if (!moduleId)
                return;
            setLoading(true);
            const result = await (0, checkpointService_1.getCheckpointFailureStats)(moduleId);
            setStats(result);
            setLoading(false);
        }
        fetchStats();
    }, [moduleId]);
    if (!isAdmin)
        return null;
    if (loading)
        return <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4">Loading checkpoint analytics...</p>;
    if (stats.length === 0)
        return <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4">No "No" responses recorded for checkpoints yet.</p>;
    return (<div className="bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mt-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">🚨 Most-Missed Checkpoints</h3>
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
        {stats.map((s, i) => (<div key={i} className="text-sm text-slate-700 dark:text-slate-300 p-3 bg-white dark:bg-slate-800 rounded-lg">
            <p><span className="font-bold text-red-600 dark:text-red-400">Step {s.step_index + 1}:</span> {s.checkpoint_text}</p>
            <p className="text-xs text-slate-500 text-right">{s.count} {s.count > 1 ? 'trainees' : 'trainee'} answered "No"</p>
          </div>))}
      </div>
    </div>);
};
exports.CheckpointDashboard = CheckpointDashboard;
