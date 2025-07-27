// src/firebase.ts
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

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

// --- Initialize Firebase App ---
export const app: FirebaseApp = initializeApp(firebaseConfig);

// --- Initialize Firebase Services ---
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');


// --- Connect to Emulators (Only in Dev Mode) ---
if (import.meta.env.DEV) {
    // Use a global flag to prevent re-connecting on hot reloads
    if (!(globalThis as any).EMULATORS_CONNECTED) {
        console.log('Connecting to Firebase emulators...');
        try {
            connectAuthEmulator(auth, 'http://localhost:9099');
            connectFirestoreEmulator(db, 'localhost', 8080);
            connectFunctionsEmulator(functions, 'localhost', 5001);
            connectStorageEmulator(storage, 'localhost', 9199);
            console.log('Successfully connected to Firebase emulators.');
            (globalThis as any).EMULATORS_CONNECTED = true;
        } catch (error) {
            console.error('Failed to connect to Firebase emulators:', error);
        }
    }
}