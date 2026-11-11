/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
    // The suite renders whole pages and simulates typing in 30+ files at once. On a busy machine a single
    // test can take several seconds, so the default 5 seconds is too tight. This is a ceiling, not a delay:
    // fast tests still finish fast.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
})