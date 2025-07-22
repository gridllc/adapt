/// <reference types="vite/client" />

// The reference to "vite/client" was removed to resolve a "Cannot find type definition file" error.
// This can happen in environments where Vite's node_modules are not correctly resolved by the TypeScript server.
// The interfaces below will augment the global ImportMeta type, which is a standard feature in modern JavaScript/TypeScript projects.

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
  // This is for the Gemini API client-side
  readonly VITE_GEMINI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}