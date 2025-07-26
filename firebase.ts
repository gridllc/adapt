// src/firebase.ts
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/functions';
import 'firebase/compat/storage';

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// --- Initialize Firebase ---
// This pattern prevents re-initializing the app on hot reloads.
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();

// --- Initialize Firebase Services ---
export const auth = app.auth();
export const db = app.firestore();
export const storage = app.storage();
export const functions = app.functions('us-central1');

// --- Connect to Emulators (Only in Dev Mode) ---
if (import.meta.env.DEV) {
    // Use a global flag to prevent re-connecting on hot reloads
    if (!(globalThis as any).EMULATORS_CONNECTED) {
        console.log('Connecting to Firebase emulators...');
        try {
            auth.useEmulator('http://localhost:9099');
            db.useEmulator('localhost', 8080);
            functions.useEmulator('localhost', 5001);
            storage.useEmulator('localhost', 9199);
            console.log('Successfully connected to Firebase emulators.');
            (globalThis as any).EMULATORS_CONNECTED = true;
        } catch (error) {
            console.error('Failed to connect to Firebase emulators:', error);
        }
    }
}
