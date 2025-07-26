"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.functions = exports.storage = exports.db = exports.auth = exports.firebaseApp = void 0;
// src/firebase.ts
const firebaseAppModule = __importStar(require("firebase/app"));
const auth_1 = require("firebase/auth");
const firestore_1 = require("firebase/firestore");
const functions_1 = require("firebase/functions");
const storage_1 = require("firebase/storage");
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
exports.firebaseApp = app;
// --- Initialize Firebase Services ---
exports.auth = (0, auth_1.getAuth)(exports.firebaseApp);
exports.db = (0, firestore_1.getFirestore)(exports.firebaseApp);
exports.storage = (0, storage_1.getStorage)(exports.firebaseApp);
exports.functions = (0, functions_1.getFunctions)(exports.firebaseApp, 'us-central1');
// --- Connect to Emulators (Only in Dev Mode) ---
if (import.meta.env.DEV) {
    if (!globalThis.EMULATORS_CONNECTED) {
        console.log('Connecting to Firebase emulators...');
        try {
            (0, auth_1.connectAuthEmulator)(exports.auth, 'http://localhost:9099');
            (0, firestore_1.connectFirestoreEmulator)(exports.db, 'localhost', 8080);
            (0, functions_1.connectFunctionsEmulator)(exports.functions, 'localhost', 5001);
            (0, storage_1.connectStorageEmulator)(exports.storage, 'localhost', 9199);
            console.log('Successfully connected to Firebase emulators.');
            globalThis.EMULATORS_CONNECTED = true;
        }
        catch (error) {
            console.error('Failed to connect to Firebase emulators:', error);
        }
    }
}
