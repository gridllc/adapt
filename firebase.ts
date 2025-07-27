// src/firebase.ts
import * as firebaseAppModule from 'firebase/app';
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

// --- Initialize Firebase ---
// This pattern prevents re-initializing the app on hot reloads.
const app = firebaseAppModule.getApps().length > 0 ? firebaseAppModule.getApp() : firebaseAppModule.initializeApp(firebaseConfig);
export const firebaseApp = app;


// --- Initialize Firebase Services ---
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
export const functions = getFunctions(firebaseApp, 'us-central1');

// --- Connect to Emulators (Only in Dev Mode) ---
if (import.meta.env.DEV) {
    if (!(globalThis as any).EMULATORS_CONNECTED) {
        console.log('Connecting to Firebase emulators...');
        try {
            connectAuthEmulator(auth, 'http://localhost:9100');
            connectFirestoreEmulator(db, 'localhost', 8100);
            connectFunctionsEmulator(functions, 'localhost', 5100);
            connectStorageEmulator(storage, 'localhost', 9200);
            console.log('Successfully connected to Firebase emulators.');
            (globalThis as any).EMULATORS_CONNECTED = true;
        } catch (error) {
            console.error('Failed to connect to Firebase emulators:', error);
        }
    }
}