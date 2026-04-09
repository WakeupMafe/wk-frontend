import type { HandlerResponse } from "@netlify/functions";
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

export async function handleVerificacion(
  pathname: string,
  method: string,
  body: unknown,
  origin: string | null,
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

      const existente = await supabase
        .from("autorizados")
        .select("cedula, correo, pin")
        .eq("cedula", cedula)
        .limit(1)
        .maybeSingle();

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
      if (existente.data) {
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

      const mail = await enviarPinPorCorreo(correo, pin);
      if (!mail.ok) {
        return jsonResponse(
          500,
          errBody(`No se pudo enviar el correo: ${mail.error}`),
          origin,
        );
      }

      return jsonResponse(
        200,
        {
          ok: true,
          message: "Usuario registrado correctamente. PIN enviado al correo.",
        },
        origin,
      );
    }

    if (path === "/verificacion/cedula" && method === "POST") {
      const data = body as { cedula?: string } | null;
      const cedulaStr = onlyDigits(String(data?.cedula ?? ""));
      if (!cedulaStr) {
        return jsonResponse(400, errBody("Cédula inválida"), origin);
      }
      const cedula = toIntOr400(cedulaStr);
      const supabase = getSupabase();

      const resp = await supabase
        .from("autorizados")
        .select("cedula, nombres, correo")
        .eq("cedula", cedula)
        .limit(1)
        .maybeSingle();

      if (resp.error) {
        return jsonResponse(
          400,
          errBody({ where: "SUPABASE SELECT", error: resp.error.message }),
          origin,
        );
      }

      const row = resp.data;
      return jsonResponse(
        200,
        {
          ok: !!row,
          exists: !!row,
          message: row
            ? "Cédula encontrada"
            : "Cédula no encontrada",
        },
        origin,
      );
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

      const cedula = toIntOr400(cedulaStr);
      const supabase = getSupabase();

      const resp = await supabase
        .from("autorizados")
        .select("pin, nombres, sede")
        .eq("cedula", cedula)
        .limit(1)
        .maybeSingle();

      if (resp.error) {
        return jsonResponse(
          400,
          errBody({ where: "SUPABASE SELECT", error: resp.error.message }),
          origin,
        );
      }

      if (!resp.data) {
        return jsonResponse(200, { ok: false }, origin);
      }

      const pinDb = cleanStr(String(resp.data.pin ?? ""));
      if (pinDb !== pin) {
        return jsonResponse(200, { ok: false }, origin);
      }

      return jsonResponse(
        200,
        {
          ok: true,
          usuario: resp.data.nombres,
          sede: resp.data.sede,
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
      const cedula = toIntOr400(cedulaStr);
      const supabase = getSupabase();

      const resp = await supabase
        .from("autorizados")
        .select("correo, pin")
        .eq("cedula", cedula)
        .limit(1)
        .maybeSingle();

      if (resp.error) {
        return jsonResponse(
          400,
          errBody({ where: "SUPABASE SELECT", error: resp.error.message }),
          origin,
        );
      }
      if (!resp.data) {
        return jsonResponse(404, errBody("Cédula no encontrada"), origin);
      }

      const correo = cleanStr(String(resp.data.correo ?? "")).toLowerCase();
      const pin = cleanStr(String(resp.data.pin ?? ""));

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

      const mail = await enviarPinPorCorreo(correo, pin);
      if (!mail.ok) {
        return jsonResponse(
          500,
          errBody(`No se pudo enviar el correo: ${mail.error}`),
          origin,
        );
      }

      return jsonResponse(
        200,
        { ok: true, message: "PIN reenviado correctamente" },
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

      const resp = await supabase
        .from("wakeup_seguimientos")
        .select(
          `
                created_at,
                nombres,
                apellidos,
                tipo_documento,
                documento,
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
        )
        .eq("documento", cedulaInt)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

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
            "No se encontró encuesta de Logros Fase 1 para esta cédula",
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
