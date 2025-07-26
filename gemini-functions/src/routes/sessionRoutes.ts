// gemini-functions/src/routes/sessions.ts
import * as express from "express";
import { Response } from "express";
import { db, admin } from "../firebase"; // Use centralized admin
import { authed, AuthedRequest } from "../middleware/authed";

const router = express.Router();

// --- Public Routes ---
router.get("/", async (req, res) => {
    const { moduleId, sessionToken } = req.query;
    if (!moduleId || !sessionToken) {
        return res.status(400).json({ error: "moduleId and sessionToken are required." });
    }
    const snap = await db.collection("sessions").where("module_id", "==", moduleId as string).where("session_token", "==", sessionToken as string).limit(1).get();
    return res.status(200).json(snap.empty ? null : snap.docs[0].data());
});

router.post("/", async (req, res) => {
    const { moduleId, sessionToken, ...dataToSave } = req.body;
    if (!moduleId || !sessionToken) {
        return res.status(400).json({ error: "moduleId and sessionToken are required." });
    }
    const snap = await db.collection("sessions").where("module_id", "==", moduleId).where("session_token", "==", sessionToken).limit(1).get();
    (dataToSave as any).updated_at = admin.firestore.FieldValue.serverTimestamp();
    if (snap.empty) {
        (dataToSave as any).created_at = admin.firestore.FieldValue.serverTimestamp();
        await db.collection("sessions").add({ module_id: moduleId, session_token: sessionToken, ...dataToSave });
    } else {
        await snap.docs[0].ref.update(dataToSave);
    }
    return res.status(204).send();
});

// --- Authenticated Routes ---
router.get("/summary", authed, async (req: AuthedRequest, res: Response) => {
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
    const summary = { ...sessionData, startedAt: sessionData.created_at?.toMillis(), endedAt: sessionData.updated_at?.toMillis(), durationsPerStep };
    return res.status(200).json(summary);
});

router.get("/count/total", authed, async (req: AuthedRequest, res: Response) => {
    const count = (await db.collection("sessions").count().get()).data().count;
    return res.status(200).json(count);
});

router.get("/count/completed", authed, async (req: AuthedRequest, res: Response) => {
    const count = (await db.collection("sessions").where("is_completed", "==", true).count().get()).data().count;
    return res.status(200).json(count);
});

export default router;