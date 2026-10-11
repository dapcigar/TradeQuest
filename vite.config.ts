import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vitest runs with its default 'node' environment; no `test` block needed.
export default defineConfig({
  plugins: [react()],
});
