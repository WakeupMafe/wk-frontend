import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import DirectoryBrowser from "./DirectoryBrowser";
import "./EncuestasDisponibles.css";
import WelcomeLayout from "../layouts/WelcomeLayout";
import AutorizadosHeader from "../components/AutorizadosHeader";
import {
  WK_PERFIL_ACTUALIZADO,
  readAutorizadoCache,
} from "../lib/autorizadoPerfilEvents";

import fondo2 from "../assets/fondo2.svg";

/** Misma lista para todas las carpetas de sede (Poblado, Laureles, Barranquilla, …). */
function buildEncuestaItems(iconosEncuestas) {
  return [
    {
      id: "encuesta-logros",
      label: "Encuesta De Logros",
      kind: "file",
      accent: "green",
      route: "encuesta-logros",
      iconSrc: iconosEncuestas?.logros,
    },
    {
      id: "encuesta-seguimiento",
      label: "Evaluación de Resultados Clínicos – Fase 2",
      kind: "file",
      accent: "blue",
      route: "encuesta-seguimiento",
      iconSrc: iconosEncuestas?.seguimiento,
    },
    {
      id: "encuesta-seguimiento-fase3",
      label: "Evaluación de Resultados Clínicos – Fase 3",
      kind: "file",
      accent: "blue",
      route: "encuesta-seguimiento-fase3",
      iconSrc: iconosEncuestas?.seguimiento,
    },
  ];
}

export default function EncuestasDisponibles() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sede: sedeParam } = useParams();

  /** Carpeta de sede abierta en la URL — no la sede del perfil del usuario. */
  const sedeCarpeta = useMemo(() => {
    const fromUrl = sedeParam ? decodeURIComponent(sedeParam) : "";
    if (fromUrl) return fromUrl;
    return (
      location.state?.sedeCarpeta ||
      location.state?.sede ||
      "Sin sede"
    );
  }, [sedeParam, location.state?.sedeCarpeta, location.state?.sede]);

  /** PNG grandes en chunk aparte: no bloquean el JS inicial de la ruta */
  const [iconosEncuestas, setIconosEncuestas] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import("../assets/Logros.png"),
      import("../assets/Seguimientos.png"),
    ])
      .then(([mLogros, mSeg]) => {
        if (!cancelled) {
          setIconosEncuestas({
            logros: mLogros.default,
            seguimiento: mSeg.default,
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  /** Persist folder context so Logros 1/2/3 can resolve sede after refresh. */
  useEffect(() => {
    if (!sedeCarpeta || sedeCarpeta === "Sin sede") return;
    try {
      sessionStorage.setItem(
        "wk_contexto_directorio",
        JSON.stringify({ sede: sedeCarpeta }),
      );
    } catch {
      // ignore
    }
  }, [sedeCarpeta]);

  const pin =
    location.state?.pin ?? sessionStorage.getItem("wk_pin") ?? undefined;

  const cacheSnap = readAutorizadoCache();
  const [usuario, setUsuario] = useState(
    () => location.state?.usuario || cacheSnap.usuario || "Usuario",
  );
  /** Sede del perfil (header); distinta de la carpeta abierta. */
  const [headerSede, setHeaderSede] = useState(
    () => cacheSnap.sede || location.state?.sede || sedeCarpeta || "Sin sede",
  );
  const [correoHeader, setCorreoHeader] = useState(
    () => String(cacheSnap.correo ?? "").trim(),
  );
  const [encuestasRealizadas, setEncuestasRealizadas] = useState(
    () => location.state?.encuestasRealizadas ?? cacheSnap.encuestasRealizadas ?? 0,
  );
  const cedula = location.state?.cedula ?? cacheSnap.cedula ?? null;

  useEffect(() => {
    const onPerfil = () => {
      const c = readAutorizadoCache();
      if (c.usuario) setUsuario(c.usuario);
      if (c.sede) setHeaderSede(c.sede);
      if (c.correo != null) setCorreoHeader(String(c.correo).trim());
      if (typeof c.encuestasRealizadas === "number") {
        setEncuestasRealizadas(c.encuestasRealizadas);
      }
    };
    window.addEventListener(WK_PERFIL_ACTUALIZADO, onPerfil);
    return () => window.removeEventListener(WK_PERFIL_ACTUALIZADO, onPerfil);
  }, []);

  const items = useMemo(
    () => buildEncuestaItems(iconosEncuestas),
    [iconosEncuestas],
  );

  const listNavState = {
    usuario,
    sede: sedeCarpeta,
    sedeCarpeta,
    encuestasRealizadas,
    cedula,
    ...(pin ? { pin } : {}),
  };

  const onItemClick = (item) => {
    navigate(`/sede/${encodeURIComponent(sedeCarpeta)}/${item.route}`, {
      state: listNavState,
    });
  };

  return (
    <>
      <WelcomeLayout image={fondo2} />

      <div className="page-encuestas">
        <div className="content-autorizados">
          <AutorizadosHeader
            usuario={usuario}
            sede={headerSede}
            correo={correoHeader}
            sessionPin={pin}
            showEncuestasCount={true}
            encuestasRealizadas={encuestasRealizadas}
          />
        </div>

        <div className="contenedorOpcionesEncuestas">
          <DirectoryBrowser
            breadcrumb={["Inicio", sedeCarpeta, "Encuestas"]}
            items={items}
            onItemClick={onItemClick}
            onCrumbClick={(idx) => {
              if (idx === 0) {
                navigate("/autorizados-inicio", {
                  state: pin ? { pin } : undefined,
                });
                return;
              }
              if (idx === 1) {
                navigate(`/sede/${encodeURIComponent(sedeCarpeta)}/encuestas`, {
                  state: listNavState,
                });
              }
            }}
            backTo="/autorizados-inicio"
            backState={pin ? { pin } : undefined}
            backAriaLabel="Volver al inicio autorizados"
          />
        </div>
      </div>
    </>
  );
}
