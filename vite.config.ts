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
        manualChunks: {
          // Vendor chunks based on purpose, not just module presence
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-pdf": ["jspdf", "html2canvas"],
          "vendor-editor": [
            "@tiptap/react",
            "@tiptap/starter-kit",
            "@tiptap/extension-text-style",
            "@tiptap/extension-color",
            "@tiptap/extension-font-family",
            "@tiptap/extension-highlight",
            "@tiptap/extension-horizontal-rule",
            "@tiptap/extension-image",
            "@tiptap/extension-link",
            "@tiptap/extension-text-align",
            "@tiptap/extension-underline",
          ],
          "vendor-dnd": ["@dnd-kit/core", "@dnd-kit/sortable"],
        },
      },
    },
  },
});
