import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
//
// API en local (Netlify Functions):
//   Desde la RAÍZ del repo (donde está netlify.toml):  npx netlify dev
//   Abre la URL que imprime la CLI (suele ser http://localhost:8888; el puerto puede variar).
//   Ahí Vite + Functions comparten el mismo origen; no hace falta proxy en Vite.
//
// Solo `npm run dev` (este archivo):
//   Sirve el frontend en :5173. Las rutas /verificacion, /encuestas, /autorizados no existen
//   en Vite. Para API en ese modo, define en .env del frontend:
//     VITE_API_URL=http://127.0.0.1:PUERTO
//   (p. ej. backend Python en :8000, u otra URL donde corra la API).

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("jspdf") || id.includes("html2canvas")) {
            return "pdf-export";
          }
          if (id.includes("sweetalert2")) {
            return "sweetalert";
          }
          if (id.includes("react-dom")) {
            return "react-dom";
          }
          if (id.includes("react-router")) {
            return "react-router";
          }
          if (id.includes("/react/") || id.includes("\\react\\")) {
            return "react";
          }
        },
      },
    },
  },
});
