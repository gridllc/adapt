





import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { GoogleGenAI, Type } from "@google/genai";
import { getStorage } from "firebase-admin/storage";
import { FieldValue } from "firebase-admin/firestore";


// --- Initialization ---
admin.initializeApp();
const db = admin.firestore();
const storage = getStorage();

// --- Global Configuration ---
setGlobalOptions({
    cors: [
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.1:\d+$/,
        "https://adapt-frontend-rkdt.onrender.com",
        /\.web\.app$/,
        /\.firebaseapp\.com$/,
    ],
});

const DAILY_TUTOR_LIMIT = 200;

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

export const getModule = onCall<{ moduleId: string }>(async (req) => {
    const { moduleId } = req.data;
    if (!moduleId) throw new HttpsError("invalid-argument", "A module ID is required.");
    const doc = await db.collection("modules").doc(moduleId).get();
    if (!doc.exists) throw new HttpsError("not-found", `Module not found.`);
    return doc.data();
});

export const getAvailableModules = onCall(async () => {
    const modulesSnap = await db.collection("modules").get();
    const sessionsSnap = await db.collection("sessions").get();

    const sessionData = new Map<string, { count: number, lastUsed?: string }>();
    sessionsSnap.forEach(doc => {
        const data = doc.data();
        const existing = sessionData.get(data.module_id) ?? { count: 0 };
        existing.count++;
        if (!existing.lastUsed || data.updated_at > existing.lastUsed) {
            existing.lastUsed = data.updated_at.toDate().toISOString();
        }
        sessionData.set(data.module_id, existing);
    });

    return modulesSnap.docs.map(doc => {
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

export const saveModule = onCall<{ moduleData: any }>(async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");

    const { moduleData } = req.data;
    if (!moduleData?.slug) throw new HttpsError("invalid-argument", "Module data with a slug is required.");

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
    return { ...doc.data(), ...dataToSave };
});

export const deleteModule = onCall<{ slug: string }>(async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");

    const { slug } = req.data;
    if (!slug) throw new HttpsError("invalid-argument", "A module slug is required.");

    const moduleRef = db.collection("modules").doc(slug);
    const doc = await moduleRef.get();
    if (!doc.exists || doc.data()?.user_id !== uid) {
        throw new HttpsError("permission-denied", "You do not own this module.");
    }

    // --- Comprehensive Data Cleanup ---
    logger.info(`Starting deletion for module ${slug}`);
    const collectionsToDelete = [
        "tutorLogs", "sessions", "chatMessages", "checkpointResponses",
        "aiSuggestions", "traineeSuggestions", "flagged_questions", "feedbackLogs"
    ];
    const deletionPromises: Promise<any>[] = collectionsToDelete.map(coll =>
        db.collection(coll).where("module_id", "==", slug).get().then(snap => {
            const batch = db.batch();
            snap.forEach(d => batch.delete(d.ref));
            return batch.commit();
        })
    );

    // Video file in GCS
    const videoUrl = doc.data()?.video_url;
    if (videoUrl && typeof videoUrl === "string") {
        deletionPromises.push(
            storage.bucket().file(videoUrl).delete().catch(e =>
                logger.warn(`Could not delete video ${videoUrl} for module ${slug}:`, e)
            )
        );
    }

    // Main module doc
    deletionPromises.push(moduleRef.delete());

    await Promise.all(deletionPromises);
    logger.info(`Successfully deleted module ${slug} and all associated data.`);
    return { success: true };
});


// --- GCS Signed URL Functions ---

export const getSignedUploadUrl = onCall<{ slug: string; contentType: string; fileExtension: string }>(async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");

    const { slug, contentType, fileExtension } = req.data;
    const filePath = `videos/${uid}/${slug}.${fileExtension}`;
    const file = storage.bucket().file(filePath);
    const [url] = await file.getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 15 * 60 * 1000, // 15 mins
        contentType,
    });
    return { uploadUrl: url, filePath };
});

export const getSignedManualUploadUrl = onCall<{ fileName: string; contentType: string }>(async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");

    const { fileName, contentType } = req.data;
    // Sanitize filename to prevent path traversal
    const safeFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const filePath = `manuals_for_processing/${uid}/${Date.now()}_${safeFileName}`;

    const file = storage.bucket().file(filePath);
    const [url] = await file.getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 15 * 60 * 1000, // 15 mins
        contentType,
    });

    return { uploadUrl: url, filePath };
});


export const getSignedDownloadUrl = onCall<{ filePath: string }>(async (req) => {
    const { filePath } = req.data;
    if (!filePath) throw new HttpsError("invalid-argument", "A file path is required.");

    const file = storage.bucket().file(filePath);
    const [url] = await file.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });
    return { downloadUrl: url };
});


// --- Session & Chat Functions ---

export const getSession = onCall<{ moduleId: string; sessionToken: string }>(async (req) => {
    const { moduleId, sessionToken } = req.data;
    const snap = await db.collection("sessions").where("module_id", "==", moduleId).where("session_token", "==", sessionToken).limit(1).get();
    return snap.empty ? null : snap.docs[0].data();
});

export const saveSession = onCall<any>(async (req) => {
    const { moduleId, sessionToken, ...dataToSave } = req.data;
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

export const getChatHistory = onCall<{ moduleId: string; sessionToken: string }>(async (req) => {
    const { moduleId, sessionToken } = req.data;
    const snap = await db.collection("chatMessages")
        .where("module_id", "==", moduleId)
        .where("session_token", "==", sessionToken)
        .orderBy("created_at")
        .get();
    return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
});

export const saveChatMessage = onCall<{ moduleId: string; sessionToken: string; message: any }>(async (req) => {
    const { moduleId, sessionToken, message } = req.data;
    await db.collection("chatMessages").doc(message.id).set({
        ...message,
        module_id: moduleId,
        session_token: sessionToken,
        created_at: FieldValue.serverTimestamp(),
    });
    return { success: true };
});

export const updateMessageFeedback = onCall<{ messageId: string; feedback: "good" | "bad" }>(async (req) => {
    if (!req.auth?.uid) throw new HttpsError("unauthenticated", "Authentication required.");
    const { messageId, feedback } = req.data;
    await db.collection("chatMessages").doc(messageId).update({ feedback });
    return { success: true };
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

export const logTutorInteraction = onCall<LogTutorInteractionData>({ secrets: ["API_KEY"] }, async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Authentication required.");

    const { userQuestion, tutorResponse, moduleId, stepIndex, templateId, stepTitle, remoteType, aliases } = req.data;

    // --- Rate Limiting ---
    const today = new Date().toISOString().split("T")[0];
    const usageRef = db.collection("userUsage").doc(`${uid}_${today}`);
    const usageDoc = await usageRef.get();

    if ((usageDoc.data()?.tutorInteractions ?? 0) >= DAILY_TUTOR_LIMIT) {
        throw new HttpsError("resource-exhausted", "You have reached the daily limit for AI tutor interactions.");
    }
    // --- End Rate Limiting ---

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

    // New logic for logging alias usage for analytics
    if (aliases && aliases.length > 0) {
        for (const detected of aliases) {
            // Create a document ID from the module, formal name, and the alias phrase itself.
            // Sanitize the alias to make it a safe document ID.
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
                            phrase: detected.alias, // log the informal phrase
                            mappedButton: detected.formalName,
                            moduleId: moduleId,
                            frequency: 1,
                            createdAt: FieldValue.serverTimestamp(),
                        });
                    }
                });
            } catch (e) {
                logger.error("Alias log transaction failed:", e);
                // Non-fatal error for analytics logging
            }
        }
    }


    await usageRef.set({ tutorInteractions: FieldValue.increment(1) }, { merge: true });
    return { status: "logged" };
});

export const findSimilarInteractions = onCall<{ question: string; moduleId: string }>({ secrets: ["API_KEY"] }, async (req) => {
    if (!req.auth?.uid) throw new HttpsError("unauthenticated", "Authentication required.");
    const { question, moduleId } = req.data;
    const queryVector = await generateEmbedding(question);

    // Fetch the module to get the templateId if it exists
    const moduleDoc = await db.collection("modules").doc(moduleId).get();
    const templateId = moduleDoc.data()?.metadata?.templateId;

    let query = db.collection("tutorLogs").where("module_id", "==", moduleId);
    if (templateId) {
        // If template exists, broaden search to all modules with the same template
        query = db.collection("tutorLogs").where("template_id", "==", templateId);
    }
    const snapshot = await query.get();


    const results = snapshot.docs.map(doc => {
        const data = doc.data();
        const similarity = cosineSimilarity(queryVector, data.vector);
        return { ...data, id: doc.id, similarity };
    });

    return results
        .filter(r => r.similarity > 0.8)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3);
});

const refinementSchema = {
    type: Type.OBJECT,
    properties: {
        newDescription: {
            type: Type.STRING,
            description: "The rewritten, clearer step description that addresses the user's points of confusion.",
        },
        newAlternativeMethod: {
            type: Type.OBJECT,
            nullable: true,
            description: "If a completely new alternative method is warranted by the confusion, define it here. Otherwise, null.",
            properties: {
                title: { type: Type.STRING, description: "A title for the new alternative method." },
                description: { type: Type.STRING, description: "The description for the new alternative method." },
            },
        },
    },
    required: ["newDescription", "newAlternativeMethod"],
};

export const refineStep = onCall<{ moduleId: string; stepIndex: number }>(
    { secrets: ["API_KEY"] },
    async (request): Promise<{ suggestion: any }> => {
        if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Authentication required.");
        const ai = getAiClient();
        const { moduleId, stepIndex } = request.data;
        const moduleDoc = await db.collection("modules").doc(moduleId).get();
        if (!moduleDoc.exists) throw new HttpsError("not-found", "Module not found.");
        const step = moduleDoc.data()?.steps?.[stepIndex];
        if (!step) throw new HttpsError("not-found", "Step not found.");

        const logsSnapshot = await db.collection("tutorLogs").where("module_id", "==", moduleId).where("step_index", "==", stepIndex).get();
        const questions = [...new Set(logsSnapshot.docs.map((doc) => doc.data().user_question).filter(Boolean))];
        if (questions.length === 0) return { suggestion: null };

        const prompt = `
            You are an expert instructional designer. A trainee is confused by a step in a manual.
            **Current Step Title:** "${step.title}"
            **Current Step Description:** "${step.description}"
            **Trainee Questions Indicating Confusion:**\n- ${questions.join("\n- ")}
            **Your Task:**
            1. Rewrite the 'description' to be much clearer and to proactively answer the trainee's questions.
            2. If the confusion suggests a fundamentally different way to perform the step, create a new 'alternativeMethod'.
            3. Return the result as a JSON object adhering to the provided schema.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: refinementSchema,
            },
        });

        if (!response.text) {
            throw new HttpsError("internal", "AI returned an empty response.");
        }

        try {
            const parsedSuggestion = JSON.parse(response.text.trim());
            return { suggestion: parsedSuggestion };
        } catch (e) {
            logger.error("Failed to parse AI JSON for refineStep:", response.text, e);
            throw new HttpsError("internal", "AI returned invalid JSON.");
        }
    }
);

export const flagQuestion = onCall<any>(
    async (request): Promise<{ status: string; issueId: string }> => {
        const uid = request.auth?.uid;
        if (!uid) {
            throw new HttpsError("unauthenticated", "You must be logged in to flag a question.");
        }
        const data = request.data;
        if (!data.module_id || !data.user_question) {
            throw new HttpsError("invalid-argument", "Missing required fields for flagging.");
        }

        const ref = db.collection("flagged_questions").doc();
        await ref.set({
            ...data,
            user_id: uid,
            created_at: FieldValue.serverTimestamp(),
        });
        return { status: "ok", issueId: ref.id };
    }
);

export const getFlaggedQuestions = onCall<{ moduleId: string }>(
    async (request): Promise<any[]> => {
        const uid = request.auth?.uid;
        if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");

        const { moduleId } = request.data;
        if (!moduleId) throw new HttpsError("invalid-argument", "A module ID must be provided.");

        const moduleDoc = await db.collection("modules").doc(moduleId).get();
        if (!moduleDoc.exists || moduleDoc.data()?.user_id !== uid) {
            throw new HttpsError("permission-denied", "You do not have permission to view flagged questions for this module.");
        }

        const snapshot = await db.collection("flagged_questions")
            .where("module_id", "==", moduleId)
            .orderBy("created_at", "desc")
            .get();

        return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
    }
);

export const getCheckpointFailureStats = onCall<{ moduleId: string }>(async (request) => {
    const { moduleId } = request.data;
    const snapshot = await db.collection("checkpointResponses")
        .where("module_id", "==", moduleId)
        .where("answer", "==", "No")
        .get();

    const stats: Record<string, { step_index: number, checkpoint_text: string, count: number }> = {};
    snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const key = `${data.step_index}:${data.checkpoint_text}`;
        if (!stats[key]) {
            stats[key] = { step_index: data.step_index, checkpoint_text: data.checkpoint_text, count: 0 };
        }
        stats[key].count++;
    });
    return Object.values(stats).sort((a, b) => b.count - a.count);
});

export const getQuestionFrequency = onCall<{ moduleId: string }>(async (request) => {
    const { moduleId } = request.data;
    if (!moduleId) throw new HttpsError("invalid-argument", "Module ID is required.");

    const snapshot = await db.collection("tutorLogs").where("module_id", "==", moduleId).get();
    const stats: Record<string, { question: string, stepIndex: number, count: number }> = {};

    snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.user_question) {
            const key = data.user_question.toLowerCase().trim();
            if (!stats[key]) {
                stats[key] = { question: data.user_question, stepIndex: data.step_index, count: 0 };
            }
            stats[key].count++;
        }
    });
    return Object.values(stats).sort((a, b) => b.count - a.count);
});

// --- Suggestions Service Functions ---

export const submitSuggestion = onCall<any>(async (req) => {
    const uid = req.auth?.uid; // Can be anonymous
    const { moduleId, stepIndex, text } = req.data;
    const ref = await db.collection("traineeSuggestions").add({
        module_id: moduleId,
        step_index: stepIndex,
        text: text,
        user_id: uid,
        status: "pending",
        created_at: FieldValue.serverTimestamp(),
    });
    return { id: ref.id, ...req.data };
});

export const deleteTraineeSuggestion = onCall<{ suggestionId: string }>(async (req) => {
    if (!req.auth?.uid) throw new HttpsError("unauthenticated", "Authentication required.");
    await db.collection("traineeSuggestions").doc(req.data.suggestionId).delete();
    return { success: true };
});

// --- Checkpoint Service Functions ---

export const logCheckpointResponse = onCall<any>(async (req) => {
    const { moduleId, userId, stepIndex, checkpointText, answer, comment } = req.data;
    await db.collection("checkpointResponses").add({
        module_id: moduleId,
        user_id: userId,
        step_index: stepIndex,
        checkpoint_text: checkpointText,
        answer,
        comment,
        created_at: FieldValue.serverTimestamp(),
    });
    return { success: true };
});

// --- Feedback Service Functions (for Live Coach) ---

export const logAiFeedback = onCall<any>(async (req) => {
    const { sessionToken, moduleId, stepIndex, userPrompt, aiResponse, feedback } = req.data;
    const ref = await db.collection("feedbackLogs").add({
        sessionToken, moduleId, stepIndex, userPrompt, aiResponse, feedback,
        created_at: FieldValue.serverTimestamp(),
    });
    return { logId: ref.id };
});

export const updateFeedbackWithFix = onCall<any>({ secrets: ["API_KEY"] }, async (req) => {
    const { logId, fixOrRating } = req.data;
    const updateData: { feedback: "good" | "bad", userFixText?: string, fixEmbedding?: number[] } = {
        feedback: fixOrRating === "good" ? "good" : "bad",
    };
    if (fixOrRating !== "good") {
        updateData.userFixText = fixOrRating;
        updateData.fixEmbedding = await generateEmbedding(fixOrRating);
    }
    await db.collection("feedbackLogs").doc(logId).update(updateData);
    return { success: true };
});


// --- Routines Service Functions ---

export const saveRoutine = onCall<any>(async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Authentication required.");

    const { routine } = req.data;
    const { id, ...dataToSave } = routine;

    dataToSave.userId = uid;
    dataToSave.updatedAt = FieldValue.serverTimestamp();

    if (id) {
        const routineRef = db.collection("routines").doc(id);
        await routineRef.update(dataToSave);
        const doc = await routineRef.get();
        return { id: doc.id, ...doc.data() };
    } else {
        dataToSave.createdAt = FieldValue.serverTimestamp();
        const newRef = await db.collection("routines").add(dataToSave);
        const doc = await newRef.get();
        return { id: doc.id, ...doc.data() };
    }
});

export const getRoutineForIntent = onCall<{ templateId: string; intent: string }>(async (req) => {
    const { templateId, intent } = req.data;
    const snap = await db.collection("routines")
        .where("templateId", "==", templateId)
        .where("intent", "==", intent)
        .limit(1)
        .get();

    if (snap.empty) return null;

    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
});

export const getSignedRoutineVideoUploadUrl = onCall<any>(async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Authentication required.");

    const { templateId, intent, contentType } = req.data;
    const filePath = `routines_videos/${uid}/${templateId}_${intent}_${Date.now()}`;
    const file = storage.bucket().file(filePath);

    const [url] = await file.getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 15 * 60 * 1000,
        contentType,
    });

    return { uploadUrl: url, filePath };
});