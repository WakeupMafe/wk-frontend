import React from "react";
import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

// Páginas
import Bienvenidas from "./pages/Bienvenidas.jsx";
import Cedula from "./pages/Cedula.jsx";
import Pin from "./pages/Pin.jsx";
import Login from "./pages/LoginFirstTime.jsx";
import AutorizadosInicio from "./pages/AutorizadosInicio.jsx";
import EncuestasDisponibles from "./components/EncuestasDisponibles";
import EncuestaLogrosWKP from "./components/EncuestaLogrosWKP";

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

export default function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("http://127.0.0.1:8000/", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Backend ${res.status}`);
        return res.json();
      })
      .then((json) => setData(json))
      .catch((err) => {
        // ✅ si navegaste y se abortó, no es error real
        if (err.name === "AbortError") return;
        console.error("Error backend:", err);
      });

    return () => controller.abort();
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

      {/* ✅ Si caes en cualquier otra ruta, no queda blanco */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
