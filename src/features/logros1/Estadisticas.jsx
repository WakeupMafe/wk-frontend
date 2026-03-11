import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { alertError, alertInfo, alertWarning } from "../../lib/alerts/appAlert";
import LogrosFase1Viewer from "./LogrosFase1Viewer";
import AutorizadosHeader from "../../components/AutorizadosHeader";
import "./Estadisticas.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Estadisticas() {
  const navigate = useNavigate();

  const [cedulaBusqueda, setCedulaBusqueda] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [pacienteEncontrado, setPacienteEncontrado] = useState(null);

  const [usuario, setUsuario] = useState("Usuario");
  const [sede, setSede] = useState("Sin sede");
  const [encuestasRealizadas, setEncuestasRealizadas] = useState(0);

  useEffect(() => {
    const cached = sessionStorage.getItem("wk_autorizado");
    if (!cached) return;

    try {
      const data = JSON.parse(cached);
      setUsuario(data.usuario || "Usuario");
      setSede(data.sede || "Sin sede");
      setEncuestasRealizadas(data.encuestasRealizadas || 0);
    } catch {
      // ignore
    }
  }, []);

  const handleBuscar = async () => {
    const documento = String(cedulaBusqueda).trim();

    if (!documento) {
      await alertWarning({
        title: "Campo requerido",
        text: "Debes ingresar una cédula para realizar la búsqueda.",
      });
      return;
    }

    if (!/^\d+$/.test(documento)) {
      await alertWarning({
        title: "Cédula inválida",
        text: "La cédula debe contener solo números.",
      });
      return;
    }

    setBuscando(true);
    setPacienteEncontrado(null);

    try {
      const res = await fetch(
        `${API_URL}/verificacion/logros-fase1/${encodeURIComponent(documento)}`,
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 404) {
          await alertInfo({
            title: "Sin resultados",
            text: "No se encontró encuesta para esa cédula.",
          });
          return;
        }

        await alertError({
          title: "Error",
          text: json?.detail || "No se pudo consultar la encuesta.",
        });
        return;
      }

      const row = json?.data;

      if (!row) {
        await alertInfo({
          title: "Sin resultados",
          text: "No se encontró información para esa cédula.",
        });
        return;
      }

      setPacienteEncontrado(row);
    } catch (error) {
      console.error(error);
      await alertError({
        title: "Error de conexión",
        text: "No fue posible conectar con el servidor.",
      });
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="estadisticasPage">
      <div className="estadisticasPage__wrap">
        <AutorizadosHeader
          usuario={usuario}
          sede={sede}
          showEncuestasCount={true}
          encuestasRealizadas={encuestasRealizadas}
        />

        <div className="estadisticas">
          <button
            type="button"
            className="estadisticas__volver"
            onClick={() => navigate(-1)}
          >
            ← Volver
          </button>

          <div className="estadisticas__header">
            <div>
              <h1 className="estadisticas__titulo">Estadísticas</h1>
              <p className="estadisticas__subtitulo">
                Visualización y descarga de encuestas
              </p>
            </div>
          </div>

          <div className="estadisticas__buscadorBox">
            <input
              type="text"
              className="estadisticas__input"
              placeholder="Cédula del paciente"
              value={cedulaBusqueda}
              onChange={(e) => setCedulaBusqueda(e.target.value)}
            />

            <button
              type="button"
              className="estadisticas__buscarBtn"
              onClick={handleBuscar}
              disabled={buscando}
            >
              {buscando ? "Buscando..." : "Realizar búsqueda"}
            </button>
          </div>

          {pacienteEncontrado ? (
            <LogrosFase1Viewer paciente={pacienteEncontrado} />
          ) : (
            <div className="estadisticas__empty">
              Ingresa una cédula para visualizar la encuesta del paciente.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
