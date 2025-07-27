// gemini-functions/src/routes/routinesRoutes.ts
import express from "express";
import * as logger from "firebase-functions/logger";
import { db, admin } from "../firebase"; // Use centralized admin
import { authed, AuthedRequest } from "../middleware/authed";

const router = express.Router();

// --- Public Routes ---
router.get("/intent", async (req: express.Request, res: express.Response) => {
    const { templateId, intent } = (req as any).query;
    if (!templateId || !intent) {
        return (res as any).status(400).json({ error: "templateId and intent are required." });
    }
    try {
        const snap = await db.collection("routines")
            .where("templateId", "==", templateId as string)
            .where("intent", "==", intent as string)
            .limit(1).get();
        if (snap.empty) {
            return (res as any).status(404).json({ error: "Routine not found." });
        }
        return (res as any).status(200).json({ id: snap.docs[0].id, ...snap.docs[0].data() });
    } catch (err) {
        logger.error(`Error fetching routine for intent ${intent}:`, err);
        return (res as any).status(500).json({ error: "Internal server error" });
    }
});


// --- Authenticated Routes ---
router.get("/", authed, async (req: AuthedRequest, res: express.Response) => {
    const uid = req.auth.uid;
    try {
        const routinesSnap = await db.collection("routines").where("userId", "==", uid).get();
        const routines = routinesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        return (res as any).status(200).json(routines);
    } catch (err) {
        logger.error("Error fetching routines:", err);
        return (res as any).status(500).json({ error: "Internal server error" });
    }
});

router.get("/template/:templateId", authed, async (req: AuthedRequest, res: express.Response) => {
    const { templateId } = (req as any).params;
    try {
        const routinesSnap = await db.collection("routines").where("templateId", "==", templateId).get();
        const routines = routinesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        return (res as any).status(200).json(routines);
    } catch (err) {
        logger.error(`Error fetching routines for template ${templateId}:`, err);
        return (res as any).status(500).json({ error: "Internal server error" });
    }
});

router.post("/", authed, async (req: AuthedRequest, res: express.Response) => {
    const uid = req.auth.uid;
    const { routineData } = (req as any).body;
    if (!routineData?.templateId || !routineData.intent) {
        return (res as any).status(400).json({ error: "Routine data with templateId and intent is required." });
    }
    try {
        const dataToSave = { ...routineData, userId: uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
        let docRef;
        if (routineData.id) {
            docRef = db.collection("routines").doc(routineData.id);
            await docRef.update(dataToSave);
        } else {
            (dataToSave as any).createdAt = admin.firestore.FieldValue.serverTimestamp();
            docRef = await db.collection("routines").add(dataToSave);
        }
        const savedDoc = await docRef.get();
        return (res as any).status(200).json({ id: savedDoc.id, ...savedDoc.data() });
    } catch (err) {
        logger.error("Error saving routine:", err);
        return (res as any).status(500).json({ error: "Internal server error" });
    }
});

router.delete("/:routineId", authed, async (req: AuthedRequest, res: express.Response) => {
    const uid = req.auth.uid;
    const { routineId } = (req as any).params;
    const routineRef = db.collection("routines").doc(routineId);
    const doc = await routineRef.get();
    if (!doc.exists || doc.data()?.userId !== uid) {
        return (res as any).status(403).json({ error: "You do not own this routine." });
    }
    await routineRef.delete();
    return (res as any).status(204).send();
});

export default router;