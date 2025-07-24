import type { CheckpointResponse } from '@/types';
import { functions } from '@/firebase';
import type firebase from 'firebase/compat/app';
import 'firebase/compat/functions';

type CheckpointFailureStat = { step_index: number; checkpoint_text: string; count: number };

const logCheckpointResponseFn = functions.httpsCallable('logCheckpointResponse');
const getCheckpointResponsesForModuleFn = functions.httpsCallable('getCheckpointResponsesForModule');
const getCheckpointFailureStatsFn = functions.httpsCallable('getCheckpointFailureStats');

export async function logCheckpointResponse(response: Omit<CheckpointResponse, 'id' | 'created_at'>): Promise<void> {
    try {
        await logCheckpointResponseFn(response);
    } catch (error) {
        console.warn("Could not log checkpoint response:", error);
    }
}

export async function getCheckpointResponsesForModule(moduleId: string): Promise<CheckpointResponse[]> {
    try {
        const result: firebase.functions.HttpsCallableResult = await getCheckpointResponsesForModuleFn({ moduleId });
        return result.data as CheckpointResponse[];
    } catch (error) {
        console.error("Error fetching checkpoint responses:", error);
        throw error;
    }
}

export async function getCheckpointFailureStats(moduleId: string): Promise<CheckpointFailureStat[]> {
    try {
        const result: firebase.functions.HttpsCallableResult = await getCheckpointFailureStatsFn({ moduleId });
        return result.data as CheckpointFailureStat[];
    } catch (error) {
        console.error("Error fetching checkpoint failure stats:", error);
        return [];
    }
}