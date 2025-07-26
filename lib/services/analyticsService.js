"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPlatformHotspot = exports.findHotspots = exports.getQuestionLogsByQuestion = exports.getAllTutorLogs = exports.getTutorLogs = exports.getQuestionFrequency = void 0;
const firebase_1 = require("@/firebase");
const baseUrl = import.meta.env.VITE_API_URL || '';
async function authedApiFetch(url, options) {
    const token = firebase_1.auth.currentUser ? await firebase_1.auth.currentUser.getIdToken() : null;
    const headers = new Headers(options?.headers);
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await fetch(`${baseUrl}${url}`, { ...options, headers });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'An unknown API error occurred.' }));
        throw new Error(errorBody.error || `Request failed with status ${response.status}`);
    }
    return response.json();
}
const getQuestionFrequency = async (moduleId) => {
    const url = `/api/analytics/question-frequency?moduleId=${encodeURIComponent(moduleId)}`;
    return authedApiFetch(url);
};
exports.getQuestionFrequency = getQuestionFrequency;
const getTutorLogs = async (moduleId) => {
    const url = `/api/analytics/tutor-logs?moduleId=${encodeURIComponent(moduleId)}`;
    return authedApiFetch(url);
};
exports.getTutorLogs = getTutorLogs;
const getAllTutorLogs = async () => {
    return authedApiFetch('/api/analytics/tutor-logs/all');
};
exports.getAllTutorLogs = getAllTutorLogs;
const getQuestionLogsByQuestion = async (params) => {
    const query = new URLSearchParams({
        moduleId: params.moduleId,
        stepIndex: String(params.stepIndex),
        question: params.question,
        ...(params.startDate && { startDate: params.startDate }),
        ...(params.endDate && { endDate: params.endDate }),
    }).toString();
    const url = `/api/analytics/question-logs?${query}`;
    return authedApiFetch(url);
};
exports.getQuestionLogsByQuestion = getQuestionLogsByQuestion;
// Client-side utility functions remain unchanged
const findHotspots = (stats, module) => {
    if (!stats || stats.length === 0)
        return null;
    const hotspot = stats.reduce((prev, current) => (prev.count > current.count) ? prev : current);
    return {
        stepIndex: hotspot.stepIndex,
        stepTitle: module.steps[hotspot.stepIndex]?.title || 'Unknown Step',
        questions: stats.filter(s => s.stepIndex === hotspot.stepIndex).map(s => s.question),
        questionCount: hotspot.count,
    };
};
exports.findHotspots = findHotspots;
const findPlatformHotspot = (allLogs, allModules) => {
    if (allLogs.length === 0)
        return null;
    const logCounts = {};
    allLogs.forEach(log => {
        if (log.step_index === null)
            return;
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
    if (!topHotspot)
        return null;
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
exports.findPlatformHotspot = findPlatformHotspot;
