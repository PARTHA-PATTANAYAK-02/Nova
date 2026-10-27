import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // expose to local network
  },
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("react-router-dom") ||
              id.includes("react-dom") ||
              id.includes("/react/") ||
              id.includes("\\react\\")
            ) {
              return "vendor-react";
            }
            if (
              id.includes("@reduxjs") ||
              id.includes("react-redux") ||
              id.includes("redux-persist")
            ) {
              return "vendor-redux";
            }
            if (
              id.includes("lucide-react") ||
              id.includes("react-icons") ||
              id.includes("@animateicons")
            ) {
              return "vendor-icons";
            }
            if (id.includes("@radix-ui") || id.includes("cmdk")) {
              return "vendor-ui";
            }
            if (id.includes("socket.io-client")) {
              return "vendor-socket";
            }
          }
        },
      },
    },
  },
});

