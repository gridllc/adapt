// gemini-functions/src/index.ts
import * as functions from "firebase-functions/v1";
import express from "express";
import cors from "cors";

// Import modular routers from renamed files
import modulesRoutes from "./routes/modulesRoutes";
import sessionsRoutes from "./routes/sessionRoutes";
import chatRoutes from "./routes/chatRoutes";
import routinesRoutes from "./routes/routinesRoutes";
import uploadsRoutes from "./routes/uploadsRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import suggestionsRoutes, { getAllPendingSuggestionsCallable } from "./routes/suggestionsRoutes";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// --- Mount all API routes ---
app.use("/modules", modulesRoutes);
app.use("/sessions", sessionsRoutes);
app.use("/chat", chatRoutes);
app.use("/routines", routinesRoutes);
app.use("/uploads", uploadsRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/suggestions", suggestionsRoutes);


// --- Export the main Express API as a single Cloud Function ---
// The 'any' cast is a pragmatic solution for type mismatches with firebase-functions/v1
export const api = functions.https.onRequest(app as any);


// --- Export Callable Functions ---
// These are separate from the main 'api' Express app.
export const getAllPendingSuggestions = functions.https.onCall(getAllPendingSuggestionsCallable);


// Note: Additional callable functions would be exported here as well.