import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DirectoryBrowser from "./DirectoryBrowser";
import "./EncuestasDisponibles.css";
import WelcomeLayout from "../layouts/WelcomeLayout";
import AutorizadosHeader from "../components/AutorizadosHeader";

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

  // ✅ Todo viene desde AutorizadosInicio (ya sin pin)
  const usuario = location.state?.usuario || "Usuario";
  const sede = location.state?.sede || "Sin sede";
  const encuestasRealizadas = location.state?.encuestasRealizadas ?? 0;
  const cedula = location.state?.cedula ?? null;

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
            showEncuestasCount={true}
            encuestasRealizadas={encuestasRealizadas}
          />
        </div>

        <div className="contenedorOpcionesEncuestas">
          <DirectoryBrowser
            breadcrumb={[sede, "Encuestas"]}
            items={items}
            onItemClick={onItemClick}
          />
        </div>
      </div>
    </>
  );
}
