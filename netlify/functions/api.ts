import type { Handler } from "@netlify/functions";
import { loadNetlifyFunctionEnv } from "./_lib/loadEnv";
import {
  getLogicalPath,
  handleOptions,
  jsonResponse,
  parseJsonBody,
  pickCorsOrigin,
} from "./_lib/http";
import { SupabaseEnvError } from "./_lib/supabase";
import { handleVerificacion } from "./routes/verificacion";
import { handleAutorizados } from "./routes/autorizados";
import { handleEncuestas } from "./routes/encuestas";

loadNetlifyFunctionEnv();

function queryWithoutPath(
  q: Record<string, string | undefined> | null,
): Record<string, string | undefined> | null {
  if (!q) return null;
  const { __path: _p, ...rest } = q;
  return Object.keys(rest).length ? rest : {};
}

export const handler: Handler = async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;

  const origin = pickCorsOrigin(
    event.headers.origin || event.headers.Origin,
  );
  const pathname = getLogicalPath(event).split("?")[0];
  const method = (event.httpMethod || "GET").toUpperCase();

  let body: unknown = null;
  if (
    method !== "GET" &&
    method !== "HEAD" &&
    event.body
  ) {
    body = parseJsonBody(event);
  }

  const query = queryWithoutPath(event.queryStringParameters);

  const isCedulaCheck =
    method === "POST" &&
    (pathname === "/verificacion/cedula" ||
      pathname.endsWith("/verificacion/cedula"));

  if (isCedulaCheck) {
    console.log("[api][verificacion/cedula] request", {
      method,
      pathname,
      eventPath: event.path,
      rawQuery: event.rawQuery || "(vacío)",
      hasBody: Boolean(event.body),
      bodyParsedType:
        body === null ? "null" : Array.isArray(body) ? "array" : typeof body,
      bodyPreview:
        body && typeof body === "object"
          ? JSON.stringify(body).slice(0, 200)
          : body,
    });
    if (event.body && body === null) {
      console.error(
        "[api][verificacion/cedula] el cuerpo no es JSON válido (revisa Content-Type y JSON)",
      );
    }
  }

  try {
    if (pathname.startsWith("/verificacion")) {
      const r = await handleVerificacion(
        pathname,
        method,
        body,
        origin,
        query,
      );
      if (r) return r;
    }
    if (pathname.startsWith("/autorizados")) {
      const r = await handleAutorizados(pathname, method, body, origin);
      if (r) return r;
    }
    if (pathname.startsWith("/encuestas")) {
      const r = await handleEncuestas(
        pathname,
        method,
        body,
        origin,
        query,
      );
      if (r) return r;
    }

    return jsonResponse(404, { detail: "Not found" }, origin);
  } catch (e) {
    if (e instanceof SupabaseEnvError) {
      console.error("[api] SupabaseEnvError:", e.message);
      return jsonResponse(
        503,
        {
          detail: e.message,
          code: e.code,
        },
        origin,
      );
    }
    console.error("[api] error no manejado:", e);
    return jsonResponse(
      500,
      { detail: e instanceof Error ? e.message : String(e) },
      origin,
    );
  }
};
