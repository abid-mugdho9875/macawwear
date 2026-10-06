/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Dev: proxy Netlify Functions to netlify-cli when running `netlify dev`.
      "/.netlify/functions": {
        target: "http://localhost:8888",
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // Bumped from the 5s default. The CheckoutPage suite renders a form with
    // many <Field> components and types several inputs through @testing-library/
    // user-event v14 (which awaits internal delays per character). Combined
    // with jsdom's render cost for a connected <MemoryRouter>+<CartProvider>
    // tree, individual tests legitimately take 4-6 seconds.
    testTimeout: 15000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/test/**", "src/**/*.test.{ts,tsx}", "src/main.tsx"],
    },
  },
});