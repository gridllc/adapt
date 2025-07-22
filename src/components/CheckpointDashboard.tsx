import React, { useEffect, useState, useCallback } from 'react';
import { getCheckpointFailureStats } from '@/services/checkpointService';
import { DownloadIcon, SendIcon } from '@/components/Icons';
import { useToast } from '@/hooks/useToast';


interface CheckpointStats {
  step_index: number;
  checkpoint_text: string;
  count: number;
}

interface CheckpointDashboardProps {
  moduleId: string;
  moduleTitle: string;
  isAdmin: boolean;
}

export const CheckpointDashboard: React.FC<CheckpointDashboardProps> = ({ moduleId, moduleTitle, isAdmin }) => {
  const [stats, setStats] = useState<CheckpointStats[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    async function fetchStats() {
      if (!moduleId) return;
      setLoading(true);
      const result = await getCheckpointFailureStats(moduleId);
      setStats(result);
      setLoading(false);
    }

    fetchStats();
  }, [moduleId]);

  if (!isAdmin) return null;
  if (loading) return <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4">Loading checkpoint analytics...</p>;
  if (stats.length === 0) return <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4">No "No" responses recorded for checkpoints yet.</p>;

  return (
    <div className="bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mt-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">🚨 Most-Missed Checkpoints</h3>
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
        {stats.map((s, i) => (
          <div key={i} className="text-sm text-slate-700 dark:text-slate-300 p-3 bg-white dark:bg-slate-800 rounded-lg">
            <p><span className="font-bold text-red-600 dark:text-red-400">Step {s.step_index + 1}:</span> {s.checkpoint_text}</p>
            <p className="text-xs text-slate-500 text-right">{s.count} {s.count > 1 ? 'trainees' : 'trainee'} answered "No"</p>
          </div>
        ))}
      </div>
    </div>
  );
};
