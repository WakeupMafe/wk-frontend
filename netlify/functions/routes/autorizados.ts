import type { HandlerResponse } from "@netlify/functions";
import { getSupabase } from "../_lib/supabase";
import { jsonResponse } from "../_lib/http";

function errBody(detail: string | Record<string, unknown>) {
  return { detail };
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

    const q = await supabase
      .from("autorizados")
      .select("encuestas_realizadas")
      .eq("cedula", cedula)
      .limit(1)
      .maybeSingle();

    if (q.error) {
      return jsonResponse(
        400,
        errBody({ where: "SUPABASE SELECT", error: q.error.message }),
        origin,
      );
    }
    if (!q.data) {
      return jsonResponse(
        404,
        errBody(`No existe autorizado con cédula ${cedula}`),
        origin,
      );
    }

    const actual = q.data.encuestas_realizadas ?? 0;
    const nuevo = Number(actual) + (Number(incremento) || 1);

    const upd = await supabase
      .from("autorizados")
      .update({ encuestas_realizadas: nuevo })
      .eq("cedula", cedula)
      .select();

    if (upd.error) {
      return jsonResponse(
        400,
        errBody({ where: "SUPABASE UPDATE", error: upd.error.message }),
        origin,
      );
    }

    return jsonResponse(
      200,
      {
        ok: true,
        cedula,
        antes: actual,
        despues: nuevo,
        data: upd.data,
      },
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
      .select("cedula,nombres,apellidos,sede,encuestas_realizadas")
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
