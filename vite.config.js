import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Con `netlify dev` suele usarse el puerto que indique Netlify (p. ej. 8888).
    // Con solo `npm run dev`, define `VITE_API_URL` o levanta `netlify dev` en paralelo.
    proxy: {
      "^/(verificacion|encuestas|autorizados)(/|$)": {
        target: "http://127.0.0.1:8888",
        changeOrigin: true,
      },
    },
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
