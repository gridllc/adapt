// gemini-functions/src/routes/suggestions.ts
import * as express from "express";
import { https } from "firebase-functions/v1";
import * as logger from "firebase-functions/logger";
import { db, admin } from "../firebase";

const router = express.Router();

// This file will contain both the Express routes for suggestions (if any are needed)
// and the logic for the callable functions related to suggestions.

// --- Callable Function Logic ---

export const getAllPendingSuggestionsCallable = async (data: any, context: https.CallableContext) => {
    if (!context.auth) {
        throw new https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    try {
        const suggestionsSnap = await db.collection("traineeSuggestions").where("status", "==", "pending").get();
        const moduleIds = [...new Set(suggestionsSnap.docs.map((doc) => doc.data().module_id))];
        if (moduleIds.length === 0) {
            return [];
        }
        // Use a batched `getAll` for efficiency if moduleIds is large, though `in` is fine for moderate numbers.
        const modulesSnap = await db.collection("modules").where(admin.firestore.FieldPath.documentId(), "in", moduleIds).get();
        const moduleTitles = new Map(modulesSnap.docs.map((doc) => [doc.id, doc.data().title]));

        const suggestions = suggestionsSnap.docs.map((doc) => {
            const sdata = doc.data();
            return {
                ...sdata,
                id: doc.id,
                module_title: moduleTitles.get(sdata.module_id) || "Unknown Module",
            };
        });
        return suggestions;
    } catch (err) {
        logger.error("Error in getAllPendingSuggestions:", err);
        throw new https.HttpsError("internal", "Failed to retrieve suggestions.");
    }
};

// --- Add Express routes for suggestions below if needed ---

// Example: router.get('/', authed, async (req, res) => { ... });

export default router;