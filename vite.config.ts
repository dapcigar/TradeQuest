import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vitest uses its default 'node' environment; keep test configuration in Vitest config.
export default defineConfig({
  plugins: [react()],
});
