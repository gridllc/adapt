"use strict";
// This service has been migrated to Firebase/GCP.
// The functions below call Firebase Functions which handle interactions
// with the database and Vertex AI Matching Engine.
Object.defineProperty(exports, "__esModule", { value: true });
exports.findSimilarInteractions = exports.logTutorInteraction = void 0;
const firebase_1 = require("@/firebase");
const functions_1 = require("firebase/functions");
// Callable function definitions initialized once for performance.
const _logTutorInteractionFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'logTutorInteraction');
const _findSimilarInteractionsFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'findSimilarInteractions');
/**
 * Logs a user's question and the AI's response to Firestore via the 'logTutorInteraction' Firebase Function.
 * The backend function is responsible for generating a vector embedding for the question for similarity search.
 * This is a "fire-and-forget" call from the client's perspective.
 * @param payload The data to be logged.
 */
const logTutorInteraction = async (payload) => {
    try {
        await _logTutorInteractionFn(payload);
    }
    catch (error) {
        // We don't want to block the user's experience if logging fails,
        // but we should report the error.
        console.error("[Firebase] Failed to log tutor interaction:", error);
    }
};
exports.logTutorInteraction = logTutorInteraction;
/**
 * Finds similar past interactions from the "collective memory" (vector database) via the 'findSimilarInteractions' Firebase Function.
 * @param moduleId The current module's slug.
 * @param question The user's question to find matches for.
 * @returns A promise that resolves to an array of similar TutorLog objects, or an empty array on failure.
 */
const findSimilarInteractions = async (moduleId, question) => {
    try {
        const result = await _findSimilarInteractionsFn({ moduleId, question });
        // The callable function result is in `result.data`.
        return result.data;
    }
    catch (error) {
        console.error("[Firebase] Failed to find similar interactions:", error);
        // Return an empty array on failure to prevent the chat from crashing.
        return [];
    }
};
exports.findSimilarInteractions = findSimilarInteractions;
