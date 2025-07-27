// gemini-functions/src/index.ts
import { onRequest } from "firebase-functions/v2/https";
import { onCall } from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";

// Import modular routers from renamed files
import modulesRoutes from "./routes/modulesRoutes";
import sessionsRoutes from "./routes/sessionsRoutes";
import chatRoutes from "./routes/chatRoutes";
import routinesRoutes from "./routes/routinesRoutes";
import uploadsRoutes from "./routes/uploadsRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import suggestionsRoutes, { getAllPendingSuggestionsCallable } from "./routes/suggestionsRoutes";

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

// --- Mount all API routes ---
app.use("/modules", modulesRoutes);
app.use("/sessions", sessionsRoutes);
app.use("/chat", chatRoutes);
app.use("/routines", routinesRoutes);
app.use("/uploads", uploadsRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/suggestions", suggestionsRoutes);


// --- Export the main Express API as a single Cloud Function ---
// By adding the options object, we help TypeScript resolve the correct function overload.
export const api = onRequest({ region: "us-central1" }, app);


// --- Export Callable Functions ---
// These are separate from the main 'api' Express app.
export const getAllPendingSuggestions = onCall(getAllPendingSuggestionsCallable);


// Note: Additional callable functions would be exported here as well.