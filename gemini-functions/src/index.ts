
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";
import { getStorage } from "firebase-admin/storage";
import { FieldValue } from "firebase-admin/firestore";


// --- Initialization ---
admin.initializeApp();
const db = admin.firestore();
const storage = getStorage();

// Define explicit options for functions to make secret dependencies clear.
const optionsWithApiKey = {
    timeoutSeconds: 60,
    memory: "1GiB" as const,
    secrets: ["API_KEY"],
};

const optionsWithoutApiKey = {
    timeoutSeconds: 60,
    memory: "1GiB" as const,
};


// --- Constants ---
const BUCKET_NAME = process.env.GCLOUD_STORAGE_BUCKET || "adapt-frontend-rkdt.appspot.com";
const DAILY_TUTOR_LIMIT = 100;


// --- Helper Functions ---

/**
 * Lazily initializes and returns the GoogleGenAI client.
 * This function should be called *inside* each cloud function that needs the AI client
 * to ensure environment variables (like secrets) are available.
 */
function getAiClient(): GoogleGenAI {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        // This error should not happen if the function is configured with secrets,
        // but it's a good safeguard.
        logger.error("FATAL: Gemini API key not found in environment variables. Ensure the function is deployed with secrets.");
        throw new HttpsError("internal", "The server is missing a required AI configuration.");
    }
    return new GoogleGenAI({ apiKey });
}

async function generateEmbedding(text: string): Promise<number[]> {
    const ai = getAiClient();
    try {
        const result = await ai.models.embedContent({
            model: "text-embedding-004",
            contents: { parts: [{ text }] },
        });
        const embedding = result.embeddings?.[0]?.values;
        if (!embedding) throw new Error("No embedding returned from Vertex AI");
        return embedding;
    } catch (e) {
        logger.error("Embedding generation failed:", e);
        const message = e instanceof Error ? e.message : "Failed to generate embedding.";
        throw new HttpsError("internal", message);
    }
}

const cosineSimilarity = (a: number[], b: number[]): number => {
    if (!a || !b || a.length !== b.length) return 0;
    const dotProduct = a.reduce((sum, ai, i) => sum + (ai * b[i]), 0);
    const magA = Math.sqrt(a.reduce((sum, ai) => sum + (ai * ai), 0));
    const magB = Math.sqrt(b.reduce((sum, bi) => sum + (bi * bi), 0));
    if (magA === 0 || magB === 0) return 0;
    return dotProduct / (magA * magB);
};


// --- Module Data Functions ---

export const getModule = onCall(optionsWithoutApiKey, async (request) => {
    const { moduleId } = request.data;
    if (!moduleId) throw new HttpsError("invalid-argument", "A module ID is required.");
    const doc = await db.collection("modules").doc(moduleId).get();
    if (!doc.exists) throw new HttpsError("not-found", "Module not found.");
    return doc.data();
});

export const getAvailableModules = onCall(optionsWithoutApiKey, async () => {
    const modulesSnap = await db.collection("modules").get();
    const sessionsSnap = await db.collection("sessions").get();

    const sessionData = new Map<string, { count: number, lastUsed?: string }>();
    sessionsSnap.forEach((doc) => {
        const data = doc.data();
        const existing = sessionData.get(data.module_id) ?? { count: 0 };
        existing.count++;
        if (!existing.lastUsed || data.updated_at > existing.lastUsed) {
            existing.lastUsed = data.updated_at.toDate().toISOString();
        }
        sessionData.set(data.module_id, existing);
    });

    return modulesSnap.docs.map((doc) => {
        const moduleStats = sessionData.get(doc.id);
        const docData = doc.data();
        return {
            ...docData,
            slug: doc.id,
            is_ai_generated: docData.metadata?.is_ai_generated ?? false,
            session_count: moduleStats?.count ?? 0,
            last_used_at: moduleStats?.lastUsed,
        };
    });
});

export const saveModule = onCall(optionsWithoutApiKey, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");

    const { moduleData } = request.data;
    if (!moduleData?.slug) throw new HttpsError("invalid-argument", "Module data with a slug is required.");

    logger.info("Attempting to save module", { slug: moduleData.slug, uid: uid });

    const moduleRef = db.collection("modules").doc(moduleData.slug);
    const doc = await moduleRef.get();

    if (doc.exists && doc.data()?.user_id !== uid) {
        throw new HttpsError("permission-denied", "You do not own this module.");
    }

    const dataToSave = {
        ...moduleData,
        user_id: uid,
        updated_at: FieldValue.serverTimestamp(),
        ...(doc.exists ? {} : { created_at: FieldValue.serverTimestamp() }),
    };

    await moduleRef.set(dataToSave, { merge: true });
    const savedDoc = await moduleRef.get();
    return savedDoc.data();
});

export const deleteModule = onCall(optionsWithoutApiKey, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");

    const { slug } = request.data;
    if (!slug) throw new HttpsError("invalid-argument", "A module slug is required.");

    const moduleRef = db.collection("modules").doc(slug);
    const doc = await moduleRef.get();
    if (!doc.exists || doc.data()?.user_id !== uid) {
        throw new HttpsError("permission-denied", "You do not own this module.");
    }

    logger.info(`Starting deletion for module ${slug}`);
    const collectionsToDelete = [
        "tutorLogs", "sessions", "chatMessages", "checkpointResponses",
        "aiSuggestions", "traineeSuggestions", "flagged_questions", "feedbackLogs",
    ];
    const deletionPromises: Promise<any>[] = collectionsToDelete.map((coll) =>
        db.collection(coll).where("module_id", "==", slug).get().then((snap) => {
            const batch = db.batch();
            snap.forEach((d) => batch.delete(d.ref));
            return batch.commit();
        })
    );

    const videoUrl = doc.data()?.video_url;
    if (videoUrl && typeof videoUrl === "string") {
        deletionPromises.push(
            storage.bucket(BUCKET_NAME).file(videoUrl).delete().catch((e: Error) =>
                logger.warn(`Could not delete video ${videoUrl} for module ${slug}:`, e)
            )
        );
    }

    deletionPromises.push(moduleRef.delete());
    await Promise.all(deletionPromises);
    return { success: true };
});

// --- GCS Signed URL Functions ---
export const getSignedUploadUrl = onCall(optionsWithoutApiKey, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");

    const { slug, contentType, fileExtension } = request.data;
    const filePath = `videos/${uid}/${slug}.${fileExtension}`;
    const file = storage.bucket(BUCKET_NAME).file(filePath);
    const [url] = await file.getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 15 * 60 * 1000,
        contentType,
    });
    return { uploadUrl: url, filePath };
});

export const getSignedManualUploadUrl = onCall(optionsWithoutApiKey, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");

    const { fileName, contentType } = request.data;
    const safeFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const filePath = `manuals_for_processing/${uid}/${Date.now()}_${safeFileName}`;
    const file = storage.bucket(BUCKET_NAME).file(filePath);
    const [url] = await file.getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 15 * 60 * 1000,
        contentType,
    });
    return { uploadUrl: url, filePath };
});

export const getSignedDownloadUrl = onCall(optionsWithoutApiKey, async (request) => {
    const { filePath } = request.data;
    if (!filePath) throw new HttpsError("invalid-argument", "A file path is required.");

    const file = storage.bucket(BUCKET_NAME).file(filePath);
    const [url] = await file.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 60 * 60 * 1000,
    });
    return { downloadUrl: url };
});

// --- Session & Chat Functions ---
export const getSession = onCall(optionsWithoutApiKey, async (request) => {
    const { moduleId, sessionToken } = request.data;
    const snap = await db.collection("sessions").where("module_id", "==", moduleId).where("session_token", "==", sessionToken).limit(1).get();
    return snap.empty ? null : snap.docs[0].data();
});

export const saveSession = onCall(optionsWithoutApiKey, async (request) => {
    const { moduleId, sessionToken, ...dataToSave } = request.data;
    const snap = await db.collection("sessions").where("module_id", "==", moduleId).where("session_token", "==", sessionToken).limit(1).get();

    dataToSave.updated_at = FieldValue.serverTimestamp();
    if (snap.empty) {
        dataToSave.created_at = FieldValue.serverTimestamp();
        await db.collection("sessions").add({ module_id: moduleId, session_token: sessionToken, ...dataToSave });
    } else {
        await snap.docs[0].ref.update(dataToSave);
    }
    return { success: true };
});

export const getChatHistory = onCall(optionsWithoutApiKey, async (request) => {
    const { moduleId, sessionToken } = request.data;
    const snap = await db.collection("chatMessages")
        .where("module_id", "==", moduleId)
        .where("session_token", "==", sessionToken)
        .orderBy("created_at")
        .get();
    return snap.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
});

export const saveChatMessage = onCall(optionsWithoutApiKey, async (request) => {
    const { moduleId, sessionToken, message } = request.data;
    await db.collection("chatMessages").doc(message.id).set({
        ...message,
        module_id: moduleId,
        session_token: sessionToken,
        created_at: FieldValue.serverTimestamp(),
    });
    return { success: true };
});

export const updateMessageFeedback = onCall(optionsWithoutApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Authentication required.");
    const { messageId, feedback } = request.data;
    await db.collection("chatMessages").doc(messageId).update({ feedback });
    return { success: true };
});

export const getSessionSummary = onCall(optionsWithoutApiKey, async (request) => {
    const { moduleId, sessionToken } = request.data;
    const snap = await db.collection("sessions")
        .where("module_id", "==", moduleId)
        .where("session_token", "==", sessionToken)
        .limit(1)
        .get();

    if (snap.empty) {
        return null;
    }

    const sessionDoc = snap.docs[0];
    const sessionData = sessionDoc.data();
    const events = (sessionData.liveCoachEvents || []).filter((e: any) => e.eventType === "step_advance").sort((a: any, b: any) => a.timestamp - b.timestamp);
    const durationsPerStep: Record<number, number> = {};
    for (let i = 0; i < events.length - 1; i++) {
        durationsPerStep[events[i].stepIndex] = events[i + 1].timestamp - events[i].timestamp;
    }

    return {
        ...sessionData,
        startedAt: sessionData.created_at.toMillis(),
        endedAt: sessionData.updated_at.toMillis(),
        durationsPerStep,
    };
});

export const getTotalSessionCount = onCall(optionsWithoutApiKey, async () => {
    const snapshot = await db.collection("sessions").count().get();
    return snapshot.data().count;
});

export const getCompletedSessionCount = onCall(optionsWithoutApiKey, async () => {
    const snapshot = await db.collection("sessions").where("is_completed", "==", true).count().get();
    return snapshot.data().count;
});

// --- AI, Analytics & Feedback Functions ---
interface DetectedAlias {
    alias: string;
    formalName: string;
}
interface LogTutorInteractionData {
    userQuestion: string;
    tutorResponse: string;
    moduleId: string;
    stepIndex: number;
    templateId?: string;
    stepTitle?: string;
    remoteType?: string;
    aliases?: DetectedAlias[];
}

export const logTutorInteraction = onCall(optionsWithApiKey, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");

    const { userQuestion, tutorResponse, moduleId, stepIndex, templateId, stepTitle, remoteType, aliases } = request.data as LogTutorInteractionData;

    const today = new Date().toISOString().split("T")[0];
    const usageRef = db.collection("userUsage").doc(`${uid}_${today}`);
    const usageDoc = await usageRef.get();
    if ((usageDoc.data()?.tutorInteractions ?? 0) >= DAILY_TUTOR_LIMIT) {
        throw new HttpsError("resource-exhausted", "You have reached the daily limit for AI tutor interactions.");
    }

    const vector = await generateEmbedding(userQuestion);
    await db.collection("tutorLogs").add({
        uid,
        user_question: userQuestion,
        tutor_response: tutorResponse,
        module_id: moduleId,
        step_index: stepIndex,
        template_id: templateId,
        step_title: stepTitle,
        remote_type: remoteType,
        aliases: aliases ?? [],
        vector,
        created_at: FieldValue.serverTimestamp(),
    });

    if (aliases && aliases.length > 0) {
        for (const detected of aliases) {
            const sanitizedAlias = detected.alias.replace(/[^a-zA-Z0-9-]/g, "_");
            const docId = `${moduleId}_${detected.formalName.replace(/\s/g, "")}_${sanitizedAlias}`;
            const logRef = db.collection("alias_logs").doc(docId);
            try {
                await db.runTransaction(async (tx) => {
                    const doc = await tx.get(logRef);
                    if (doc.exists) {
                        tx.update(logRef, { frequency: FieldValue.increment(1) });
                    } else {
                        tx.set(logRef, {
                            phrase: detected.alias,
                            mappedButton: detected.formalName,
                            moduleId: moduleId,
                            frequency: 1,
                            createdAt: FieldValue.serverTimestamp(),
                        });
                    }
                });
            } catch (e) {
                logger.error("Alias log transaction failed:", e);
            }
        }
    }

    await usageRef.set({ tutorInteractions: FieldValue.increment(1) }, { merge: true });
    return { status: "logged" };
});

export const findSimilarInteractions = onCall(optionsWithApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Authentication required.");
    const { question, moduleId } = request.data;
    const queryVector = await generateEmbedding(question);

    const moduleDoc = await db.collection("modules").doc(moduleId).get();
    const templateId = moduleDoc.data()?.metadata?.templateId;

    let query = db.collection("tutorLogs").where("module_id", "==", moduleId);
    if (templateId) {
        query = db.collection("tutorLogs").where("template_id", "==", templateId);
    }
    const snapshot = await query.get();

    const results = snapshot.docs.map((doc) => {
        const data = doc.data();
        const similarity = cosineSimilarity(queryVector, data.vector);
        return { ...data, id: doc.id, similarity };
    });

    const filteredResults = results
        .filter((r) => r.similarity > 0.8)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3);
    return filteredResults;
});

const refinementSchema = {
    type: "OBJECT",
    properties: {
        newDescription: {
            type: "STRING",
            description: "A revised, clearer version of the step's description based on the user's confusion.",
        },
        newAlternativeMethod: {
            type: "OBJECT",
            properties: {
                title: { type: "STRING" },
                description: { type: "STRING" },
            },
            nullable: true,
            description: "An optional new 'alternative method' if the user's question reveals a completely different valid approach. Otherwise, null.",
        },
    },
    required: ["newDescription", "newAlternativeMethod"],
};

export const refineStep = onCall(optionsWithApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Authentication required.");
    const { moduleId, stepIndex } = request.data;
    const moduleDoc = await db.collection("modules").doc(moduleId).get();
    if (!moduleDoc.exists) throw new HttpsError("not-found", "Module not found.");
    const step = moduleDoc.data()?.steps?.[stepIndex];
    if (!step) throw new HttpsError("not-found", "Step not found.");

    const logsSnap = await db.collection("tutorLogs")
        .where("module_id", "==", moduleId)
        .where("step_index", "==", stepIndex)
        .orderBy("created_at", "desc")
        .limit(10)
        .get();
    const questions = logsSnap.docs.map((doc) => doc.data().user_question);
    if (questions.length === 0) {
        return { suggestion: null };
    }

    const prompt = `A trainee is confused by step "${step.title}". The instruction is: "${step.description}". They asked: "${questions.join("\", \"")}". Rewrite the description to be clearer and optionally add an alternative method.`;
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: refinementSchema as any },
    });

    const suggestion = JSON.parse(response.text);
    await db.collection("aiSuggestions").add({
        moduleId,
        stepIndex,
        originalInstruction: step.description,
        suggestion: suggestion.newDescription,
        sourceQuestions: questions,
        createdAt: FieldValue.serverTimestamp(),
    });
    return { suggestion };
});


// --- Other Functions (Converted) ---

export const getTutorLogs = onCall(optionsWithoutApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Authentication is required to view logs.");
    const { moduleId } = request.data;
    const snapshot = await db.collection("tutorLogs").where("module_id", "==", moduleId).orderBy("created_at", "desc").get();
    const logs = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
    return logs;
});

export const flagQuestion = onCall(optionsWithoutApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Authentication is required to flag questions.");
    const flagData = { ...request.data, user_id: request.auth.uid, created_at: FieldValue.serverTimestamp() };
    const docRef = await db.collection("flagged_questions").add(flagData);
    return { id: docRef.id, ...flagData };
});

export const generateSpeech = onCall(optionsWithApiKey, async (request) => {
    const { text, voiceId } = request.data;
    // This is a placeholder for the actual Text-to-Speech API call
    // For a real implementation, you would use Google Cloud Text-to-Speech client library
    logger.info(`Synthesizing speech for text: "${text}" with voice: ${voiceId}`);
    // Fake base64 audio content for demonstration
    const fakeAudio = "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tAxAAAAAAAAAAAAAAAAAAAAAAA";
    return { audioContent: fakeAudio };
});

export const getQuestionFrequency = onCall(optionsWithoutApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Auth required.");
    const { moduleId } = request.data;
    const snapshot = await db.collection("tutorLogs").where("module_id", "==", moduleId).get();
    const counts: { [key: string]: { question: string, count: number, stepIndex: number } } = {};
    snapshot.forEach((doc) => {
        const data = doc.data();
        const key = `${data.step_index}-${data.user_question}`;
        if (!counts[key]) {
            counts[key] = { question: data.user_question, count: 0, stepIndex: data.step_index };
        }
        counts[key].count++;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count);
});

export const getAllTutorLogs = onCall(optionsWithoutApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Auth required.");
    const snapshot = await db.collection("tutorLogs").get();
    return snapshot.docs.map((doc) => doc.data());
});

export const getQuestionLogsByQuestion = onCall(optionsWithoutApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Auth required.");
    const { moduleId, stepIndex, question, startDate, endDate } = request.data;
    let query = db.collection("tutorLogs")
        .where("module_id", "==", moduleId)
        .where("step_index", "==", stepIndex)
        .where("user_question", "==", question);
    if (startDate) query = query.where("created_at", ">=", new Date(startDate));
    if (endDate) query = query.where("created_at", "<=", new Date(endDate));
    const snapshot = await query.orderBy("created_at", "desc").get();
    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
});

export const getFlaggedQuestions = onCall(optionsWithoutApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Auth required.");
    const { moduleId } = request.data;
    const snapshot = await db.collection("flagged_questions").where("module_id", "==", moduleId).get();
    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
});

export const logCheckpointResponse = onCall(optionsWithoutApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Auth required.");
    const response = { ...request.data, created_at: FieldValue.serverTimestamp() };
    await db.collection("checkpointResponses").add(response);
    return { success: true };
});

export const getCheckpointResponsesForModule = onCall(optionsWithoutApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Auth required.");
    const { moduleId } = request.data;
    const snapshot = await db.collection("checkpointResponses").where("module_id", "==", moduleId).get();
    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
});

export const getCheckpointFailureStats = onCall(optionsWithoutApiKey, async (request) => {
    const { moduleId } = request.data;
    const snapshot = await db.collection("checkpointResponses").where("module_id", "==", moduleId).where("answer", "==", "No").get();
    const counts: { [key: string]: { step_index: number, checkpoint_text: string, count: number } } = {};
    snapshot.forEach((doc) => {
        const data = doc.data();
        const key = `${data.step_index}`;
        if (!counts[key]) {
            counts[key] = { step_index: data.step_index, checkpoint_text: data.checkpoint_text, count: 0 };
        }
        counts[key].count++;
    });
    return Object.values(counts);
});

export const submitSuggestion = onCall(optionsWithoutApiKey, async (request) => {
    const uid = request.auth?.uid;
    const data = { ...request.data, user_id: uid, status: "pending", created_at: FieldValue.serverTimestamp() };
    const docRef = await db.collection("traineeSuggestions").add(data);
    return { id: docRef.id, ...data };
});

export const getTraineeSuggestionsForModule = onCall(optionsWithoutApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Auth required.");
    const { moduleId } = request.data;
    const snapshot = await db.collection("traineeSuggestions").where("module_id", "==", moduleId).get();
    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
});

export const getAllPendingSuggestions = onCall(optionsWithoutApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Auth required.");
    const snapshot = await db.collection("traineeSuggestions").where("status", "==", "pending").get();
    const modules = await db.collection("modules").get();
    const moduleTitles: { [id: string]: string } = {};
    modules.forEach((doc) => {
        moduleTitles[doc.id] = doc.data().title;
    });
    return snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        module_title: moduleTitles[doc.data().module_id],
    }));
});

export const deleteTraineeSuggestion = onCall(optionsWithoutApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Auth required.");
    const { suggestionId } = request.data;
    await db.collection("traineeSuggestions").doc(suggestionId).delete();
    return { success: true };
});

export const getAiSuggestionsForModule = onCall(optionsWithoutApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Auth required.");
    const { moduleId } = request.data;
    const snapshot = await db.collection("aiSuggestions").where("moduleId", "==", moduleId).get();
    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
});

export const getLatestAiSuggestionForStep = onCall(optionsWithoutApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Auth required.");
    const { moduleId, stepIndex } = request.data;
    const snapshot = await db.collection("aiSuggestions")
        .where("moduleId", "==", moduleId)
        .where("stepIndex", "==", stepIndex)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
    return snapshot.empty ? null : { ...snapshot.docs[0].data(), id: snapshot.docs[0].id };
});

export const logAiFeedback = onCall(optionsWithoutApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Auth required.");
    const data = { ...request.data, createdAt: FieldValue.serverTimestamp() };
    const docRef = await db.collection("feedbackLogs").add(data);
    return { logId: docRef.id };
});

export const updateFeedbackWithFix = onCall(optionsWithApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Auth required.");
    const { logId, fixOrRating } = request.data;
    const dataToUpdate: { feedback?: "good"; userFixText?: string; fixEmbedding?: number[] } = {};
    if (fixOrRating === "good") {
        dataToUpdate.feedback = "good";
    } else {
        dataToUpdate.userFixText = fixOrRating;
        dataToUpdate.fixEmbedding = await generateEmbedding(fixOrRating);
    }
    await db.collection("feedbackLogs").doc(logId).update(dataToUpdate);
    return { success: true };
});

export const getPastFeedbackForStep = onCall(optionsWithoutApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Auth required.");
    const { moduleId, stepIndex } = request.data;
    const snapshot = await db.collection("feedbackLogs")
        .where("moduleId", "==", moduleId)
        .where("stepIndex", "==", stepIndex)
        .orderBy("createdAt", "desc")
        .limit(5)
        .get();
    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
});

export const findSimilarFixes = onCall(optionsWithApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Auth required.");
    const { moduleId, stepIndex, userQuery } = request.data;
    const queryVector = await generateEmbedding(userQuery);
    const snapshot = await db.collection("feedbackLogs")
        .where("moduleId", "==", moduleId)
        .where("stepIndex", "==", stepIndex)
        .where("userFixText", "!=", null)
        .get();

    const results = snapshot.docs.map((doc) => {
        const data = doc.data();
        const similarity = cosineSimilarity(queryVector, data.fixEmbedding);
        return { id: doc.id, userFixText: data.userFixText, similarity };
    });

    return results
        .filter((r) => r.similarity > 0.85)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3);
});

export const getRoutinesForTemplate = onCall(optionsWithoutApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Auth required.");
    const { templateId } = request.data;
    const snapshot = await db.collection("routines").where("templateId", "==", templateId).get();
    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
});

export const getRoutineForIntent = onCall(optionsWithoutApiKey, async (request) => {
    const { templateId, intent } = request.data;
    const snapshot = await db.collection("routines")
        .where("templateId", "==", templateId)
        .where("intent", "==", intent)
        .limit(1)
        .get();
    return snapshot.empty ? null : { ...snapshot.docs[0].data(), id: snapshot.docs[0].id };
});

export const saveRoutine = onCall(optionsWithoutApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Auth required.");
    const { routineData } = request.data;
    let docRef;
    if (routineData.id) {
        docRef = db.collection("routines").doc(routineData.id);
        await docRef.update({ ...routineData, updatedAt: FieldValue.serverTimestamp() });
    } else {
        docRef = await db.collection("routines").add({ ...routineData, createdAt: FieldValue.serverTimestamp() });
    }
    const savedDoc = await docRef.get();
    return { ...savedDoc.data(), id: savedDoc.id };
});

export const deleteRoutine = onCall(optionsWithoutApiKey, async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Auth required.");
    const { routineId } = request.data;
    // Also delete associated video from GCS if it exists
    const doc = await db.collection("routines").doc(routineId).get();
    if (doc.exists && doc.data()?.videoUrl) {
        await storage.bucket(BUCKET_NAME).file(doc.data()?.videoUrl).delete().catch((e) => logger.warn("Could not delete routine video", e));
    }
    await db.collection("routines").doc(routineId).delete();
    return { success: true };
});
