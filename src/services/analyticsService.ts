import type { AnalysisHotspot, QuestionStats, TutorLogRow, AppModuleWithStats } from '@/types';
import { functions } from '@/firebase';
import type firebase from 'firebase/compat/app';
import 'firebase/compat/functions';


const getQuestionFrequencyFn = functions.httpsCallable('getQuestionFrequency');
const getTutorLogsFn = functions.httpsCallable('getTutorLogs');
const getAllTutorLogsFn = functions.httpsCallable('getAllTutorLogs');
const getQuestionLogsByQuestionFn = functions.httpsCallable('getQuestionLogsByQuestion');

export const getQuestionFrequency = async (moduleId: string): Promise<QuestionStats[]> => {
    const result: firebase.functions.HttpsCallableResult = await getQuestionFrequencyFn({ moduleId });
    return result.data as QuestionStats[];
};

export const getTutorLogs = async (moduleId: string): Promise<TutorLogRow[]> => {
    const result: firebase.functions.HttpsCallableResult = await getTutorLogsFn({ moduleId });
    return result.data as TutorLogRow[];
};

export const getAllTutorLogs = async (): Promise<TutorLogRow[]> => {
    const result: firebase.functions.HttpsCallableResult = await getAllTutorLogsFn();
    return result.data as TutorLogRow[];
};

export const getQuestionLogsByQuestion = async ({ moduleId, stepIndex, question, startDate, endDate }: {
    moduleId: string;
    stepIndex: number;
    question: string;
    startDate?: string;
    endDate?: string;
}): Promise<TutorLogRow[]> => {
    const result: firebase.functions.HttpsCallableResult = await getQuestionLogsByQuestionFn({ moduleId, stepIndex, question, startDate, endDate });
    return result.data as TutorLogRow[];
};

// Client-side utility function, does not require backend changes
export const findHotspots = (stats: QuestionStats[], module: AppModuleWithStats): AnalysisHotspot | null => {
    if (!stats || stats.length === 0) return null;
    const hotspot = stats.reduce((prev, current) => (prev.count > current.count) ? prev : current);
    return {
        stepIndex: hotspot.stepIndex,
        stepTitle: module.steps[hotspot.stepIndex]?.title || 'Unknown Step',
        questions: stats.filter(s => s.stepIndex === hotspot.stepIndex).map(s => s.question),
        questionCount: hotspot.count,
    };
};

// Client-side utility function, does not require backend changes
export const findPlatformHotspot = (allLogs: TutorLogRow[], allModules: AppModuleWithStats[]): (AnalysisHotspot & { moduleId: string }) | null => {
    if (allLogs.length === 0) return null;
    const logCounts: Record<string, { count: number, stepTitle: string, moduleId: string }> = {};

    allLogs.forEach(log => {
        if (log.step_index === null) return;
        const key = `${log.module_id}-${log.step_index}`;
        if (!logCounts[key]) {
            const module = allModules.find(m => m.slug === log.module_id);
            logCounts[key] = {
                count: 0,
                stepTitle: module?.steps[log.step_index]?.title || 'Unknown Step',
                moduleId: log.module_id,
            };
        }
        logCounts[key].count++;
    });

    const topHotspot = Object.entries(logCounts).sort(([, a], [, b]) => b.count - a.count)[0];
    if (!topHotspot) return null;

    const [key, data] = topHotspot;
    const [moduleId, stepIndexStr] = key.split('-');
    const stepIndex = parseInt(stepIndexStr, 10);

    return {
        ...data,
        stepIndex,
        questions: allLogs.filter(log => log.module_id === moduleId && log.step_index === stepIndex).map(l => l.user_question),
        questionCount: data.count,
    };
};