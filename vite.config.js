import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// All game code, styles, and fonts are embedded in dist/index.html so the
// finished game can also be played by opening the file without a server.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'es2022',
    assetsInlineLimit: Infinity,
    chunkSizeWarningLimit: 1600,
  },
});
