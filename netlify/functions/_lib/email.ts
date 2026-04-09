import nodemailer from "nodemailer";

const SMTP_FROM = "fernanda.grimaldo018@gmail.com";

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

/**
 * Equivalente funcional a `enviar_pin_por_correo` en `backend/utils/email_utils.py`.
 * SMTP directo; nodemailer negocia STARTTLS en puerto 587 (comportamiento análogo a ehlo/starttls/ehlo/login/sendmail).
 */
export async function enviarPinPorCorreo(
  destinatario: string,
  pin: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const t0 = Date.now();
  console.log(`[PIN] enviarPinPorCorreo() -> ${destinatario}`);

  let cfg: ReturnType<typeof validarEnvSmtp>;
  try {
    cfg = validarEnvSmtp();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[SMTP]", msg);
    return { ok: false, error: msg };
  }

  const { host, port, user, pass } = cfg;

  const to = (destinatario || "").trim();
  const pinClean = (pin || "").trim();

  if (!to) {
    return { ok: false, error: "Destinatario vacío" };
  }
  if (!pinClean) {
    return { ok: false, error: "PIN vacío" };
  }

  console.log("[SMTP] SMTP_HOST:", host);
  console.log("[SMTP] SMTP_PORT:", port);
  console.log("[SMTP] SMTP_USER:", user);
  console.log("[SMTP] SMTP_FROM:", SMTP_FROM);

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
      from: SMTP_FROM,
      to,
      subject: "Tu código de acceso",
      replyTo: SMTP_FROM,
      text: body,
      date: new Date(),
    });

    console.log("[SMTP] sendMail en", `${Date.now() - t1} ms`);
    console.log("[SMTP] Resultado:", info.messageId, info.response);
    console.log(`[SMTP] TOTAL enviarPinPorCorreo ${(Date.now() - t0) / 1000}s`);

    const rejected = info.rejected?.filter(Boolean);
    if (rejected?.length) {
      console.warn("[SMTP] Algunos destinatarios fueron rechazados:", rejected);
      return { ok: false, error: String(rejected) };
    }

    console.log("[SMTP] Gmail aceptó el correo para envío.");
    return { ok: true };
  } catch (e) {
    console.log(`[SMTP] TOTAL (con error) ${(Date.now() - t0) / 1000}s`);
    console.error("[SMTP] ERROR ENVIANDO CORREO:", e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
