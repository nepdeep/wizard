import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// index.html carries an import map so it can also be opened without Vite.
// Vite resolves `three` from node_modules itself, so drop the map here.
const stripImportMap = () => ({
  name: 'strip-import-map',
  transformIndexHtml: {
    order: 'pre',
    handler: (html) => html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, ''),
  },
});

export default defineConfig({
  plugins: [stripImportMap(), viteSingleFile()],
  build: { target: 'es2020', chunkSizeWarningLimit: 2000 },
});
