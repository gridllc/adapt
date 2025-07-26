// gemini-functions/src/routes/chat.ts
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
    const snap = await db.collection("chatMessages").where("module_id", "==", moduleId as string).where("session_token", "==", sessionToken as string).orderBy("created_at").get();
    return res.status(200).json(snap.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
});

router.post("/", async (req, res) => {
    const { moduleId, sessionToken, message } = req.body;
    if (!moduleId || !sessionToken || !message?.id) {
        return res.status(400).json({ error: "moduleId, sessionToken, and a message with an ID are required." });
    }
    await db.collection("chatMessages").doc(message.id).set({ ...message, module_id: moduleId, session_token: sessionToken, created_at: admin.firestore.FieldValue.serverTimestamp() });
    return res.status(204).send();
});

// --- Authenticated Routes ---
router.post("/feedback", authed, async (req: AuthedRequest, res: Response) => {
    const { messageId, feedback } = req.body;
    if (!messageId || !feedback) {
        return res.status(400).json({ error: "messageId and feedback are required." });
    }
    await db.collection("chatMessages").doc(messageId).update({ feedback });
    return res.status(204).send();
});

export default router;s