import type { CheckpointResponse } from '@/types';
import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import type { Functions } from 'firebase/functions';

type CheckpointFailureStat = { step_index: number; checkpoint_text: string; count: number };

const logCheckpointResponseFn = httpsCallable<Omit<CheckpointResponse, 'id' | 'created_at'>>(functions as Functions, 'logCheckpointResponse');
const getCheckpointResponsesForModuleFn = httpsCallable<{ moduleId: string }, CheckpointResponse[]>(functions as Functions, 'getCheckpointResponsesForModule');
const getCheckpointFailureStatsFn = httpsCallable<{ moduleId: string }, CheckpointFailureStat[]>(functions as Functions, 'getCheckpointFailureStats');

export async function logCheckpointResponse(response: Omit<CheckpointResponse, 'id' | 'created_at'>): Promise<void> {
    try {
        await logCheckpointResponseFn(response);
    } catch (error) {
        console.warn("Could not log checkpoint response:", error);
    }
}

export async function getCheckpointResponsesForModule(moduleId: string): Promise<CheckpointResponse[]> {
    try {
        const result = await getCheckpointResponsesForModuleFn({ moduleId });
        return result.data;
    } catch (error) {
        console.error("Error fetching checkpoint responses:", error);
        throw error;
    }
}

export async function getCheckpointFailureStats(moduleId: string): Promise<CheckpointFailureStat[]> {
    try {
        const result = await getCheckpointFailureStatsFn({ moduleId });
        return result.data;
    } catch (error) {
        console.error("Error fetching checkpoint failure stats:", error);
        return [];
    }
}
