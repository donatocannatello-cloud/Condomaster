import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';
import { defineConfig } from 'vite';

function getBuildId(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  define: {
    __BUILD_ID__: JSON.stringify(getBuildId()),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
