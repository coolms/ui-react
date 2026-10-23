import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Run from the package root (npm run demo / demo:build); the build lands in demo/dist.
export default defineConfig({
    root: 'demo',
    base: './',
    plugins: [react()],
    build: { outDir: 'dist', emptyOutDir: true },
});
