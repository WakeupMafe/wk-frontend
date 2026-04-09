import type { HandlerEvent, HandlerResponse } from "@netlify/functions";
import { corsHeaders, pickCorsOrigin } from "./cors";

export function getLogicalPath(event: HandlerEvent): string {
  const raw = event.queryStringParameters?.__path;
  if (raw) {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  const path = event.path || "";
  if (path.startsWith("/.netlify/functions/api")) {
    return path.replace("/.netlify/functions/api", "") || "/";
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
