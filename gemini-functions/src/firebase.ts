// gemini-functions/src/firebase.ts
import * as admin from "firebase-admin";

// --- Initialize Admin App Safely (Avoid Re-initializing in Emulator/Test) ---
if (!admin.apps.length) {
  admin.initializeApp();
}

// --- Export Admin SDK Services ---
export { admin };
export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
