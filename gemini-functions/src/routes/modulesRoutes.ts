// gemini-functions/src/routes/modules.ts
import * as express from "express";
import { Response } from "express";
import * as logger from "firebase-functions/logger";
import { db, storage, admin } from "../firebase"; // Use centralized admin
import { authed, AuthedRequest } from "../middleware/authed";

const router = express.Router();
const BUCKET_NAME = process.env.GCLOUD_STORAGE_BUCKET || "adapt-frontend-rkdt.appspot.com";


// --- Public Routes ---
router.get("/", async (req, res) => {
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

router.get("/:slug", async (req, res) => {
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
router.post("/", authed, async (req: AuthedRequest, res: Response) => {
    const uid = req.auth.uid;
    const { moduleData } = req.body;
    if (!moduleData?.slug) {
        return res.status(400).json({ error: "Module data with a slug is required." });
    }

    const moduleRef = db.collection("modules").doc(moduleData.slug);
    const doc = await moduleRef.get();
    if (doc.exists && doc.data()?.user_id !== uid) {
        return res.status(403).json({ error: "You do not own this module." });
    }

    const dataToSave = { ...moduleData, user_id: uid, updated_at: admin.firestore.FieldValue.serverTimestamp(), ...(doc.exists ? {} : { created_at: admin.firestore.FieldValue.serverTimestamp() }) };
    await moduleRef.set(dataToSave, { merge: true });
    const savedDoc = await moduleRef.get();
    return res.status(200).json(savedDoc.data());
});

router.delete("/:slug", authed, async (req: AuthedRequest, res: Response) => {
    const uid = req.auth.uid;
    const { slug } = req.params;
    const moduleRef = db.collection("modules").doc(slug);
    const doc = await moduleRef.get();
    if (!doc.exists || doc.data()?.user_id !== uid) {
        return res.status(403).json({ error: "You do not own this module." });
    }

    const collectionsToDelete = [
        "tutorLogs", "sessions", "chatMessages", "checkpointResponses", "aiSuggestions",
        "traineeSuggestions", "flagged_questions", "feedbackLogs", "manualUploads",
        "routines", "quizAttempts", "stepDurations",
    ];

    const deletionPromises: Promise<any>[] = collectionsToDelete.map((coll) =>
        db.collection(coll).where("module_id", "==", slug).get().then((snap) => {
            const batch = db.batch();
            snap.forEach((d) => batch.delete(d.ref));
            return batch.commit();
        })
    );

    if (doc.data()?.video_url) {
        deletionPromises.push(storage.bucket(BUCKET_NAME).file(doc.data()?.video_url).delete().catch((e) => logger.warn(`Could not delete video for module ${slug}:`, e)));
    }

    deletionPromises.push(moduleRef.delete());
    await Promise.all(deletionPromises);
    return res.status(204).send();
});

export default router;