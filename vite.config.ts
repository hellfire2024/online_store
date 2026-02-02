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
    sourcemap: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Optimize chunk splitting to reduce main chunk size
        manualChunks: (id) => {
          // Admin pages in separate chunk
          if (id.includes("/pages/admin/")) {
            return "admin";
          }
          
          // Context providers in separate chunk
          if (id.includes("/context/")) {
            return "context";
          }
          
          // Services in separate chunk
          if (id.includes("/services/")) {
            return "services";
          }
          
          // Vendor chunk for node_modules
          if (id.includes("node_modules")) {
            if (id.includes("react")) {
              return "vendor";
            }
            return "vendor";
          }
        },
      },
    },
  },
});
