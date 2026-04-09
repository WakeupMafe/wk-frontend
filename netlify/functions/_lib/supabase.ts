import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/** Error explícito para configuración ausente (netlify dev sin .env, etc.). */
export class SupabaseEnvError extends Error {
  readonly code = "SUPABASE_CONFIG" as const;

  constructor(message: string) {
    super(message);
    this.name = "SupabaseEnvError";
  }
}

function logEnvDiagnostics(): void {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasUrl = Boolean(url?.trim());
  const hasKey = Boolean(key?.trim());
  console.error("[supabase] Diagnóstico de entorno (sin valores secretos):");
  console.error(
    "  SUPABASE_URL:",
    hasUrl ? `definida (longitud ${String(url).trim().length})` : "AUSENTE o vacía",
  );
  console.error(
    "  SUPABASE_SERVICE_ROLE_KEY:",
    hasKey ? `definida (longitud ${String(key).trim().length})` : "AUSENTE o vacía",
  );
  if (!hasUrl || !hasKey) {
    console.error(
      "[supabase] Para netlify dev: crea un archivo .env en la RAÍZ del repo (junto a netlify.toml) con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY. Ver .env.example",
    );
  }
}

/**
 * Cliente Supabase solo para Netlify Functions (service role).
 * Misma idea que `backend/utils/supabase_client.py`.
 */
export function getSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    logEnvDiagnostics();
    const msg =
      !url && !key
        ? "Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno del proceso (functions)."
        : !url
          ? "Falta SUPABASE_URL en el entorno del proceso (functions)."
          : "Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del proceso (functions).";
    throw new SupabaseEnvError(msg);
  }

  console.log(
    "[supabase] Variables OK → SUPABASE_URL longitud:",
    url.length,
    "| SUPABASE_SERVICE_ROLE_KEY longitud:",
    key.length,
    "(no se imprimen valores)",
  );

  cached = createClient(url, key);
  return cached;
}
