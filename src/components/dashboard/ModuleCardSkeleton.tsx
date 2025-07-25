import React from 'react';

export const ModuleCardSkeleton: React.FC = () => {
  return (
    <div className="p-4 bg-slate-100 dark:bg-slate-900/50 rounded-lg animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
          <div className="h-8 w-12 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
        </div>
      </div>
    </div>
  );
};
