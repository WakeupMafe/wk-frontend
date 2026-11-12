import type { HandlerResponse } from "@netlify/functions";
import { binaryResponse, jsonResponse } from "../_lib/http";
import {
  loadComparativaPorDocumento,
  loadListadoAnalisis,
  loadPacientesAnalisisFull,
  type AnalisisFiltros,
} from "../_lib/analisisLogrosData";
import {
  buildAnalisisWorkbook,
  filtrosTextoResumen,
} from "../_lib/analisisLogrosExcel";
import {
  ESTADO_LABEL,
  ESTADO_LABEL_CORTO,
  formatDocumentoDisplay,
  formatFechaDDMMYYYY,
} from "../_lib/analisisLogros";

function errBody(detail: string | Record<string, unknown>) {
  return { detail };
}

function parseFiltros(
  query: Record<string, string | undefined> | null,
): AnalisisFiltros {
  const minRaw = parseInt(query?.min_encuestas ?? "2", 10);
  const page = parseInt(query?.page ?? "1", 10);
  const pageSize = parseInt(query?.page_size ?? query?.limit ?? "20", 10);
  const cap = parseInt(query?.cap ?? "1500", 10);
  return {
    sede: query?.sede?.trim() || null,
    scope_sede: query?.scope_sede?.trim() || null,
    fecha_desde: query?.fecha_desde?.trim() || query?.desde?.trim() || null,
    fecha_hasta: query?.fecha_hasta?.trim() || query?.hasta?.trim() || null,
    plan: query?.plan?.trim() || null,
    q: query?.q?.trim() || query?.buscar?.trim() || null,
    min_encuestas: Number.isFinite(minRaw) ? minRaw : 2,
    page: Number.isFinite(page) ? page : 1,
    page_size: Number.isFinite(pageSize) ? pageSize : 20,
    cap: Number.isFinite(cap) ? cap : 1500,
  };
}

function serializePacienteListado(p: Awaited<
  ReturnType<typeof loadListadoAnalisis>
>["pacientes"][number]) {
  return {
    documento: p.documento,
    documento_display: formatDocumentoDisplay(p.documento),
    tipo_documento: p.tipo_documento,
    nombres: p.nombres,
    apellidos: p.apellidos,
    nombre_completo: p.nombre_completo,
    sede: p.sede,
    plan: p.plan,
    profesional_nombre: p.profesional_nombre,
    tiene_e1: p.tiene_e1,
    tiene_e2: p.tiene_e2,
    tiene_e3: p.tiene_e3,
    encuestas: {
      e1: p.tiene_e1,
      e2: p.tiene_e2,
      e3: p.tiene_e3,
      total: p.num_encuestas,
      labels: [
        p.tiene_e1 ? "E1" : null,
        p.tiene_e2 ? "E2" : null,
        p.tiene_e3 ? "E3" : null,
      ].filter(Boolean),
    },
    ultima_fecha: p.ultima_fecha,
    ultima_fecha_display: formatFechaDDMMYYYY(p.ultima_fecha),
    fecha_e1: p.fecha_e1,
    fecha_e2: p.fecha_e2,
    fecha_e3: p.fecha_e3,
    num_objetivos: p.num_objetivos,
    resultado_ultima: {
      mejoro: p.conteos_ultima.mejoro,
      igual: p.conteos_ultima.igual,
      desmejoro: p.conteos_ultima.desmejoro,
      evaluados: p.conteos_ultima.total_evaluados,
      pct_mejoro: p.pct_mejora_ultima,
    },
    tendencia: p.tendencia,
    tendencia_label: p.tendencia_label,
  };
}

function serializeComparativa(
  p: NonNullable<Awaited<ReturnType<typeof loadComparativaPorDocumento>>>,
) {
  return {
    ...serializePacienteListado(p),
    profesional_cedula: p.profesional_cedula,
    tendencia_explicacion: p.tendencia_explicacion,
    timeline: p.timeline.map((t) => ({
      fase: t.fase,
      fecha: t.fecha,
      fecha_display: formatFechaDDMMYYYY(t.fecha),
      titulo: t.titulo,
      subtitulo: t.subtitulo,
      conteos: t.conteos
        ? {
            mejoro: t.conteos.mejoro,
            igual: t.conteos.igual,
            desmejoro: t.conteos.desmejoro,
          }
        : null,
      objetivos_definidos:
        t.fase === 1 ? p.num_objetivos : undefined,
    })),
    resumen_ultima: {
      pct_mejoro: p.pct_mejora_ultima,
      conteos: p.conteos_ultima,
      labels: ESTADO_LABEL,
    },
    cambio_desde_e2: p.cambio_desde_e2,
    objetivos: p.objetivos.map((o) => ({
      orden: o.orden,
      objetivo_e1: o.objetivo_e1,
      sintoma_codigo: o.sintoma_codigo,
      sintoma_label: o.sintoma_label,
      estado_e2: o.estado_e2,
      estado_e2_label: o.estado_e2
        ? ESTADO_LABEL_CORTO[o.estado_e2]
        : null,
      estado_e3: o.estado_e3,
      estado_e3_label: o.estado_e3
        ? ESTADO_LABEL_CORTO[o.estado_e3]
        : null,
      observacion_e2: o.observacion_e2,
      observacion_e3: o.observacion_e3,
      ultima_observacion: o.ultima_observacion,
    })),
  };
}

export async function handleAnalisisLogros(
  pathname: string,
  method: string,
  _body: unknown,
  origin: string | null,
  query: Record<string, string | undefined> | null,
): Promise<HandlerResponse | null> {
  const path = pathname.replace(/\/$/, "") || pathname;
  if (!path.startsWith("/encuestas/analisis-logros")) return null;

  try {
    if (path === "/encuestas/analisis-logros" && method === "GET") {
      const filtros = parseFiltros(query);
      const data = await loadListadoAnalisis(filtros);
      return jsonResponse(
        200,
        {
          ok: true,
          kpis: data.kpis,
          total: data.total,
          page: data.page,
          page_size: data.page_size,
          pacientes: data.pacientes.map(serializePacienteListado),
          mapping_note:
            "mejora_parcial → Mejoró; sin_cambio_clinico_relevante → Igual; desmejoria → Desmejoró.",
          plan_note:
            "No hay columna «plan» en BD; el filtro Plan no aplica datos reales aún.",
        },
        origin,
        { "Cache-Control": "no-store" },
      );
    }

    const compMatch = path.match(
      /^\/encuestas\/analisis-logros\/paciente\/([^/]+)$/,
    );
    if (compMatch && method === "GET") {
      const documento = decodeURIComponent(compMatch[1] || "").trim();
      if (!documento) {
        return jsonResponse(400, errBody("Falta documento."), origin);
      }
      const scope = query?.scope_sede?.trim() || null;
      const p = await loadComparativaPorDocumento(documento, scope);
      if (!p) {
        return jsonResponse(
          404,
          errBody("No se encontró el paciente con encuestas de logros."),
          origin,
        );
      }
      if (scope && p.sede && p.sede !== scope) {
        return jsonResponse(
          403,
          errBody("No tiene acceso a pacientes de otra sede."),
          origin,
        );
      }
      return jsonResponse(
        200,
        { ok: true, paciente: serializeComparativa(p) },
        origin,
        { "Cache-Control": "no-store" },
      );
    }

    if (path === "/encuestas/analisis-logros/excel" && method === "GET") {
      const filtros = parseFiltros(query);
      filtros.cap = Math.min(filtros.cap ?? 1500, 2000);
      const pacientes = await loadPacientesAnalisisFull(filtros);
      const buf = await buildAnalisisWorkbook(pacientes, {
        filtrosTexto: filtrosTextoResumen(filtros),
      });
      const stamp = new Date().toISOString().slice(0, 10);
      return binaryResponse(
        200,
        Buffer.from(buf),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        `analisis_logros_${stamp}.xlsx`,
        origin,
      );
    }

    const excelPacMatch = path.match(
      /^\/encuestas\/analisis-logros\/paciente\/([^/]+)\/excel$/,
    );
    if (excelPacMatch && method === "GET") {
      const documento = decodeURIComponent(excelPacMatch[1] || "").trim();
      const scope = query?.scope_sede?.trim() || null;
      const p = await loadComparativaPorDocumento(documento, scope);
      if (!p) {
        return jsonResponse(
          404,
          errBody("No se encontró el paciente."),
          origin,
        );
      }
      if (scope && p.sede && p.sede !== scope) {
        return jsonResponse(
          403,
          errBody("No tiene acceso a pacientes de otra sede."),
          origin,
        );
      }
      const buf = await buildAnalisisWorkbook([p], {
        filtrosTexto: `Paciente: ${p.nombre_completo} · Doc: ${formatDocumentoDisplay(p.documento)}`,
      });
      const safeDoc = String(p.documento).replace(/[^\w.-]+/g, "_");
      return binaryResponse(
        200,
        Buffer.from(buf),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        `analisis_logros_${safeDoc}.xlsx`,
        origin,
      );
    }

    return null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[analisis-logros]", msg);
    return jsonResponse(
      400,
      errBody({ where: "analisis-logros", error: msg }),
      origin,
    );
  }
}
