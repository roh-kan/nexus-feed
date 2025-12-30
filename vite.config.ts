
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    // Shimming process.env for browser compatibility with the GenAI SDK
    'process.env': {}
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});
