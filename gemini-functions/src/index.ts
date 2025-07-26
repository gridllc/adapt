


import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage";
import { FieldValue } from "firebase-admin/firestore";
import express from "express";
import cors from "cors";

// --- Initialization ---
admin.initializeApp();
const db = admin.firestore();
const storage = getStorage();

// --- Constants ---
const BUCKET_NAME = process.env.GCLOUD_STORAGE_BUCKET || "adapt-frontend-rkdt.appspot.com";

// --- API Setup ---
const apiApp = express();
apiApp.use(cors({ origin: true }));
apiApp.use(express.json());

// --- Authentication Middleware ---
const authed = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const idToken = req.headers.authorization?.split("Bearer ")[1];
    if (!idToken) {
        return res.status(401).send("Unauthorized: No token provided.");
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        (req as any).auth = decodedToken;
        return next();
    } catch (err) {
        return res.status(403).send("Unauthorized: Invalid token.");
    }
};

// --- Public Routes ---
apiApp.get("/modules", async (req: express.Request, res: express.Response) => {
    try {
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

        const modules = modulesSnap.docs.map((doc) => {
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
        return res.status(200).json(modules);
    } catch (err) {
        logger.error("Error fetching available modules:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

apiApp.get("/modules/:slug", async (req: express.Request, res: express.Response) => {
    try {
        const doc = await db.collection("modules").doc(req.params.slug).get();
        if (!doc.exists) {
            return res.status(404).json({ error: "Module not found." });
        }
        return res.status(200).json(doc.data());
    } catch (err) {
        logger.error(`Error fetching module ${req.params.slug}:`, err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// --- Authenticated Routes ---

// Modules
apiApp.post("/modules", authed, async (req: express.Request, res: express.Response) => {
    const uid = (req as any).auth.uid;
    const { moduleData } = req.body;
    if (!moduleData?.slug) {
        return res.status(400).json({ error: "Module data with a slug is required." });
    }

    const moduleRef = db.collection("modules").doc(moduleData.slug);
    const doc = await moduleRef.get();
    if (doc.exists && doc.data()?.user_id !== uid) {
        return res.status(403).json({ error: "You do not own this module." });
    }

    const dataToSave = { ...moduleData, user_id: uid, updated_at: FieldValue.serverTimestamp(), ...(doc.exists ? {} : { created_at: FieldValue.serverTimestamp() }) };
    await moduleRef.set(dataToSave, { merge: true });
    const savedDoc = await moduleRef.get();
    return res.status(200).json(savedDoc.data());
});

apiApp.delete("/modules/:slug", authed, async (req: express.Request, res: express.Response) => {
    const uid = (req as any).auth.uid;
    const { slug } = req.params;
    const moduleRef = db.collection("modules").doc(slug);
    const doc = await moduleRef.get();
    if (!doc.exists || doc.data()?.user_id !== uid) {
        return res.status(403).json({ error: "You do not own this module." });
    }

    const collectionsToDelete = [
        "tutorLogs",
        "sessions",
        "chatMessages",
        "checkpointResponses",
        "aiSuggestions",
        "traineeSuggestions",
        "flagged_questions",
        "feedbackLogs",
        "manualUploads",
        "routines",
        "quizAttempts",
        "stepDurations",
    ];
    const deletionPromises: Promise<any>[] = collectionsToDelete.map((coll) => db.collection(coll).where("module_id", "==", slug).get().then((snap) => {
        const batch = db.batch();
        snap.forEach((d) => batch.delete(d.ref));
        return batch.commit();
    }));
    if (doc.data()?.video_url) {
        deletionPromises.push(storage.bucket(BUCKET_NAME).file(doc.data()?.video_url).delete().catch((e) => logger.warn(`Could not delete video for module ${slug}:`, e)));
    }
    deletionPromises.push(moduleRef.delete());
    await Promise.all(deletionPromises);
    return res.status(204).send();
});

// Signed URLs
apiApp.post("/uploads/signed-url", authed, async (req: express.Request, res: express.Response) => {
    const uid = (req as any).auth.uid;
    const { type, id, contentType, fileExtension } = req.body; // type: 'module' | 'routine' | 'manual'
    let filePath;
    switch (type) {
        case "module":
            filePath = `videos/${uid}/${id}.${fileExtension}`;
            break;
        case "routine":
            filePath = `routines/${uid}/${id}.${fileExtension}`;
            break;
        case "manual":
            filePath = `manuals_for_processing/${uid}/${Date.now()}_${id}`;
            break;
        default:
            return res.status(400).json({ error: "Invalid upload type." });
    }
    const file = storage.bucket(BUCKET_NAME).file(filePath);
    const [url] = await file.getSignedUrl({ version: "v4", action: "write", expires: Date.now() + 15 * 60 * 1000, contentType });
    return res.status(200).json({ uploadUrl: url, filePath });
});

apiApp.post("/downloads/signed-url", authed, async (req: express.Request, res: express.Response) => {
    const { filePath } = req.body;
    if (!filePath) {
        return res.status(400).json({ error: "A file path is required." });
    }
    const file = storage.bucket(BUCKET_NAME).file(filePath);
    const [url] = await file.getSignedUrl({ version: "v4", action: "read", expires: Date.now() + 60 * 60 * 1000 });
    return res.status(200).json({ downloadUrl: url });
});


// Sessions
apiApp.get("/sessions", async (req: express.Request, res: express.Response) => {
    const { moduleId, sessionToken } = req.query;
    if (!moduleId || !sessionToken) {
        return res.status(400).json({ error: "moduleId and sessionToken are required." });
    }
    const snap = await db.collection("sessions").where("module_id", "==", moduleId as string).where("session_token", "==", sessionToken as string).limit(1).get();
    return res.status(200).json(snap.empty ? null : snap.docs[0].data());
});

apiApp.post("/sessions", async (req: express.Request, res: express.Response) => {
    const { moduleId, sessionToken, ...dataToSave } = req.body;
    if (!moduleId || !sessionToken) {
        return res.status(400).json({ error: "moduleId and sessionToken are required." });
    }
    const snap = await db.collection("sessions").where("module_id", "==", moduleId).where("session_token", "==", sessionToken).limit(1).get();
    (dataToSave as any).updated_at = FieldValue.serverTimestamp();
    if (snap.empty) {
        (dataToSave as any).created_at = FieldValue.serverTimestamp();
        await db.collection("sessions").add({ module_id: moduleId, session_token: sessionToken, ...dataToSave });
    } else {
        await snap.docs[0].ref.update(dataToSave);
    }
    return res.status(204).send();
});

apiApp.get("/sessions/summary", async (req: express.Request, res: express.Response) => {
    const { moduleId, sessionToken } = req.query;
    if (!moduleId || !sessionToken) {
        return res.status(400).json({ error: "moduleId and sessionToken are required." });
    }
    const snap = await db.collection("sessions").where("module_id", "==", moduleId as string).where("session_token", "==", sessionToken as string).limit(1).get();
    if (snap.empty) {
        return res.status(404).json({ error: "Session not found." });
    }
    const sessionData = snap.docs[0].data();
    const events = (sessionData.liveCoachEvents || []).filter((e: any) => e.eventType === "step_advance").sort((a: any, b: any) => a.timestamp - b.timestamp);
    const durationsPerStep: Record<number, number> = {};
    for (let i = 0; i < events.length - 1; i++) {
        durationsPerStep[events[i].stepIndex] = events[i + 1].timestamp - events[i].timestamp;
    }
    const summary = { ...sessionData, startedAt: sessionData.created_at.toMillis(), endedAt: sessionData.updated_at.toMillis(), durationsPerStep };
    return res.status(200).json(summary);
});

apiApp.get("/sessions/count/total", async (req: express.Request, res: express.Response) => {
    return res.status(200).json((await db.collection("sessions").count().get()).data().count);
});
apiApp.get("/sessions/count/completed", async (req: express.Request, res: express.Response) => {
    return res.status(200).json((await db.collection("sessions").where("is_completed", "==", true).count().get()).data().count);
});

// Chat
apiApp.get("/chat", async (req: express.Request, res: express.Response) => {
    const { moduleId, sessionToken } = req.query;
    if (!moduleId || !sessionToken) {
        return res.status(400).json({ error: "moduleId and sessionToken are required." });
    }
    const snap = await db.collection("chatMessages").where("module_id", "==", moduleId as string).where("session_token", "==", sessionToken as string).orderBy("created_at").get();
    return res.status(200).json(snap.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
});

apiApp.post("/chat", async (req: express.Request, res: express.Response) => {
    const { moduleId, sessionToken, message } = req.body;
    if (!moduleId || !sessionToken || !message?.id) {
        return res.status(400).json({ error: "moduleId, sessionToken, and a message with an ID are required." });
    }
    await db.collection("chatMessages").doc(message.id).set({ ...message, module_id: moduleId, session_token: sessionToken, created_at: FieldValue.serverTimestamp() });
    return res.status(204).send();
});

apiApp.post("/chat/feedback", authed, async (req: express.Request, res: express.Response) => {
    const { messageId, feedback } = req.body;
    if (!messageId || !feedback) {
        return res.status(400).json({ error: "messageId and feedback are required." });
    }
    await db.collection("chatMessages").doc(messageId).update({ feedback });
    return res.status(204).send();
});


// --- Export the express app as a Cloud Function ---
// The Firebase SDK is designed to handle Express apps, and the cors middleware
// within the app will manage CORS headers and preflight requests.
export const api = functions.https.onRequest(apiApp);
