import { defineConfig } from 'vite';

// dist/ also holds tsc output and build info, so the web build gets its own subfolder.
export default defineConfig({
  build: { outDir: 'dist/web' },
});
