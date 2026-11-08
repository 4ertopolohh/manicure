import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:8018",
      "/media": "http://127.0.0.1:8018",
      "/admin": "http://127.0.0.1:8018",
      "/static": "http://127.0.0.1:8018",
      "/robots.txt": "http://127.0.0.1:8018",
      "/sitemap.xml": "http://127.0.0.1:8018",
    },
  },
  build: { sourcemap: false },
});
