import type { AnalysisHotspot, QuestionStats, TutorLogRow, AppModuleWithStats } from '@/types';
import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';


// Callable function definitions initialized once for performance.
const _getQuestionFrequencyFn = httpsCallable<{ moduleId: string }, QuestionStats[]>(functions, 'getQuestionFrequency');
const _getTutorLogsFn = httpsCallable<{ moduleId: string }, TutorLogRow[]>(functions, 'getTutorLogs');
const _getAllTutorLogsFn = httpsCallable<void, TutorLogRow[]>(functions, 'getAllTutorLogs');
const _getQuestionLogsByQuestionFn = httpsCallable<{
    moduleId: string;
    stepIndex: number;
    question: string;
    startDate?: string;
    endDate?: string;
}, TutorLogRow[]>(functions, 'getQuestionLogsByQuestion');

/**
 * Fetches the frequency of questions asked for a specific module via the 'getQuestionFrequency' Firebase Function.
 * @param moduleId The ID of the module.
 * @returns A promise that resolves to an array of question statistics. Throws on error for react-query to handle.
 */
export const getQuestionFrequency = async (moduleId: string): Promise<QuestionStats[]> => {
    const result = await _getQuestionFrequencyFn({ moduleId });
    return result.data;
};

/**
 * Fetches all tutor interaction logs for a specific module via the 'getTutorLogs' Firebase Function.
 * @param moduleId The ID of the module.
 * @returns A promise that resolves to an array of tutor log rows. Throws on error for react-query to handle.
 */
export const getTutorLogs = async (moduleId: string): Promise<TutorLogRow[]> => {
    const result = await _getTutorLogsFn({ moduleId });
    return result.data;
};

/**
 * Fetches all tutor interaction logs across all modules via the 'getAllTutorLogs' Firebase Function.
 * @returns A promise that resolves to an array of all tutor log rows. Throws on error for react-query to handle.
 */
export const getAllTutorLogs = async (): Promise<TutorLogRow[]> => {
    const result = await _getAllTutorLogsFn();
    return result.data;
};

/**
 * Fetches tutor logs for a specific question within a module step via the 'getQuestionLogsByQuestion' Firebase Function.
 * Allows for optional date filtering.
 * @param params The parameters for the query, including moduleId, stepIndex, and question.
 * @returns A promise that resolves to an array of matching tutor log rows. Throws on error for react-query to handle.
 */
export const getQuestionLogsByQuestion = async (params: {
    moduleId: string;
    stepIndex: number;
    question: string;
    startDate?: string;
    endDate?: string;
}): Promise<TutorLogRow[]> => {
    const result = await _getQuestionLogsByQuestionFn(params);
    return result.data;
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
