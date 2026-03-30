import React from "react";
import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import { warmupBackend } from "./lib/api/warmupBackend";
import { alertWarning } from "./lib/alerts/appAlert";

// Páginas
import Bienvenidas from "./pages/Bienvenidas.jsx";
import Cedula from "./pages/Cedula.jsx";
import Pin from "./pages/Pin.jsx";
import Login from "./pages/LoginFirstTime.jsx";
import AutorizadosInicio from "./pages/AutorizadosInicio.jsx";
import EncuestasDisponibles from "./components/EncuestasDisponibles";
import EncuestaLogrosWKP from "./components/EncuestaLogrosWKP";
import Estadisticas from "./features/logros1/Estadisticas";

function RouteError({ error }) {
  return (
    <div style={{ padding: 24, fontFamily: "Poppins" }}>
      <h2>Ups, algo falló 😕</h2>
      <p>Intenta volver al inicio.</p>
      <pre style={{ whiteSpace: "pre-wrap", opacity: 0.8 }}>
        {String(error?.message || error)}
      </pre>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Route crash:", error, info);
  }

  render() {
    if (this.state.hasError) return <RouteError error={this.state.error} />;
    return this.props.children;
  }
}

// 👇 helper para envolver cada página y evitar “pantalla en blanco”
function SafeRoute({ children }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function App() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await warmupBackend(API_URL);
      if (cancelled) return;
      if (!result.ok) {
        console.error("Warmup backend:", result.error);
        await alertWarning({
          title: "No se pudo conectar",
          text: "Comprueba tu conexión a internet e intenta recargar la página en un momento.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <SafeRoute>
            <Bienvenidas />
          </SafeRoute>
        }
      />

      <Route
        path="/cedula"
        element={
          <SafeRoute>
            <Cedula />
          </SafeRoute>
        }
      />

      <Route
        path="/pin"
        element={
          <SafeRoute>
            <Pin />
          </SafeRoute>
        }
      />
      <Route
        path="/login"
        element={
          <SafeRoute>
            <Login />
          </SafeRoute>
        }
      />

      <Route
        path="/autorizados-inicio"
        element={
          <SafeRoute>
            <AutorizadosInicio />
          </SafeRoute>
        }
      />

      <Route
        path="/sede/:sede/encuestas"
        element={
          <SafeRoute>
            <EncuestasDisponibles />
          </SafeRoute>
        }
      />

      <Route
        path="/sede/:sede/encuesta-logros"
        element={
          <SafeRoute>
            <EncuestaLogrosWKP />
          </SafeRoute>
        }
      />
      <Route
        path="/estadisticas"
        element={
          <SafeRoute>
            <Estadisticas />
          </SafeRoute>
        }
      />

      {/* ✅ Si caes en cualquier otra ruta, no queda blanco */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
