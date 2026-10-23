import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The published build: one ES module, React left to the application. No source maps -- a map's sourcesContent would
// ship the source a second time, past every check that reads files by path.
export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: false,
        lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'index.js' },
        rollupOptions: { external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'] },
    },
});
