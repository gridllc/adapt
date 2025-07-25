import type { AnalysisHotspot, QuestionStats, TutorLogRow, AppModuleWithStats } from '@/types';
import { auth } from '@/firebase';

async function authedApiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    const headers = new Headers(options?.headers);
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'An unknown API error occurred.' }));
        throw new Error(errorBody.error || `Request failed with status ${response.status}`);
    }
    return response.json();
}

export const getQuestionFrequency = async (moduleId: string): Promise<QuestionStats[]> => {
    const url = `/api/analytics/question-frequency?moduleId=${encodeURIComponent(moduleId)}`;
    return authedApiFetch<QuestionStats[]>(url);
};

export const getTutorLogs = async (moduleId: string): Promise<TutorLogRow[]> => {
    const url = `/api/analytics/tutor-logs?moduleId=${encodeURIComponent(moduleId)}`;
    return authedApiFetch<TutorLogRow[]>(url);
};

export const getAllTutorLogs = async (): Promise<TutorLogRow[]> => {
    return authedApiFetch<TutorLogRow[]>('/api/analytics/tutor-logs/all');
};

export const getQuestionLogsByQuestion = async (params: {
    moduleId: string;
    stepIndex: number;
    question: string;
    startDate?: string;
    endDate?: string;
}): Promise<TutorLogRow[]> => {
    const query = new URLSearchParams({
        moduleId: params.moduleId,
        stepIndex: String(params.stepIndex),
        question: params.question,
        ...(params.startDate && { startDate: params.startDate }),
        ...(params.endDate && { endDate: params.endDate }),
    }).toString();
    const url = `/api/analytics/question-logs?${query}`;
    return authedApiFetch<TutorLogRow[]>(url);
};

// Client-side utility functions remain unchanged
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