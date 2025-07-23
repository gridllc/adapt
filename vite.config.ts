import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), tsconfigPaths()],
  publicDir: 'public',

  // 1) In dev, don’t pre-bundle fsevents
  optimizeDeps: {
    exclude: ['fsevents'],
  },

  build: {
    outDir: 'dist', // Explicitly set output directory
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // 2) In production, treat fsevents as external
      external: ['fsevents'],
      output: {
        // 3) Arrow-fn for manualChunks to avoid parser issues
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router-dom')
            ) {
              return 'vendor-react'
            }
            if (id.includes('@tanstack') || id.includes('firebase')) {
              return 'vendor-data'
            }
            if (id.includes('@google/genai') || id.includes('@mediapipe')) {
              return 'vendor-ai'
            }
            return 'vendor'
          }
        },
      },
    },
  },
})