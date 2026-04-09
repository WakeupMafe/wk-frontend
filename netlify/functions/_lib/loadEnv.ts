/**
 * Carga variables para Netlify Functions en local (`netlify dev`).
 * Netlify a veces define `SUPABASE_*` vacías en el proceso; con `override: false` dotenv
 * no las sustituye por los valores del archivo → 503. Aquí usamos `override: true` al leer .env.
 * También subimos directorios desde cwd y desde la ubicación del bundle hasta encontrar netlify.toml.
 */
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let didLoad = false;

/** Sube desde `startDir` hasta la raíz del volumen buscando `markerFile` en cada nivel. */
function findDirContainingFile(
  startDir: string,
  markerFile: string,
): string | null {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;
  for (let i = 0; i < 60; i++) {
    if (fs.existsSync(path.join(dir, markerFile))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir || dir === root) break;
    dir = parent;
  }
  return null;
}

function resolveRepoRootWithNetlifyToml(): string | null {
  const seeds: string[] = [process.cwd()];

  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    seeds.push(here);
    seeds.push(path.join(here, ".."));
    seeds.push(path.join(here, "..", ".."));
    seeds.push(path.join(here, "..", "..", ".."));
  } catch {
    /* import.meta.url no disponible en algún entorno raro */
  }

  const tried = new Set<string>();
  for (const seed of seeds) {
    const resolved = path.resolve(seed);
    if (tried.has(resolved)) continue;
    tried.add(resolved);
    const root = findDirContainingFile(resolved, "netlify.toml");
    if (root) return root;
  }
  return null;
}

/** Log temporal al arranque: .env + presencia de Supabase (sin valores secretos). */
function logStartupEnvSummary(params: {
  root: string | null;
  envFile: string;
  envLocal: string;
  envFrontend: string;
  envFileExistedBefore: boolean;
  envLocalLoaded: boolean;
  envFrontendLoaded: boolean;
}): void {
  const url = process.env.SUPABASE_URL?.trim() ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  console.log(
    "========== [wk-functions] ARRANQUE — .env y variables Supabase ==========",
  );
  if (!params.root) {
    console.log(
      "[wk-functions] Raíz con netlify.toml: NO ENCONTRADA (cwd=",
      process.cwd(),
      ")",
    );
    console.log(
      "[wk-functions] SUPABASE_URL presente:",
      url ? `SÍ (longitud ${url.length})` : "NO",
    );
    console.log(
      "[wk-functions] SUPABASE_SERVICE_ROLE_KEY presente:",
      key ? `SÍ (longitud ${key.length})` : "NO",
    );
    console.log(
      "========== [wk-functions] Fin resumen (revisa netlify.toml / cwd) ==========",
    );
    return;
  }

  console.log("[wk-functions] Raíz del repo (netlify.toml):", params.root);
  console.log("[wk-functions] Ruta esperada del archivo .env:", params.envFile);
  console.log(
    "[wk-functions] Archivo .env existe en disco:",
    params.envFileExistedBefore ? "SÍ" : "NO",
  );
  console.log(
    "[wk-functions] Opcional frontend/.env:",
    params.envFrontend,
    fs.existsSync(params.envFrontend) ? "(existe)" : "(no existe)",
  );
  if (params.envLocalLoaded) {
    console.log(
      "[wk-functions] También se cargó .env.local desde:",
      params.envLocal,
    );
  }
  if (params.envFrontendLoaded) {
    console.log(
      "[wk-functions] También se cargó frontend/.env desde:",
      params.envFrontend,
    );
  }
  console.log(
    "[wk-functions] SUPABASE_URL presente en process.env:",
    url ? `SÍ (longitud ${url.length})` : "NO",
  );
  console.log(
    "[wk-functions] SUPABASE_SERVICE_ROLE_KEY presente en process.env:",
    key ? `SÍ (longitud ${key.length})` : "NO",
  );
  console.log(
    "========== [wk-functions] Fin resumen arranque ==========",
  );
}

function applyEnvFile(filePath: string, label: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const r = config({ path: filePath, override: true });
  if (r.error) {
    console.error(`[loadEnv] error leyendo ${label}:`, r.error.message);
    return false;
  }
  console.log(
    `[loadEnv] ${label} cargado (override: true) desde`,
    filePath,
    "| claves:",
    r.parsed ? Object.keys(r.parsed).length : 0,
  );
  return true;
}

export function loadNetlifyFunctionEnv(): void {
  if (didLoad) return;
  didLoad = true;

  const root = resolveRepoRootWithNetlifyToml();
  if (!root) {
    logStartupEnvSummary({
      root: null,
      envFile: "",
      envLocal: "",
      envFrontend: "",
      envFileExistedBefore: false,
      envLocalLoaded: false,
      envFrontendLoaded: false,
    });
    return;
  }

  const envFile = path.join(root, ".env");
  const localFile = path.join(root, ".env.local");
  const frontendEnv = path.join(root, "frontend", ".env");

  const envFileExistedBefore = fs.existsSync(envFile);
  let envLocalLoaded = false;
  let envFrontendLoaded = false;

  if (envFileExistedBefore) {
    applyEnvFile(envFile, ".env raíz");
  } else {
    console.warn("[loadEnv] No existe", envFile, "| copia .env.example → .env");
  }

  if (fs.existsSync(localFile)) {
    envLocalLoaded = applyEnvFile(localFile, ".env.local");
  }

  const urlAfter = process.env.SUPABASE_URL?.trim();
  const keyAfter = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!urlAfter || !keyAfter) {
    if (fs.existsSync(frontendEnv)) {
      envFrontendLoaded = applyEnvFile(frontendEnv, "frontend/.env");
    }
  }

  logStartupEnvSummary({
    root,
    envFile,
    envLocal: localFile,
    envFrontend: frontendEnv,
    envFileExistedBefore,
    envLocalLoaded,
    envFrontendLoaded,
  });
}
