// This file augments the global ImportMeta type and defines custom environment variables.
// By defining them here, we get type safety and autocompletion in our code.

interface ImportMetaEnv {
  // Custom variables defined in .env files
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
  readonly VITE_API_KEY: string; // Renamed for consistency

  // Vite's built-in environment variables
  BASE_URL: string;
  MODE: string;
  DEV: boolean;
  PROD: boolean;
  SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}