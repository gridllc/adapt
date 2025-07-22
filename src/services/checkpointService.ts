


import type { CheckpointResponse } from '@/types';
import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';

const logCheckpointResponseFn = httpsCallable(functions, 'logCheckpointResponse');
const getCheckpointResponsesForModuleFn = httpsCallable(functions, 'getCheckpointResponsesForModule');
const getCheckpointFailureStatsFn = httpsCallable(functions, 'getCheckpointFailureStats');
// const sendCheckpointFailuresToSlackFn = httpsCallable(functions, 'sendCheckpointFailuresToSlack');

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
        return result.data as CheckpointResponse[];
    } catch (error) {
        console.error("Error fetching checkpoint responses:", error);
        throw error;
    }
}

export async function getCheckpointFailureStats(moduleId: string): Promise<{ step_index: number; checkpoint_text: string; count: number }[]> {
    try {
        const result = await getCheckpointFailureStatsFn({ moduleId });
        return result.data as { step_index: number; checkpoint_text: string; count: number }[];
    } catch (error) {
        console.error("Error fetching checkpoint failure stats:", error);
        return [];
    }
}

// export async function sendCheckpointFailuresToSlack(moduleId: string, moduleTitle: string): Promise<void> {
//     try {
//         await sendCheckpointFailuresToSlackFn({ moduleId, moduleTitle });
//     } catch (error) {
//         console.error("Error sending report to Slack:", error);
//         throw error;
//     }
// }
