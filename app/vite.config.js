import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { viteSingleFile } from 'vite-plugin-singlefile';

// SPLV_WEB=1 → one self-contained HTML file for the web link (scripts/build-web.mjs).
const WEB = process.env.SPLV_WEB === '1';

export default defineConfig({
  base: WEB ? './' : '/',
  plugins: WEB
    ? [react(), viteSingleFile()]
    : [
        react(),
        // Extra transpiled bundle + polyfills for old Android System WebView (Chrome 61+),
        // otherwise modern syntax gives a blank white screen on older phones.
        legacy({ targets: ['chrome >= 61', 'android >= 5'], modernPolyfills: true }),
      ],
  build: WEB
    ? { outDir: 'dist-web', target: 'es2020', chunkSizeWarningLimit: 2000 }
    : {
        target: 'es2020',
        chunkSizeWarningLimit: 900,
        rollupOptions: {
          output: {
            // Three.js lives in its own lazy chunk (architecture.md §5).
            manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined),
          },
        },
      },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
