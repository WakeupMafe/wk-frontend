import React from "react";
import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import { warmupBackend } from "./lib/api/warmupBackend";
import { alertWarning } from "./lib/alerts/appAlert";

/* Landing: import estático para primera pintada rápida; el resto va en chunks aparte */
import Bienvenidas from "./pages/Bienvenidas.jsx";

const Cedula = lazy(() => import("./pages/Cedula.jsx"));
const Pin = lazy(() => import("./pages/Pin.jsx"));
const Login = lazy(() => import("./pages/LoginFirstTime.jsx"));
const AutorizadosInicio = lazy(() => import("./pages/AutorizadosInicio.jsx"));
const EncuestasDisponibles = lazy(() => import("./components/EncuestasDisponibles"));
const EncuestaLogrosWKP = lazy(() => import("./components/EncuestaLogrosWKP"));
const Estadisticas = lazy(() => import("./features/logros1/Estadisticas"));
const EncuestaLogros2 = lazy(() => import("./features/logros2/EncuestaLogros2"));

function RouteFallback() {
  return (
    <div className="app-route-fallback" role="status" aria-live="polite">
      Cargando…
    </div>
  );
}

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
    <Suspense fallback={<RouteFallback />}>
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
          path="/sede/:sede/encuesta-seguimiento"
          element={
            <SafeRoute>
              <EncuestaLogros2 />
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
