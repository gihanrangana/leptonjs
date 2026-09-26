import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leptonjs } from '@leptonjs/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const packages = path.resolve(root, '../../packages');

export default defineConfig({
    plugins: [
        react(),
        leptonjs({
            backendEntry: './src/backend/main.ts',
            watch: ['./src/backend', './src/shared'],
        }),
    ],
    resolve: {
        alias: {
            '@shared': path.join(root, 'src/shared'),
            '@': path.join(root, 'src/frontend'),
        },
    },
    server: {
        host: '127.0.0.1',
        fs: {
            allow: [root, packages],
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
});
