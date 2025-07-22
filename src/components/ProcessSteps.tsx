import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProcessStep, StepStatus, CheckpointEvaluation } from '@/types';
import {
  CheckCircleIcon,
  LightbulbIcon,
  HelpCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  AlertTriangleIcon,
  PencilIcon,
} from '@/components/Icons';
import { CheckpointPrompt } from './CheckpointPrompt';

// Helper function to format seconds into MM:SS format
const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

interface ProcessStepsProps {
  steps: ProcessStep[];
  currentStepIndex: number;
  onStepSelect: (time: number, index: number) => void;
  markStep: (status: StepStatus) => void;
  goBack: () => void;
  onCheckpointAnswer: (answer: string, followupComment?: string) => void;
  isEvaluatingCheckpoint: boolean;
  checkpointFeedback: CheckpointEvaluation | null;
  instructionSuggestion: string | null;
  onSuggestionSubmit: () => void;
  isSuggestionSubmitted: boolean;
  isAdmin: boolean;
  moduleId?: string;
  onTutorHelp: (question: string, userAnswer?: string) => void;
  checkpointFailureStats?: { step_index: number; count: number }[];
}

export const ProcessSteps: React.FC<ProcessStepsProps> = ({
  steps,
  currentStepIndex,
  onStepSelect,
  markStep,
  goBack,
  onCheckpointAnswer,
  isEvaluatingCheckpoint,
  checkpointFeedback,
  instructionSuggestion,
  onSuggestionSubmit,
  isSuggestionSubmitted,
  isAdmin,
  moduleId,
  onTutorHelp,
  checkpointFailureStats = [],
}) => {
  const activeStepRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [collapsedSteps, setCollapsedSteps] = useState<Set<number>>(new Set());

  const hotspotSteps = useMemo(() => {
    const hotspots = new Map<number, number>();
    checkpointFailureStats.forEach(stat => {
        hotspots.set(stat.step_index, stat.count);
    });
    return hotspots;
  }, [checkpointFailureStats]);

  useEffect(() => {
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentStepIndex]);

  const toggleCollapse = (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      setCollapsedSteps(prev => {
          const newSet = new Set(prev);
          if (newSet.has(index)) {
              newSet.delete(index);
          } else {
              newSet.add(index);
          }
          return newSet;
      });
  };

  return (
    <div className="p-4 space-y-3 overflow-y-auto flex-1">
      {steps.map((step, index) => {
        const isActive = currentStepIndex === index;
        const isCompleted = currentStepIndex > index;
        const isCollapsed = isCompleted && collapsedSteps.has(index);
        const hotspotCount = hotspotSteps.get(index);

        return (
          <div
            key={index}
            ref={isActive ? activeStepRef : null}
            onClick={() => onStepSelect(step.start, index)}
            className={`cursor-pointer p-4 rounded-lg transition-all duration-300 border-l-4 ${
              isActive
                ? 'bg-indigo-100 dark:bg-indigo-600/30 border-indigo-500 shadow-lg'
                : isCompleted
                ? `bg-slate-100/60 dark:bg-slate-700/40 border-green-500 ${isCollapsed ? 'opacity-50' : 'opacity-80'}`
                : 'bg-slate-100 dark:bg-slate-700/80 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-md text-slate-800 dark:text-slate-100">{step.title}</h3>
                {isAdmin && hotspotCount && hotspotCount > 0 && (
                  <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400" title={`${hotspotCount} trainee(s) failed this checkpoint`}>
                    <AlertTriangleIcon className="h-4 w-4" />
                    <span className="text-xs font-bold">{hotspotCount}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      ({formatTime(step.start)} - {formatTime(step.end)})
                  </span>
                  {isCompleted && (
                      <button
                          onClick={(e) => toggleCollapse(e, index)}
                          className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-full"
                          aria-label={isCollapsed ? 'Expand step' : 'Collapse step'}
                      >
                          {isCollapsed ? <ArrowDownIcon className="h-4 w-4" /> : <ArrowUpIcon className="h-4 w-4" />}
                      </button>
                  )}
              </div>
            </div>

            {!isCollapsed && (
              <div className="mt-2 space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{step.description}</p>
                {isActive && (
                    <div className="space-y-3">
                        {step.checkpoint && (
                            <CheckpointPrompt
                                question={step.checkpoint}
                                onAnswer={onCheckpointAnswer}
                                isLoading={isEvaluatingCheckpoint}
                                onTutorHelp={onTutorHelp}
                                alternativeHelp={step.alternativeMethods?.[0]?.description}
                            />
                        )}

                        {checkpointFeedback && (
                            <div className={`p-3 rounded-lg text-sm border ${
                                checkpointFeedback.isCorrect
                                    ? 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-600 text-green-800 dark:text-green-200'
                                    : 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-600 text-red-800 dark:text-red-200'
                            }`}>
                                <p className="font-semibold">{checkpointFeedback.isCorrect ? 'Correct!' : 'Not Quite...'}</p>
                                <p>{checkpointFeedback.feedback}</p>
                            </div>
                        )}
                        
                        {instructionSuggestion && !isSuggestionSubmitted && (
                            <div className="p-3 rounded-lg bg-indigo-100/70 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700">
                                <p className="text-sm text-indigo-800 dark:text-indigo-200 italic">
                                    <span className="font-bold">AI Suggestion:</span> Could this instruction be clearer? Maybe: &quot;{instructionSuggestion}&quot;
                                </p>
                                <button
                                    onClick={onSuggestionSubmit}
                                    className="mt-2 text-xs bg-indigo-600 text-white font-semibold py-1 px-3 rounded-full hover:bg-indigo-700 flex items-center gap-1"
                                >
                                    <PencilIcon className="h-3 w-3" /> Propose this change to the owner
                                </button>
                            </div>
                        )}
                        
                        {isSuggestionSubmitted && (
                             <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-600 text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                                <CheckCircleIcon className="h-4 w-4"/> Suggestion submitted for review!
                            </div>
                        )}
                    </div>
                )}
              </div>
            )}
            
            {isActive && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <button
                        onClick={goBack}
                        disabled={index === 0}
                        className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 transition-colors"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Back
                    </button>
                    {!step.checkpoint && (
                         <button onClick={() => markStep('done')} className="bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700">
                            Mark as Done
                        </button>
                    )}
                </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
