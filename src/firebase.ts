// src/firebase.ts
import * as firebase from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';


// Securely load Firebase config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
export let firebaseApp: firebase.FirebaseApp;
try {
  firebaseApp = firebase.getApp();
} catch (e) {
  firebaseApp = firebase.initializeApp(firebaseConfig);
}


// Initialize and export Firebase services
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
// Initialize Functions for a specific region for consistency with the backend
export const functions = getFunctions(firebaseApp, 'us-central1');

// Connect to emulators in development mode
if (import.meta.env.DEV) {
  // Use a global flag to prevent connecting multiple times during HMR
  // A type assertion is used to inform TypeScript about our custom property.
  if (!(globalThis as any).EMULATORS_CONNECTED) {
    console.log("Connecting to Firebase emulators...");
    try {
      connectAuthEmulator(auth, "http://localhost:9099");
      connectFirestoreEmulator(db, "localhost", 8080);
      connectFunctionsEmulator(functions, "localhost", 5001);
      connectStorageEmulator(storage, "localhost", 9199);
      console.log("Successfully connected to Firebase emulators.");
      // Set the flag to true after connecting
      (globalThis as any).EMULATORS_CONNECTED = true;
    } catch (error) {
      console.error("Failed to connect to Firebase emulators:", error);
    }
  }
}