import type { HandlerResponse } from "@netlify/functions";
import { getSupabase } from "../_lib/supabase";
import { jsonResponse } from "../_lib/http";
import { incrementarEncuestasRealizadas } from "../_lib/incrementarEncuestaAutorizado";

function errBody(detail: string | Record<string, unknown>) {
  return { detail };
}

const SEDES_PERMITIDAS = new Set(["Poblado", "Laureles", "Barranquilla"]);

function isValidEmail(correo: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

export async function handleAutorizados(
  pathname: string,
  method: string,
  body: unknown,
  origin: string | null,
): Promise<HandlerResponse | null> {
  const path = pathname.replace(/\/$/, "") || pathname;

  if (path === "/autorizados/incrementar-encuesta" && method === "POST") {
    const data = body as { cedula?: string | number; incremento?: number } | null;
    const cedula = data?.cedula;
    const incremento = data?.incremento ?? 1;
    if (cedula === undefined || cedula === null || cedula === "") {
      return jsonResponse(422, errBody("cedula requerida"), origin);
    }

    const supabase = getSupabase();
    const r = await incrementarEncuestasRealizadas(
      supabase,
      cedula,
      incremento,
    );

    if (!r.ok) {
      const notFound = r.error.startsWith("No existe autorizado");
      return jsonResponse(
        notFound ? 404 : 400,
        errBody(
          notFound
            ? r.error
            : { where: "incrementar encuestas", error: r.error },
        ),
        origin,
      );
    }

    return jsonResponse(
      200,
      {
        ok: true,
        cedula,
        antes: r.antes,
        despues: r.despues,
        data: r.data,
      },
      origin,
    );
  }

  if (path === "/autorizados/actualizar-perfil" && method === "POST") {
    const data = body as {
      pin?: string;
      sede?: string;
      correo?: string;
    } | null;
    const pin = String(data?.pin ?? "").trim();
    const sede = String(data?.sede ?? "").trim();
    let correo = String(data?.correo ?? "").trim().toLowerCase();

    if (!pin) {
      return jsonResponse(400, errBody("PIN requerido"), origin);
    }
    if (!SEDES_PERMITIDAS.has(sede)) {
      return jsonResponse(400, errBody("Sede no permitida"), origin);
    }
    if (!correo || !isValidEmail(correo)) {
      return jsonResponse(400, errBody("Correo inválido"), origin);
    }

    const supabase = getSupabase();
    const upd = await supabase
      .from("autorizados")
      .update({ sede, correo })
      .eq("pin", pin)
      .select("cedula,nombres,apellidos,sede,correo,encuestas_realizadas");

    if (upd.error) {
      return jsonResponse(
        400,
        errBody({ where: "SUPABASE UPDATE PERFIL", error: upd.error.message }),
        origin,
      );
    }
    if (!upd.data?.length) {
      return jsonResponse(404, errBody("PIN no encontrado."), origin);
    }

    return jsonResponse(
      200,
      { ok: true, data: upd.data[0] },
      origin,
    );
  }

  const pinMatch = path.match(/^\/autorizados\/pin\/([^/]+)$/);
  if (pinMatch && method === "GET") {
    const pin = decodeURIComponent(pinMatch[1] || "");
    const supabase = getSupabase();
    const t0 = Date.now();

    const res = await supabase
      .from("autorizados")
      .select("cedula,nombres,apellidos,sede,correo,encuestas_realizadas")
      .eq("pin", pin)
      .limit(1)
      .maybeSingle();

    console.log(
      `[autorizados] /pin supabase ${Date.now() - t0} ms`,
    );

    if (res.error) {
      return jsonResponse(
        400,
        errBody({ where: "SUPABASE SELECT", error: res.error.message }),
        origin,
      );
    }
    if (!res.data) {
      return jsonResponse(404, errBody("PIN no encontrado."), origin);
    }

    return jsonResponse(200, { ok: true, data: res.data }, origin);
  }

  return null;
}
