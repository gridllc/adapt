"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCheckpointFailureStats = exports.getCheckpointResponsesForModule = exports.logCheckpointResponse = void 0;
const firebase_1 = require("@/firebase");
const functions_1 = require("firebase/functions");
// Callable function definitions initialized once for performance.
const _logCheckpointResponseFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'logCheckpointResponse');
const _getCheckpointResponsesForModuleFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'getCheckpointResponsesForModule');
const _getCheckpointFailureStatsFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'getCheckpointFailureStats');
/**
 * Logs a trainee's response to a checkpoint question via the 'logCheckpointResponse' Firebase Function.
 * This is a "fire-and-forget" operation from the client's perspective.
 * @param response The checkpoint response object to log.
 */
async function logCheckpointResponse(response) {
    try {
        await _logCheckpointResponseFn(response);
    }
    catch (error) {
        console.warn("Could not log checkpoint response:", error);
    }
}
exports.logCheckpointResponse = logCheckpointResponse;
/**
 * Fetches all checkpoint responses for a given module via the 'getCheckpointResponsesForModule' Firebase Function.
 * @param moduleId The ID of the module.
 * @returns A promise that resolves with an array of checkpoint responses. Throws on error for react-query to handle.
 */
async function getCheckpointResponsesForModule(moduleId) {
    try {
        const result = await _getCheckpointResponsesForModuleFn({ moduleId });
        return result.data;
    }
    catch (error) {
        console.error("Error fetching checkpoint responses:", error);
        throw error;
    }
}
exports.getCheckpointResponsesForModule = getCheckpointResponsesForModule;
/**
 * Fetches statistics on failed checkpoints for a module via the 'getCheckpointFailureStats' Firebase Function.
 * @param moduleId The ID of the module.
 * @returns A promise that resolves with an array of failure statistics, or an empty array on error.
 */
async function getCheckpointFailureStats(moduleId) {
    try {
        const result = await _getCheckpointFailureStatsFn({ moduleId });
        return result.data;
    }
    catch (error) {
        console.error("Error fetching checkpoint failure stats:", error);
        return []; // Gracefully return empty array on failure.
    }
}
exports.getCheckpointFailureStats = getCheckpointFailureStats;
