import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: "dist",
    // Production source maps are expensive in memory/CPU during container builds.
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1200,
  },
});
