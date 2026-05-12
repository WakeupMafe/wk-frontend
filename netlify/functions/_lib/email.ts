import nodemailer from "nodemailer";

export type EnvioPinFalloRazon =
  | "smtp_env_incompleto"
  | "smtp_remitente_invalido"
  | "smtp_auth"
  | "smtp_timeout"
  | "smtp_rechazo"
  | "destino_invalido";

export type EnvioPinResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      razon: EnvioPinFalloRazon;
    };

/**
 * Remitente visible (From) cuando el login SMTP es Brevo (*@smtp-brevo.com) y no hay SMTP_FROM.
 * Debe estar añadido y verificado en Brevo → Senders & domains.
 * Opcional: define SMTP_FROM en Netlify para sobrescribir (otro dominio, noreply@..., etc.).
 */
const DEFAULT_FROM_WHEN_SMTP_USER_IS_BREVO = "fernanda.grimaldo018@gmail.com";

/** El login SMTP de Brevo (*@smtp-brevo.com) nunca es un remitente "De" válido en Brevo. */
function esLoginSmtpBrevo(email: string): boolean {
  return /@smtp-brevo\.com$/i.test((email || "").trim());
}

/**
 * Dirección usada en cabecera From / Reply-To.
 * - Brevo con SMTP_USER *@smtp-brevo.com: usa SMTP_FROM si es un correo válido; si no, el remitente por defecto del proyecto arriba.
 * - Si SMTP_USER es un correo real (no smtp-brevo), puede usarse como From cuando SMTP_FROM no está definido.
 */
function smtpFromAddress(): string {
  const fromEnv = process.env.SMTP_FROM?.trim();
  const user = process.env.SMTP_USER?.trim();

  if (fromEnv) {
    if (esLoginSmtpBrevo(fromEnv)) {
      if (user && esLoginSmtpBrevo(user)) return DEFAULT_FROM_WHEN_SMTP_USER_IS_BREVO;
      return "";
    }
    return fromEnv;
  }
  if (!user) return "";
  if (esLoginSmtpBrevo(user)) return DEFAULT_FROM_WHEN_SMTP_USER_IS_BREVO;
  return user;
}

function validarEnvSmtp(): {
  host: string;
  port: number;
  user: string;
  pass: string;
} {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  const faltan: string[] = [];
  if (!host) faltan.push("SMTP_HOST");
  if (!portRaw) faltan.push("SMTP_PORT");
  if (!user) faltan.push("SMTP_USER");
  if (!pass) faltan.push("SMTP_PASS");

  if (faltan.length) {
    throw new Error(`Faltan variables SMTP en el entorno: ${faltan.join(", ")}`);
  }

  const port = parseInt(portRaw!, 10);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error("SMTP_PORT inválido");
  }

  return { host: host!, port, user: user!, pass: pass! };
}

function clasificarErrorSmtp(err: unknown): EnvioPinFalloRazon {
  const e = err as NodeJS.ErrnoException & { response?: string; responseCode?: number };
  const code = e?.code || "";
  const msg = (e instanceof Error ? e.message : String(err)).toLowerCase();

  if (code === "EAUTH" || msg.includes("invalid login") || msg.includes("authentication failed")) {
    return "smtp_auth";
  }
  if (
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "ESOCKET" ||
    msg.includes("timeout") ||
    msg.includes("timed out")
  ) {
    return "smtp_timeout";
  }
  return "smtp_rechazo";
}

/**
 * Equivalente funcional a `enviar_pin_por_correo` en `backend/utils/email_utils.py`.
 * SMTP directo; nodemailer negocia STARTTLS en puerto 587 (comportamiento análogo a ehlo/starttls/ehlo/login/sendmail).
 */
export async function enviarPinPorCorreo(
  destinatario: string,
  pin: string,
): Promise<EnvioPinResult> {
  const t0 = Date.now();
  console.log(`[PIN] enviarPinPorCorreo() -> ${destinatario}`);

  let cfg: ReturnType<typeof validarEnvSmtp>;
  try {
    cfg = validarEnvSmtp();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[SMTP] configuración:", msg);
    return {
      ok: false,
      error: msg,
      razon: "smtp_env_incompleto",
    };
  }

  const { host, port, user, pass } = cfg;

  const to = (destinatario || "").trim();
  const pinClean = (pin || "").trim();

  if (!to) {
    return { ok: false, error: "Destinatario vacío", razon: "destino_invalido" };
  }
  if (!pinClean) {
    return { ok: false, error: "PIN vacío", razon: "destino_invalido" };
  }

  const fromAddr = smtpFromAddress();
  if (!fromAddr) {
    const msg =
      "No se pudo determinar el remitente (From). Revisa SMTP_FROM y SMTP_USER en Netlify.";
    console.error("[SMTP]", msg);
    return { ok: false, error: msg, razon: "smtp_env_incompleto" };
  }

  console.log("[SMTP] SMTP_HOST:", host);
  console.log("[SMTP] SMTP_PORT:", port);
  console.log("[SMTP] SMTP_USER:", user);
  console.log("[SMTP] SMTP_FROM:", fromAddr);

  const body = `Hola,

Tu código de acceso es:

    ${pinClean}

Este código es personal y no debe compartirse.
Por favor guarda el código de acceso para futuras visitas.

Si no solicitaste este acceso, ignora este mensaje.
`;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 20_000,
    tls: { rejectUnauthorized: true },
    requireTLS: port !== 465,
  });

  try {
    const t1 = Date.now();
    const info = await transporter.sendMail({
      from: fromAddr,
      to,
      subject: "Tu código de acceso",
      replyTo: fromAddr,
      text: body,
      date: new Date(),
    });

    console.log("[SMTP] sendMail en", `${Date.now() - t1} ms`);
    console.log("[SMTP] Resultado:", info.messageId, info.response);
    console.log(`[SMTP] TOTAL enviarPinPorCorreo ${(Date.now() - t0) / 1000}s`);

    const rejected = info.rejected?.filter(Boolean);
    if (rejected?.length) {
      console.warn("[SMTP] destinatarios rechazados por el relay:", rejected);
      return {
        ok: false,
        error: String(rejected),
        razon: "smtp_rechazo",
      };
    }

    console.log("[SMTP] Relay aceptó el mensaje (messageId:", info.messageId, ")");
    return { ok: true };
  } catch (e) {
    console.log(`[SMTP] TOTAL (con error) ${(Date.now() - t0) / 1000}s`);
    console.error("[SMTP] ERROR ENVIANDO CORREO:", e);
    const razon = clasificarErrorSmtp(e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      razon,
    };
  }
}
