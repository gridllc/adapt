// gemini-functions/src/routes/analytics.ts
import * as express from "express";
import { Response } from "express";
import * as logger from "firebase-functions/logger";
import { db, admin } from "../firebase";
import { authed, AuthedRequest } from "../middleware/authed";

const router = express.Router();

router.get("/tutor-logs/all", authed, async (req: AuthedRequest, res: Response) => {
    try {
        const logsSnap = await db.collection("tutorLogs").orderBy("created_at", "desc").limit(500).get();
        const logs = logsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        return res.status(200).json(logs);
    } catch (err) {
        logger.error("Error fetching all tutor logs:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/question-frequency", authed, async (req: AuthedRequest, res: Response) => {
    const { moduleId } = req.query;
    if (!moduleId) {
        return res.status(400).json({ error: "moduleId is required." });
    }
    try {
        const logsSnap = await db.collection("tutorLogs")
            .where("module_id", "==", moduleId as string)
            .limit(1000) // Add limit to prevent performance issues
            .get();
        const counts = new Map<string, { count: number, stepIndex: number }>();
        logsSnap.forEach((doc) => {
            const data = doc.data();
            const key = `${data.step_index}-${data.user_question}`;
            const existing = counts.get(key) ?? { count: 0, stepIndex: data.step_index };
            existing.count++;
            counts.set(key, existing);
        });
        const stats = Array.from(counts.entries()).map(([key, value]) => {
            const [, question] = key.split(/-(.+)/);
            return { question, ...value };
        });
        return res.status(200).json(stats);
    } catch (err) {
        logger.error(`Error fetching question frequency for ${moduleId}:`, err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/tutor-logs", authed, async (req: AuthedRequest, res: Response) => {
    const { moduleId } = req.query;
    if (!moduleId) {
        return res.status(400).json({ error: "moduleId is required." });
    }
    try {
        const logsSnap = await db.collection("tutorLogs").where("module_id", "==", moduleId as string).orderBy("created_at", "desc").get();
        const logs = logsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        return res.status(200).json(logs);
    } catch (err) {
        logger.error(`Error fetching tutor logs for ${moduleId}:`, err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/question-logs", authed, async (req: AuthedRequest, res: Response) => {
    const { moduleId, stepIndex, question, startDate, endDate } = req.query;
    if (!moduleId || !stepIndex || !question) {
        return res.status(400).json({ error: "moduleId, stepIndex, and question are required." });
    }
    try {
        let query: admin.firestore.Query = db.collection("tutorLogs")
            .where("module_id", "==", moduleId as string)
            .where("step_index", "==", Number(stepIndex))
            .where("user_question", "==", question as string);

        if (startDate) {
            query = query.where("created_at", ">=", new Date(startDate as string));
        }
        if (endDate) {
            query = query.where("created_at", "<=", new Date(endDate as string));
        }
        const logsSnap = await query.orderBy("created_at", "desc").get();
        const logs = logsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        return res.status(200).json(logs);
    } catch (err) {
        logger.error("Error fetching question logs:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;