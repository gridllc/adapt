import type { CheckpointResponse } from '@/types';
import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';

type CheckpointFailureStat = { step_index: number; checkpoint_text: string; count: number };

// Callable function definitions initialized once for performance.
const _logCheckpointResponseFn = httpsCallable<Omit<CheckpointResponse, 'id' | 'created_at'>, void>(functions, 'logCheckpointResponse');
const _getCheckpointResponsesForModuleFn = httpsCallable<{ moduleId: string }, CheckpointResponse[]>(functions, 'getCheckpointResponsesForModule');
const _getCheckpointFailureStatsFn = httpsCallable<{ moduleId: string }, CheckpointFailureStat[]>(functions, 'getCheckpointFailureStats');

/**
 * Logs a trainee's response to a checkpoint question via the 'logCheckpointResponse' Firebase Function.
 * This is a "fire-and-forget" operation from the client's perspective.
 * @param response The checkpoint response object to log.
 */
export async function logCheckpointResponse(response: Omit<CheckpointResponse, 'id' | 'created_at'>): Promise<void> {
    try {
        await _logCheckpointResponseFn(response);
    } catch (error) {
        console.warn("Could not log checkpoint response:", error);
    }
}

/**
 * Fetches all checkpoint responses for a given module via the 'getCheckpointResponsesForModule' Firebase Function.
 * @param moduleId The ID of the module.
 * @returns A promise that resolves with an array of checkpoint responses. Throws on error for react-query to handle.
 */
export async function getCheckpointResponsesForModule(moduleId: string): Promise<CheckpointResponse[]> {
    try {
        const result = await _getCheckpointResponsesForModuleFn({ moduleId });
        return result.data;
    } catch (error) {
        console.error("Error fetching checkpoint responses:", error);
        throw error;
    }
}

/**
 * Fetches statistics on failed checkpoints for a module via the 'getCheckpointFailureStats' Firebase Function.
 * @param moduleId The ID of the module.
 * @returns A promise that resolves with an array of failure statistics, or an empty array on error.
 */
export async function getCheckpointFailureStats(moduleId: string): Promise<CheckpointFailureStat[]> {
    try {
        const result = await _getCheckpointFailureStatsFn({ moduleId });
        return result.data;
    } catch (error) {
        console.error("Error fetching checkpoint failure stats:", error);
        return []; // Gracefully return empty array on failure.
    }
}
