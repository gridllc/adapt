import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    // This plugin is required to copy the service worker to the root of the output directory
    viteStaticCopy({
      targets: [
        {
          src: 'public/sw.js',
          dest: ''
        }
      ]
    })
  ],
  resolve: {
    alias: {
      // Use the simpler alias path as suggested to resolve build issues.
      // This path is relative to the project root.
      '@': '/src',
    },
  },
})
