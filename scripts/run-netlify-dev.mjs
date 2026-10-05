/**
 * Arranca el watcher que fuerza CommonJS en functions-serve y luego `netlify dev`.
 * Evita el 500 "module is not defined in ES module scope" del wrapper CJS local.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "..");
const serveApiDir = path.join(frontendRoot, ".netlify", "functions-serve", "api");
const pkgPath = path.join(serveApiDir, "package.json");
const desired = `${JSON.stringify({ type: "commonjs" })}\n`;

function ensureFunctionsCjsPackage() {
  if (!fs.existsSync(serveApiDir)) return;
  try {
    const current = fs.existsSync(pkgPath)
      ? fs.readFileSync(pkgPath, "utf8")
      : "";
    if (current.trim() !== desired.trim()) {
      fs.writeFileSync(pkgPath, desired, "utf8");
    }
  } catch {
    /* ignore race while Netlify regenera el directorio */
  }
}

ensureFunctionsCjsPackage();
const timer = setInterval(ensureFunctionsCjsPackage, 1500);

const child = spawn("npx", ["netlify", "dev"], {
  cwd: frontendRoot,
  stdio: "inherit",
  shell: true,
  env: process.env,
});

function shutdown(code = 0) {
  clearInterval(timer);
  process.exit(code ?? 0);
}

child.on("exit", (code) => shutdown(code ?? 0));
child.on("error", (err) => {
  console.error("[ensure-functions-cjs] no se pudo iniciar netlify dev:", err);
  shutdown(1);
});

process.on("SIGINT", () => {
  child.kill("SIGINT");
});
process.on("SIGTERM", () => {
  child.kill("SIGTERM");
});
