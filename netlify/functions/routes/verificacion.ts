import type { HandlerResponse } from "@netlify/functions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "../_lib/supabase";
import { generarPin2Letras3Numeros } from "../_lib/pin";
import { enviarPinPorCorreo } from "../_lib/email";
import { jsonResponse } from "../_lib/http";

function onlyDigits(s: string): string {
  return (s || "").replace(/\D+/g, "").trim();
}

function cleanStr(s: string | undefined | null): string {
  return (s || "").trim();
}

function isValidEmail(correo: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

class HttpErr extends Error {
  constructor(
    public status: number,
    public detail: unknown,
  ) {
    super(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
}

function toIntOr400(value: string, fieldName = "Cédula"): number {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) {
    throw new HttpErr(400, `${fieldName} inválida`);
  }
  return n;
}

function errBody(detail: unknown) {
  return { detail };
}

/** Comparación tolerante de instantes ISO (timestamptz vs string en JSON). */
function sameInstantIso(a: unknown, b: unknown): boolean {
  const sa = a != null ? String(a).trim() : "";
  const sb = b != null ? String(b).trim() : "";
  if (!sa || !sb) return false;
  if (sa === sb) return true;
  const ta = Date.parse(sa);
  const tb = Date.parse(sb);
  return Number.isFinite(ta) && Number.isFinite(tb) && ta === tb;
}

/**
 * Mensaje legible cuando Supabase/Postgres rechaza el DELETE (FK, permisos, etc.).
 */
function explainSupabaseDeleteError(err: {
  message?: string;
  code?: string;
  details?: string;
} | null): string {
  const msg = (err?.message ?? "").trim();
  const code = (err?.code ?? "").trim();
  const low = msg.toLowerCase();
  if (
    code === "23503" ||
    low.includes("foreign key") ||
    low.includes("violates foreign key")
  ) {
    return (
      "No se puede eliminar este registro porque otra tabla de la base de datos " +
      "sigue referenciándolo (por ejemplo un seguimiento Logros 2 o un vínculo antiguo). " +
      "Elimine primero los registros asociados o contacte soporte. " +
      (msg ? `Detalle técnico: ${msg}` : "")
    );
  }
  if (
    code === "42501" ||
    low.includes("permission denied") ||
    low.includes("row-level security") ||
    low.includes("rls")
  ) {
    return (
      "No tiene permisos para borrar este registro en la base de datos. " +
      (msg ? `Detalle: ${msg}` : "")
    );
  }
  return msg || "Error desconocido al eliminar en la base de datos.";
}

/**
 * True si hay Logros 2 (tabla moderna o legada) enlazado a esta fila de Logros 1
 * por documento + fecha de creación de la fase 1.
 */
async function logros1TieneSeguimiento2Dependiente(
  supabase: SupabaseClient,
  documentoPacienteInt: number,
  documentoPacienteStr: string,
  fase1CreatedAt: unknown,
): Promise<boolean> {
  const f1At = fase1CreatedAt != null ? String(fase1CreatedAt).trim() : "";
  if (!f1At) return false;

  const fetchL2 = async (docVal: number | string) =>
    supabase
      .from("wakeup_seguimiento2")
      .select("id, deleted_at, payload_origen")
      .eq("documento", docVal);

  let l2 = await fetchL2(documentoPacienteInt);
  if (l2.error || !l2.data?.length) {
    const l2s = await fetchL2(documentoPacienteStr);
    if (!l2s.error && l2s.data?.length) {
      l2 = l2s;
    }
  }

  if (!l2.error && Array.isArray(l2.data)) {
    for (const row of l2.data as Record<string, unknown>[]) {
      if (row.deleted_at != null && String(row.deleted_at).trim() !== "") {
        continue;
      }
      const po = row.payload_origen as Record<string, unknown> | null | undefined;
      const ref = (po?.fase1_referencia as Record<string, unknown>) || {};
      const refDocDigits = onlyDigits(String(ref.documento ?? ""));
      if (
        refDocDigits &&
        refDocDigits !== onlyDigits(String(documentoPacienteStr))
      ) {
        continue;
      }
      if (sameInstantIso(ref.created_at, f1At)) {
        return true;
      }
    }
  }

  const optCols = await supabase
    .from("wakeup_seguimiento2")
    .select("id")
    .eq("fase1_documento", documentoPacienteInt)
    .eq("fase1_created_at", f1At)
    .limit(1);
  if (!optCols.error && Array.isArray(optCols.data) && optCols.data.length > 0) {
    return true;
  }

  const legInt = await supabase
    .from("wakeup_seguimientos_logros2")
    .select("id_int")
    .eq("fase1_documento", documentoPacienteInt)
    .eq("fase1_created_at", f1At)
    .limit(1);

  if (!legInt.error && Array.isArray(legInt.data) && legInt.data.length > 0) {
    return true;
  }

  const legStr = await supabase
    .from("wakeup_seguimientos_logros2")
    .select("id_int")
    .eq("fase1_documento", documentoPacienteStr)
    .eq("fase1_created_at", f1At)
    .limit(1);

  return !legStr.error && Array.isArray(legStr.data) && legStr.data.length > 0;
}

function safeArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is Record<string, unknown> => !!v && typeof v === "object");
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return [];
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is Record<string, unknown> => !!v && typeof v === "object");
      }
    } catch {
      return [];
    }
  }
  return [];
}

function dedupeRowsBy<T extends Record<string, unknown>>(
  rows: T[],
  keyOf: (row: T) => string,
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const k = keyOf(r);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

/** Para confirmar en UI que el envío va al correo correcto sin exponer el email completo. */
export function maskCorreoParaUi(correo: string): string {
  const c = (correo || "").trim().toLowerCase();
  const at = c.indexOf("@");
  if (at < 1) return "(sin correo)";
  const local = c.slice(0, at);
  const domain = c.slice(at + 1);
  if (!domain) return "(sin correo)";
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}***@${domain}`;
}

/**
 * La columna `cedula` en algunas instalaciones es bigint y en otras texto.
 * Si solo probamos un tipo, el SELECT devolvía 0 filas → “cédula no autorizada” o envío al vacío.
 */
async function selectAutorizadoByCedula(
  supabase: SupabaseClient,
  cedulaDigits: string,
  columns: string,
) {
  const n = parseInt(cedulaDigits, 10);
  const run = (val: number | string) =>
    supabase.from("autorizados").select(columns).eq("cedula", val).limit(1);

  let r = await run(n);
  if (r.error) return r;
  if (r.data?.length) return r;
  return run(cedulaDigits);
}

export async function handleVerificacion(
  pathname: string,
  method: string,
  body: unknown,
  origin: string | null,
  query: Record<string, string | undefined> | null = null,
): Promise<HandlerResponse | null> {
  const path = pathname.replace(/\/$/, "") || pathname;

  try {
    if (path === "/verificacion/pin-test" && method === "GET") {
      return jsonResponse(
        200,
        { pin: generarPin2Letras3Numeros() },
        origin,
      );
    }

    if (path === "/verificacion/registro-inicial" && method === "POST") {
      const data = body as Record<string, unknown> | null;
      if (!data || typeof data !== "object") {
        return jsonResponse(400, errBody("Cuerpo inválido"), origin);
      }

      const cedulaStr = onlyDigits(String(data.cedula ?? ""));
      const celular = onlyDigits(String(data.celular ?? ""));
      let correo = cleanStr(String(data.correo ?? "")).toLowerCase();
      const sede = cleanStr(String(data.sede ?? ""));
      const nombres = cleanStr(String(data.nombres ?? ""));
      const apellidos = cleanStr(String(data.apellidos ?? ""));

      if (!cedulaStr) {
        return jsonResponse(400, errBody("Cédula inválida"), origin);
      }
      if (!sede) {
        return jsonResponse(400, errBody("Sede obligatoria"), origin);
      }
      if (!isValidEmail(correo)) {
        return jsonResponse(
          422,
          errBody([
            {
              type: "value_error",
              loc: ["body", "correo"],
              msg: "value is not a valid email address",
            },
          ]),
          origin,
        );
      }

      const cedula = toIntOr400(cedulaStr);
      const supabase = getSupabase();

      const existente = await selectAutorizadoByCedula(
        supabase,
        cedulaStr,
        "cedula, correo, pin",
      );

      if (existente.error) {
        return jsonResponse(
          400,
          errBody({
            where: "SUPABASE SELECT EXISTENTE",
            error: existente.error.message,
          }),
          origin,
        );
      }
      if (existente.data?.[0]) {
        return jsonResponse(
          409,
          errBody(
            "El usuario que intentas registrar ya está en nuestro sistema.",
          ),
          origin,
        );
      }

      const pin = generarPin2Letras3Numeros();

      const resp = await supabase
        .from("autorizados")
        .insert({
          cedula,
          pin,
          nombres,
          apellidos,
          correo,
          celular,
          sede,
        })
        .select();

      if (resp.error) {
        return jsonResponse(
          400,
          errBody({ where: "SUPABASE INSERT", error: resp.error.message }),
          origin,
        );
      }
      if (!resp.data?.length) {
        return jsonResponse(
          500,
          errBody("No se pudo guardar en autorizados"),
          origin,
        );
      }

      // El usuario ya quedó persistido: si SMTP falla, no devolvemos 500 (confunde
      // con "no guardó"). El cliente puede usar /reenviar-pin cuando SMTP esté OK.
      const mail = await enviarPinPorCorreo(correo, pin);
      if (!mail.ok) {
        console.error(
          "[verificacion/registro-inicial] insert OK pero correo falló:",
          mail.error,
          "envioRazon:",
          mail.razon,
        );
        return jsonResponse(
          200,
          {
            ok: true,
            correoEnviado: false,
            correoDestinoMascarado: maskCorreoParaUi(correo),
            envioRazon: mail.razon,
            message:
              "Usuario registrado. No se pudo enviar el correo ahora; usa «Solicitar Nuevo Código» en unos minutos o revisa la configuración SMTP en el servidor.",
          },
          origin,
        );
      }

      return jsonResponse(
        200,
        {
          ok: true,
          correoEnviado: true,
          correoDestinoMascarado: maskCorreoParaUi(correo),
          message: "Usuario registrado correctamente. PIN enviado al correo.",
        },
        origin,
      );
    }

    if (path === "/verificacion/cedula" && method === "POST") {
      console.log("[verificacion/cedula] handler entrada", {
        path,
        method,
        bodyType:
          body === null ? "null" : Array.isArray(body) ? "array" : typeof body,
      });

      const data = body as { cedula?: string } | null;
      const cedulaStr = onlyDigits(String(data?.cedula ?? ""));
      console.log("[verificacion/cedula] validación dígitos", {
        cedulaStr: cedulaStr || "(vacío)",
        okLength: cedulaStr.length > 0,
      });

      if (!cedulaStr) {
        console.log("[verificacion/cedula] respuesta 400: cédula vacía tras limpiar");
        return jsonResponse(400, errBody("Cédula inválida"), origin);
      }

      toIntOr400(cedulaStr);
      console.log("[verificacion/cedula] cédula (dígitos)", { cedulaStr });

      let supabase;
      try {
        supabase = getSupabase();
      } catch (e) {
        console.error("[verificacion/cedula] fallo al crear cliente Supabase:", e);
        throw e;
      }

      const resp = await selectAutorizadoByCedula(
        supabase,
        cedulaStr,
        "cedula, nombres, correo",
      );

      if (resp.error) {
        console.error("[verificacion/cedula] error Supabase SELECT:", {
          message: resp.error.message,
          code: resp.error.code,
          details: resp.error.details,
          hint: resp.error.hint,
        });
        return jsonResponse(
          400,
          errBody({ where: "SUPABASE SELECT", error: resp.error.message }),
          origin,
        );
      }

      const row = resp.data?.[0] ?? null;
      const correoRow = row
        ? cleanStr(String((row as { correo?: string }).correo ?? "")).toLowerCase()
        : "";
      const out: Record<string, unknown> = {
        ok: !!row,
        exists: !!row,
        message: row ? "Cédula encontrada" : "Cédula no encontrada",
      };
      if (row && correoRow) {
        out.correoRegistradoMascarado = maskCorreoParaUi(correoRow);
      }
      console.log("[verificacion/cedula] respuesta 200", out);
      return jsonResponse(200, out, origin);
    }

    if (path === "/verificacion/pin" && method === "POST") {
      const data = body as { cedula?: string; pin?: string } | null;
      const cedulaStr = onlyDigits(String(data?.cedula ?? ""));
      const pin = cleanStr(String(data?.pin ?? ""));

      if (!cedulaStr) {
        return jsonResponse(400, errBody("Cédula inválida"), origin);
      }
      if (!pin) {
        return jsonResponse(400, errBody("PIN vacío"), origin);
      }

      toIntOr400(cedulaStr);
      const supabase = getSupabase();

      const resp = await selectAutorizadoByCedula(
        supabase,
        cedulaStr,
        "pin, nombres, sede",
      );

      if (resp.error) {
        return jsonResponse(
          400,
          errBody({ where: "SUPABASE SELECT", error: resp.error.message }),
          origin,
        );
      }

      const rowPin = resp.data?.[0];
      if (!rowPin) {
        return jsonResponse(200, { ok: false }, origin);
      }

      const pinDb = cleanStr(String(rowPin.pin ?? ""));
      if (pinDb !== pin) {
        return jsonResponse(200, { ok: false }, origin);
      }

      return jsonResponse(
        200,
        {
          ok: true,
          usuario: rowPin.nombres,
          sede: rowPin.sede,
        },
        origin,
      );
    }

    if (path === "/verificacion/reenviar-pin" && method === "POST") {
      const data = body as { cedula?: string } | null;
      const cedulaStr = onlyDigits(String(data?.cedula ?? ""));
      if (!cedulaStr) {
        return jsonResponse(400, errBody("Cédula inválida"), origin);
      }
      toIntOr400(cedulaStr);
      const supabase = getSupabase();

      const resp = await selectAutorizadoByCedula(
        supabase,
        cedulaStr,
        "correo, pin",
      );

      if (resp.error) {
        return jsonResponse(
          400,
          errBody({ where: "SUPABASE SELECT", error: resp.error.message }),
          origin,
        );
      }

      const rowReenvio = resp.data?.[0];
      if (!rowReenvio) {
        return jsonResponse(404, errBody("Cédula no encontrada"), origin);
      }

      const correo = cleanStr(String(rowReenvio.correo ?? "")).toLowerCase();
      const pin = cleanStr(String(rowReenvio.pin ?? ""));
      const correoMascarado = maskCorreoParaUi(correo);

      if (!correo) {
        return jsonResponse(400, errBody("No hay correo registrado"), origin);
      }
      if (!pin) {
        return jsonResponse(
          400,
          errBody("No hay PIN registrado para reenviar"),
          origin,
        );
      }

      console.log(
        "[verificacion/reenviar-pin] envío a correo asociado en BD:",
        correoMascarado,
        "cedulaDigits:",
        cedulaStr,
      );

      const mail = await enviarPinPorCorreo(correo, pin);
      if (!mail.ok) {
        console.error(
          "[verificacion/reenviar-pin] correo falló:",
          mail.error,
          "envioRazon:",
          mail.razon,
        );
        return jsonResponse(
          200,
          {
            ok: true,
            correoEnviado: false,
            correoDestinoMascarado: correoMascarado,
            envioRazon: mail.razon,
            message:
              "No se pudo enviar el correo en este momento. Revisa SMTP en el servidor o intenta más tarde.",
          },
          origin,
        );
      }

      console.log("[verificacion/reenviar-pin] enviarPinPorCorreo OK →", correoMascarado);

      return jsonResponse(
        200,
        {
          ok: true,
          correoEnviado: true,
          correoDestinoMascarado: correoMascarado,
          message: "PIN reenviado correctamente",
        },
        origin,
      );
    }

    if (path === "/verificacion/registros/eliminar" && method === "POST") {
      const payload = body as {
        documento?: string;
        delete_spec?: Record<string, unknown>;
      } | null;
      const docExpected = onlyDigits(String(payload?.documento ?? ""));
      if (!docExpected) {
        return jsonResponse(400, errBody("Documento requerido"), origin);
      }
      const spec = payload?.delete_spec;
      if (!spec || typeof spec !== "object") {
        return jsonResponse(400, errBody("delete_spec inválido"), origin);
      }

      const kind = String(spec.kind ?? "");
      const supabase = getSupabase();

      if (kind === "logros1") {
        const idInt = Number(spec.id_int);
        if (!Number.isFinite(idInt) || idInt <= 0) {
          return jsonResponse(400, errBody("id_int inválido"), origin);
        }
        const sel = await supabase
          .from("wakeup_seguimientos")
          .select("id_int, documento, created_at")
          .eq("id_int", idInt)
          .maybeSingle();
        if (sel.error) {
          return jsonResponse(
            400,
            errBody({ where: "SELECT logros1", error: sel.error.message }),
            origin,
          );
        }
        if (!sel.data) {
          return jsonResponse(404, errBody("Registro no encontrado"), origin);
        }
        const docRow = onlyDigits(String(sel.data.documento ?? ""));
        if (docRow !== docExpected) {
          return jsonResponse(
            403,
            errBody("El registro no corresponde al documento indicado."),
            origin,
          );
        }

        const docInt = parseInt(docExpected, 10);
        const bloqueado =
          Number.isFinite(docInt) &&
          docInt > 0 &&
          (await logros1TieneSeguimiento2Dependiente(
            supabase,
            docInt,
            docExpected,
            sel.data.created_at,
          ));
        if (bloqueado) {
          return jsonResponse(
            409,
            errBody(
              "No se puede eliminar esta encuesta de Logros 1 porque existe al menos un " +
                "seguimiento Logros 2 (o una encuesta en el formato antiguo) asociado a la misma " +
                "evaluación de fase 1. En el listado, elimine primero el registro de Logros 2 " +
                "que corresponda a esa fecha; si no lo ve, contacte soporte.",
            ),
            origin,
          );
        }

        const del = await supabase
          .from("wakeup_seguimientos")
          .delete()
          .eq("id_int", idInt);
        if (del.error) {
          return jsonResponse(
            400,
            errBody(explainSupabaseDeleteError(del.error)),
            origin,
          );
        }
        return jsonResponse(200, { ok: true, eliminado: true }, origin);
      }

      if (kind === "logros2") {
        const source = String(spec.source ?? "");
        if (source === "modern") {
          const id = Number(spec.id);
          if (!Number.isFinite(id) || id <= 0) {
            return jsonResponse(400, errBody("id inválido"), origin);
          }
          const sel = await supabase
            .from("wakeup_seguimiento2")
            .select("id, documento")
            .eq("id", id)
            .maybeSingle();
          if (sel.error) {
            return jsonResponse(
              400,
              errBody({ where: "SELECT logros2", error: sel.error.message }),
              origin,
            );
          }
          if (!sel.data) {
            return jsonResponse(404, errBody("Registro no encontrado"), origin);
          }
          const docRow = onlyDigits(String(sel.data.documento ?? ""));
          if (docRow !== docExpected) {
            return jsonResponse(
              403,
              errBody("El registro no corresponde al documento indicado."),
              origin,
            );
          }
          await supabase
            .from("wakeup_seguimiento2_items")
            .delete()
            .eq("seguimiento2_id", id);
          const del = await supabase
            .from("wakeup_seguimiento2")
            .delete()
            .eq("id", id);
          if (del.error) {
            return jsonResponse(
              400,
              errBody(explainSupabaseDeleteError(del.error)),
              origin,
            );
          }
          return jsonResponse(200, { ok: true, eliminado: true }, origin);
        }

        if (source === "legacy") {
          const idInt = Number(spec.id_int);
          if (!Number.isFinite(idInt) || idInt <= 0) {
            return jsonResponse(400, errBody("id_int inválido"), origin);
          }
          const sel = await supabase
            .from("wakeup_seguimientos_logros2")
            .select("id_int, documento")
            .eq("id_int", idInt)
            .maybeSingle();
          if (sel.error) {
            return jsonResponse(
              400,
              errBody({ where: "SELECT logros2 legacy", error: sel.error.message }),
              origin,
            );
          }
          if (!sel.data) {
            return jsonResponse(404, errBody("Registro no encontrado"), origin);
          }
          const docRow = onlyDigits(String(sel.data.documento ?? ""));
          if (docRow !== docExpected) {
            return jsonResponse(
              403,
              errBody("El registro no corresponde al documento indicado."),
              origin,
            );
          }
          const del = await supabase
            .from("wakeup_seguimientos_logros2")
            .delete()
            .eq("id_int", idInt);
          if (del.error) {
            return jsonResponse(
              400,
              errBody(explainSupabaseDeleteError(del.error)),
              origin,
            );
          }
          return jsonResponse(200, { ok: true, eliminado: true }, origin);
        }

        return jsonResponse(400, errBody("source logros2 inválido"), origin);
      }

      return jsonResponse(400, errBody("kind inválido"), origin);
    }

    const registrosMatch = path.match(/^\/verificacion\/registros\/(.+)$/);
    if (registrosMatch && method === "GET") {
      const rawCed = decodeURIComponent(registrosMatch[1] || "");
      const cedulaStr = onlyDigits(rawCed);
      if (!cedulaStr) {
        return jsonResponse(400, errBody("Documento inválido"), origin);
      }

      const cedulaInt = toIntOr400(cedulaStr, "Documento");
      const supabase = getSupabase();

      // Logros 1 (wakeup_seguimientos)
      let l1Rows: Record<string, unknown>[] = [];
      const l1TryString = await supabase
        .from("wakeup_seguimientos")
        .select(
          `
            created_at,
            nombres,
            apellidos,
            tipo_documento,
            documento,
            patologia_relacionada,
            limitacion_moverse,
            actividades_afectadas,
            sintoma_1,
            sintoma_2,
            sintoma_3,
            otro_sintoma,
            objetivo_1,
            objetivo_2,
            objetivo_3,
            objetivos_seleccionados,
            objetivo_extra,
            adicional_no_puede,
            ultima_vez,
            que_impide,
            id_int,
            id_registro,
            referencia_registro,
            sede,
            encuestador
          `,
        )
        .eq("documento", cedulaStr)
        .order("created_at", { ascending: true });

      if (l1TryString.error) {
        const l1TryInt = await supabase
          .from("wakeup_seguimientos")
          .select(
            `
              created_at,
              nombres,
              apellidos,
              tipo_documento,
              documento,
              patologia_relacionada,
              limitacion_moverse,
              actividades_afectadas,
              sintoma_1,
              sintoma_2,
              sintoma_3,
              otro_sintoma,
              objetivo_1,
              objetivo_2,
              objetivo_3,
              objetivos_seleccionados,
              objetivo_extra,
              adicional_no_puede,
              ultima_vez,
              que_impide,
              id_int,
              id_registro,
              referencia_registro,
              sede,
              encuestador
            `,
          )
          .eq("documento", cedulaInt)
          .order("created_at", { ascending: true });
        if (l1TryInt.error) {
          return jsonResponse(
            400,
            errBody({
              where: "SUPABASE SELECT REGISTROS LOGROS1",
              error: l1TryInt.error.message,
            }),
            origin,
          );
        }
        l1Rows = (l1TryInt.data || []) as Record<string, unknown>[];
      } else {
        l1Rows = (l1TryString.data || []) as Record<string, unknown>[];
      }

      // Enriquecer Logros 1 con nombre del profesional (autorizados)
      // para mostrar "cedula - nombres apellidos" en frontend y PDF.
      const cedulasEncuestador = Array.from(
        new Set(
          l1Rows
            .map((r) => String(r?.encuestador ?? "").trim())
            .filter((v) => v.length > 0),
        ),
      );

      if (cedulasEncuestador.length > 0) {
        const authResp = await supabase
          .from("autorizados")
          .select("cedula, nombres, apellidos")
          .in("cedula", cedulasEncuestador);

        if (!authResp.error && Array.isArray(authResp.data)) {
          const authByCedula = new Map<string, string>();
          for (const a of authResp.data as Record<string, unknown>[]) {
            const ced = String(a?.cedula ?? "").trim();
            if (!ced) continue;
            const nombreCompleto =
              `${String(a?.nombres ?? "").trim()} ${String(a?.apellidos ?? "").trim()}`.trim();
            if (nombreCompleto) {
              authByCedula.set(ced, nombreCompleto);
            }
          }

          l1Rows = l1Rows.map((r) => {
            const ced = String(r?.encuestador ?? "").trim();
            const encuestadorNombre = authByCedula.get(ced) || "";
            return { ...r, encuestador_nombre: encuestadorNombre };
          });
        } else {
          // fallback: no romper flujo si falla el cruce
          l1Rows = l1Rows.map((r) => ({ ...r, encuestador_nombre: "" }));
        }
      } else {
        l1Rows = l1Rows.map((r) => ({ ...r, encuestador_nombre: "" }));
      }

      // Logros 2 actual (wakeup_seguimiento2) con búsqueda robusta
      let l2Rows: Record<string, unknown>[] = [];
      const l2Select = `
        id,
        codigo_seguimiento,
        created_at,
        sede,
        estado,
        origen,
        documento,
        nombres,
        apellidos,
        encuestador,
        encuestador_nombre,
        limitacion_moverse_label,
        actividades_afectadas_label,
        adicional_no_puede_label,
        ultima_vez_label,
        que_impide_label,
        meta_complementaria_previa,
        payload_origen,
        payload_respuesta
      `;

      const l2ModernInt = await supabase
        .from("wakeup_seguimiento2")
        .select(l2Select)
        .eq("documento", cedulaInt)
        .order("created_at", { ascending: true });

      if (!l2ModernInt.error && l2ModernInt.data) {
        l2Rows.push(...((l2ModernInt.data || []) as Record<string, unknown>[]));
      } else if (l2ModernInt.error && l2ModernInt.error.code !== "42P01") {
        return jsonResponse(
          400,
          errBody({
            where: "SUPABASE SELECT REGISTROS LOGROS2 documento(int)",
            error: l2ModernInt.error.message,
          }),
          origin,
        );
      }

      const l2ModernStr = await supabase
        .from("wakeup_seguimiento2")
        .select(l2Select)
        .eq("documento", cedulaStr)
        .order("created_at", { ascending: true });

      if (!l2ModernStr.error && l2ModernStr.data) {
        l2Rows.push(...((l2ModernStr.data || []) as Record<string, unknown>[]));
      }

      // fallback: referencia a fase1 dentro de payload_origen
      const l2ModernByPayload = await supabase
        .from("wakeup_seguimiento2")
        .select(l2Select)
        .contains("payload_origen", { fase1_referencia: { documento: cedulaInt } })
        .order("created_at", { ascending: true });
      if (!l2ModernByPayload.error && l2ModernByPayload.data) {
        l2Rows.push(...((l2ModernByPayload.data || []) as Record<string, unknown>[]));
      }

      l2Rows = dedupeRowsBy(l2Rows, (row) =>
        String(row.id ?? row.codigo_seguimiento ?? row.created_at ?? ""),
      );

      // Logros 2 legado (wakeup_seguimientos_logros2)
      const l2LegacyInt = await supabase
        .from("wakeup_seguimientos_logros2")
        .select(
          `
            id_int,
            created_at,
            sede,
            documento,
            fase1_documento,
            fase1_created_at,
            respuestas
          `,
        )
        .eq("documento", cedulaInt)
        .order("created_at", { ascending: true });

      let l2LegacyRows: Record<string, unknown>[] = [];
      if (!l2LegacyInt.error && l2LegacyInt.data) {
        l2LegacyRows.push(...((l2LegacyInt.data || []) as Record<string, unknown>[]));
      } else if (l2LegacyInt.error && l2LegacyInt.error.code !== "42P01") {
        return jsonResponse(
          400,
          errBody({
            where: "SUPABASE SELECT REGISTROS LOGROS2_LEGADO",
            error: l2LegacyInt.error.message,
          }),
          origin,
        );
      }

      const l2LegacyStr = await supabase
        .from("wakeup_seguimientos_logros2")
        .select(
          `
            id_int,
            created_at,
            sede,
            documento,
            fase1_documento,
            fase1_created_at,
            respuestas
          `,
        )
        .eq("documento", cedulaStr)
        .order("created_at", { ascending: true });
      if (!l2LegacyStr.error && l2LegacyStr.data) {
        l2LegacyRows.push(...((l2LegacyStr.data || []) as Record<string, unknown>[]));
      }

      const l2LegacyByFase1 = await supabase
        .from("wakeup_seguimientos_logros2")
        .select(
          `
            id_int,
            created_at,
            sede,
            documento,
            fase1_documento,
            fase1_created_at,
            respuestas
          `,
        )
        .eq("fase1_documento", cedulaInt)
        .order("created_at", { ascending: true });
      if (!l2LegacyByFase1.error && l2LegacyByFase1.data) {
        l2LegacyRows.push(...((l2LegacyByFase1.data || []) as Record<string, unknown>[]));
      }

      l2LegacyRows = dedupeRowsBy(l2LegacyRows, (row) =>
        String(row.id_int ?? row.created_at ?? row.documento ?? ""),
      );

      const merged: Record<string, unknown>[] = [];
      for (const row of l1Rows) {
        merged.push({
          tipo: "logros1",
          created_at: row.created_at,
          sede: row.sede ?? null,
          data: row,
        });
      }
      for (const row of l2Rows) {
        merged.push({
          tipo: "logros2",
          fuente: "wakeup_seguimiento2",
          created_at: row.created_at,
          sede: row.sede ?? null,
          data: {
            ...row,
            items: safeArray(row.payload_respuesta),
          },
        });
      }
      for (const row of l2LegacyRows) {
        merged.push({
          tipo: "logros2",
          fuente: "wakeup_seguimientos_logros2",
          created_at: row.created_at,
          sede: row.sede ?? null,
          data: {
            ...row,
            items: safeArray(row.respuestas),
          },
        });
      }

      merged.sort((a, b) => {
        const ta = String(a.created_at ?? "");
        const tb = String(b.created_at ?? "");
        return ta.localeCompare(tb);
      });

      let countL1 = 0;
      let countL2 = 0;
      const registros = merged.map((r, idx) => {
        let delete_spec: Record<string, unknown> | null = null;
        if (r.tipo === "logros1") {
          const dd = r.data as Record<string, unknown>;
          const idInt = dd?.id_int;
          if (idInt != null && Number.isFinite(Number(idInt))) {
            delete_spec = { kind: "logros1", id_int: Number(idInt) };
          }
          countL1 += 1;
          return {
            id: `L1-${idx + 1}`,
            numero: idx + 1,
            tipo: "logros1",
            tipo_label: "Logros 1",
            tipo_consecutivo: countL1,
            etiqueta: `${idx + 1}. Logros 1 (${countL1})`,
            created_at: r.created_at,
            sede: r.sede,
            data: r.data,
            delete_spec,
          };
        }
        const fuente = String(r.fuente ?? "");
        const dd = r.data as Record<string, unknown>;
        if (fuente === "wakeup_seguimientos_logros2") {
          const idInt = dd?.id_int;
          if (idInt != null && Number.isFinite(Number(idInt))) {
            delete_spec = {
              kind: "logros2",
              source: "legacy",
              id_int: Number(idInt),
            };
          }
        } else {
          const id = dd?.id;
          if (id != null && Number.isFinite(Number(id))) {
            delete_spec = {
              kind: "logros2",
              source: "modern",
              id: Number(id),
            };
          }
        }
        countL2 += 1;
        return {
          id: `L2-${idx + 1}`,
          numero: idx + 1,
          tipo: "logros2",
          tipo_label: "Logros 2",
          tipo_consecutivo: countL2,
          etiqueta: `${idx + 1}. Logros 2 (${countL2})`,
          created_at: r.created_at,
          sede: r.sede,
          fuente: r.fuente ?? null,
          data: r.data,
          delete_spec,
        };
      });

      return jsonResponse(
        200,
        {
          ok: true,
          documento: cedulaStr,
          total_registros: registros.length,
          conteo: {
            logros1: countL1,
            logros2: countL2,
          },
          resumen: registros.map((r) => r.etiqueta),
          registros,
        },
        origin,
      );
    }

    const logrosMatch = path.match(/^\/verificacion\/logros-fase1\/(.+)$/);
    if (logrosMatch && method === "GET") {
      const rawCed = decodeURIComponent(logrosMatch[1] || "");
      const cedulaStr = onlyDigits(rawCed);
      if (!cedulaStr) {
        return jsonResponse(400, errBody("Cédula inválida"), origin);
      }
      const cedulaInt = toIntOr400(cedulaStr);
      const supabase = getSupabase();
      const createdAtQ = (query?.created_at ?? query?.createdAt ?? "").trim();

      let qb = supabase.from("wakeup_seguimientos").select(
        `
                created_at,
                nombres,
                apellidos,
                tipo_documento,
                documento,
                patologia_relacionada,
                limitacion_moverse,
                actividades_afectadas,
                sintoma_1,
                sintoma_2,
                sintoma_3,
                otro_sintoma,
                objetivo_1,
                objetivo_2,
                objetivo_3,
                objetivos_seleccionados,
                objetivo_extra,
                adicional_no_puede,
                ultima_vez,
                que_impide,
                id_int,
                sede,
                encuestador
            `,
      );
      qb = qb.eq("documento", cedulaInt);
      if (createdAtQ) {
        qb = qb.eq("created_at", createdAtQ);
      } else {
        qb = qb.order("created_at", { ascending: false }).limit(1);
      }

      const resp = await qb.maybeSingle();

      if (resp.error) {
        return jsonResponse(
          400,
          errBody({
            where: "SUPABASE SELECT LOGROS FASE 1",
            error: resp.error.message,
          }),
          origin,
        );
      }

      const row = resp.data;
      if (!row) {
        return jsonResponse(
          404,
          errBody(
            createdAtQ
              ? "No se encontró una evaluación Logros Fase 1 con esta cédula y la fecha indicada. Verifique la selección en el listado."
              : "No se encontró encuesta de Logros Fase 1 para esta cédula",
          ),
          origin,
        );
      }

      const out = { ...row, encuestador_nombre: "" as string };
      const enc = row.encuestador;
      if (enc != null && enc !== "") {
        const encResp = await supabase
          .from("autorizados")
          .select("nombres, apellidos")
          .eq("cedula", enc)
          .limit(1)
          .maybeSingle();
        if (!encResp.error && encResp.data) {
          const e = encResp.data;
          out.encuestador_nombre =
            `${e.nombres ?? ""} ${e.apellidos ?? ""}`.trim();
        }
      }

      return jsonResponse(200, { ok: true, data: out }, origin);
    }
  } catch (e) {
    if (e instanceof HttpErr) {
      return jsonResponse(e.status, errBody(e.detail), origin);
    }
    throw e;
  }

  return null;
}
