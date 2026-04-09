import type { HandlerEvent, HandlerResponse } from "@netlify/functions";
import { corsHeaders, pickCorsOrigin } from "./cors";

/**
 * Ruta lógica de la app (/verificacion/..., /encuestas/...).
 * Prioridad: __path (query) → rawQuery → path directo (netlify dev / proxies).
 */
export function getLogicalPath(event: HandlerEvent): string {
  const fromQs = event.queryStringParameters?.__path;
  if (fromQs) {
    try {
      return decodeURIComponent(fromQs);
    } catch {
      return fromQs;
    }
  }

  const multi = event.multiValueQueryStringParameters?.__path?.[0];
  if (multi) {
    try {
      return decodeURIComponent(multi);
    } catch {
      return multi;
    }
  }

  if (event.rawQuery) {
    try {
      const params = new URLSearchParams(event.rawQuery);
      const p = params.get("__path");
      if (p) return p.split("?")[0];
    } catch {
      /* ignore */
    }
  }

  const path = (event.path || "").split("?")[0];

  if (
    path.startsWith("/verificacion") ||
    path.startsWith("/encuestas") ||
    path.startsWith("/autorizados")
  ) {
    return path;
  }

  if (path.startsWith("/.netlify/functions/api")) {
    const rest = path.replace("/.netlify/functions/api", "") || "/";
    return rest === "" ? "/" : rest;
  }

  return path || "/";
}

export function parseJsonBody(event: HandlerEvent): unknown {
  if (!event.body) return null;
  const raw =
    event.isBase64Encoded && typeof event.body === "string"
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;
  try {
    return JSON.parse(raw as string);
  } catch {
    return null;
  }
}

export function jsonResponse(
  statusCode: number,
  data: unknown,
  origin: string | null,
  extraHeaders?: Record<string, string>,
): HandlerResponse {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
      ...extraHeaders,
    },
    body: JSON.stringify(data),
  };
}

export function emptyResponse(
  statusCode: number,
  origin: string | null,
): HandlerResponse {
  return {
    statusCode,
    headers: corsHeaders(origin),
    body: "",
  };
}

export function handleOptions(event: HandlerEvent): HandlerResponse | null {
  if (event.httpMethod !== "OPTIONS") return null;
  const origin = pickCorsOrigin(event.headers.origin || event.headers.Origin);
  return emptyResponse(204, origin);
}

export { pickCorsOrigin };
