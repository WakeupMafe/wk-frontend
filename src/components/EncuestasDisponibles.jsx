import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DirectoryBrowser from "./DirectoryBrowser";
import "./EncuestasDisponibles.css";
import WelcomeLayout from "../layouts/WelcomeLayout";
import AutorizadosHeader from "../components/AutorizadosHeader";
import {
  WK_PERFIL_ACTUALIZADO,
  readAutorizadoCache,
} from "../lib/autorizadoPerfilEvents";

import fondo2 from "../assets/fondo2.svg";

export default function EncuestasDisponibles() {
  const navigate = useNavigate();
  const location = useLocation();

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

  const pin =
    location.state?.pin ?? sessionStorage.getItem("wk_pin") ?? undefined;

  const cacheSnap = readAutorizadoCache();
  const [usuario, setUsuario] = useState(
    () => location.state?.usuario || cacheSnap.usuario || "Usuario",
  );
  const [sede, setSede] = useState(
    () => location.state?.sede || cacheSnap.sede || "Sin sede",
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
      if (c.sede) setSede(c.sede);
      if (c.correo != null) setCorreoHeader(String(c.correo).trim());
      if (typeof c.encuestasRealizadas === "number") {
        setEncuestasRealizadas(c.encuestasRealizadas);
      }
    };
    window.addEventListener(WK_PERFIL_ACTUALIZADO, onPerfil);
    return () => window.removeEventListener(WK_PERFIL_ACTUALIZADO, onPerfil);
  }, []);

  const items = useMemo(
    () => [
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
        label: "Seguimiento clínico (Logros 2)",
        kind: "file",
        accent: "blue",
        route: "encuesta-seguimiento",
        iconSrc: iconosEncuestas?.seguimiento,
      },
    ],
    [iconosEncuestas],
  );

  const onItemClick = (item) => {
    navigate(`/sede/${encodeURIComponent(sede)}/${item.route}`, {
      state: {
        usuario,
        sede,
        encuestasRealizadas,
        cedula, // ✅ seguimos trabajando por cedula, no por pin
      },
    });
  };

  return (
    <>
      <WelcomeLayout image={fondo2} />

      <div className="page-encuestas">
        <div className="content-autorizados">
          <AutorizadosHeader
            usuario={usuario}
            sede={sede}
            correo={correoHeader}
            sessionPin={pin}
            showEncuestasCount={true}
            encuestasRealizadas={encuestasRealizadas}
          />
        </div>

        <div className="contenedorOpcionesEncuestas">
          <DirectoryBrowser
            breadcrumb={[sede, "Encuestas"]}
            items={items}
            onItemClick={onItemClick}
            backTo="/autorizados-inicio"
            backState={pin ? { pin } : undefined}
            backAriaLabel="Volver al inicio autorizados"
          />
        </div>
      </div>
    </>
  );
}
