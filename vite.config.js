import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
//
// Puerto fijo (no 5173): si otro Vite ocupa 5173, `netlify dev` seguiría proxyando ahí y verías
// el proyecto equivocado en :8888. Debe coincidir con [dev].targetPort en netlify.toml.
const DEV_PORT = 5188;

// API en local (Netlify Functions):
//   Desde la RAÍZ del repo o desde frontend/:  npx netlify dev
//   Abre la URL que imprime la CLI (proxy suele ser :8889 en este repo; evita :8888 compartido).
//   Ahí Vite + Functions comparten el mismo origen; no hace falta proxy en Vite.
//
// Solo `npm run dev` (este archivo):
//   Sirve el frontend en el puerto DEV_PORT. Las rutas /verificacion, /encuestas, /autorizados no existen
//   en Vite. Para API en ese modo, define en .env del frontend:
//     VITE_API_URL=http://127.0.0.1:PUERTO
//   (p. ej. backend Python en :8000, u otra URL donde corra la API).

export default defineConfig({
  plugins: [react()],
  server: {
    port: DEV_PORT,
    strictPort: true,
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
