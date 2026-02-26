import { useEffect, useRef, useState } from "react";
import WelcomeLayout from "../layouts/WelcomeLayout";
import fondo from "../assets/fondo2.svg";
import { useLocation, useNavigate } from "react-router-dom";
import "./AutorizadosInicio.css";
import ButtonC from "../components/ButtonComponente";
import FloatingFolders from "../components/FloatingFolders.jsx";
import AutorizadosHeader from "../components/AutorizadosHeader";
import { sweetAlert } from "../components/SweetAlert";
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function AutorizadosInicio() {
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ PIN llega por navigate(..., { state: { pin } })
  const pin = location.state?.pin || sessionStorage.getItem("wk_pin") || null;

  const [usuario, setUsuario] = useState("Usuario");
  const [sede, setSede] = useState("Sin sede");
  const [cedula, setCedula] = useState(null);
  const [encuestasRealizadas, setEncuestasRealizadas] = useState(0);

  // ✅ loading para evitar placeholders
  const [loading, setLoading] = useState(true);

  // ✅ evita pedir 2 veces
  const yaPidio = useRef(false);

  useEffect(() => {
    if (!pin) {
      sweetAlert({
        icon: "warning",
        title: "Sesión no encontrada",
        text: "No llegó el PIN. Vuelve a iniciar desde la pantalla de PIN (evita recargar esta página).",
        confirmButtonText: "Ir al inicio",
      }).then(() => navigate("/"));
      return;
    }

    // ✅ 1) Pintar rápido desde cache
    let tieneCache = false;
    const cached = sessionStorage.getItem("wk_autorizado");
    if (cached) {
      try {
        const c = JSON.parse(cached);
        setUsuario(c.usuario ?? "Usuario");
        setSede(c.sede ?? "Sin sede");
        setCedula(c.cedula ?? null);
        setEncuestasRealizadas(c.encuestasRealizadas ?? 0);
        setLoading(false); // ✅ ya hay datos, no muestres "Cargando..."
        tieneCache = true;
      } catch (_) {
        // ignore
      }
    }

    // ✅ Evita pedir 2 veces si el componente se monta/desmonta raro
    if (yaPidio.current) return;
    yaPidio.current = true;

    const cargarDatos = async () => {
      // ✅ 2) SOLO muestra "Cargando..." si NO hay cache
      if (!tieneCache) setLoading(true);

      try {
        const res = await fetch(
          `${API_URL}/autorizados/pin/${encodeURIComponent(pin)}`,
        );
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          await sweetAlert({
            icon: "error",
            title: "Error",
            text: "No se pudo cargar la información del usuario.",
            confirmButtonText: "Aceptar",
          });
          return;
        }

        const info = data?.data;

        setUsuario(info?.nombres || "Usuario");
        setSede(info?.sede || "Sin sede");
        setCedula(info?.cedula ?? null);
        setEncuestasRealizadas(info?.encuestas_realizadas ?? 0);

        // ✅ 3) actualizar cache
        sessionStorage.setItem("wk_pin", pin);
        sessionStorage.setItem(
          "wk_autorizado",
          JSON.stringify({
            usuario: info?.nombres || "Usuario",
            sede: info?.sede || "Sin sede",
            cedula: info?.cedula ?? null,
            encuestasRealizadas: info?.encuestas_realizadas ?? 0,
          }),
        );
      } catch (error) {
        await sweetAlert({
          icon: "error",
          title: "Error de conexión",
          text: "No fue posible conectar con el servidor.",
          confirmButtonText: "Aceptar",
        });
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [pin, navigate]);

  const abrirSede = (sedeSeleccionada) => {
    navigate(`/sede/${encodeURIComponent(sedeSeleccionada)}/encuestas`, {
      state: {
        usuario,
        sede: sedeSeleccionada,
        cedula,
        encuestasRealizadas,
      },
    });
  };

  return (
    <>
      <WelcomeLayout image={fondo} />

      <div className="ContenidoAutorizados">
        <AutorizadosHeader
          usuario={loading ? "Cargando..." : usuario}
          sede={loading ? "Cargando..." : sede}
          showEncuestasCount={true}
          encuestasRealizadas={loading ? "..." : encuestasRealizadas}
        />

        <div className="Autorizados-botones">
          <ButtonC
            width="40%"
            onClick={() =>
              navigate("/encuestas-disponibles", {
                state: {
                  usuario,
                  sede,
                  cedula,
                  pin, // lo dejas por ahora
                  encuestasRealizadas,
                },
              })
            }
          >
            Encuestas Disponibles
          </ButtonC>

          <ButtonC width="40%">Estadísticas</ButtonC>
        </div>

        <div className="Autorizados-tarjetas">
          <FloatingFolders
            items={[
              { title: "Poblado" },
              { title: "Laureles" },
              { title: "Barranquilla" },
            ]}
            onFolderClick={(item) => abrirSede(item.title)}
          />
        </div>
      </div>
    </>
  );
}
