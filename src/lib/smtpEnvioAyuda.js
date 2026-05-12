/**
 * Texto orientativo cuando `correoEnviado === false` y la API devuelve `envioRazon`.
 * Ver `frontend/netlify/functions/_lib/email.ts` (EnvioPinFalloRazon).
 */
export function textoAyudaFalloEnvio(envioRazon) {
  const r = String(envioRazon || "").trim();
  const bloques = {
    smtp_env_incompleto: `
      <p><b>Qué falta en el servidor (Netlify):</b> variables de entorno para el correo.</p>
      <p>En <b>Site settings → Environment variables</b> deben existir al menos:</p>
      <ul style="text-align:left;margin:0.5rem 0;padding-left:1.2rem;">
        <li><code>SMTP_HOST</code> (ej. <code>smtp-relay.brevo.com</code>)</li>
        <li><code>SMTP_PORT</code> (ej. <code>587</code>)</li>
        <li><code>SMTP_USER</code> y <code>SMTP_PASS</code> (login SMTP Brevo + clave)</li>
        <li><code>SMTP_FROM</code>: remitente visible <b>verificado en Brevo</b> (no puede ser <code>*@smtp-brevo.com</code>).</li>
      </ul>
      <p>Luego <b>redespliega</b> el sitio o vuelve a publicar para que las Functions las lean.</p>
    `,
    smtp_remitente_invalido: `
      <p><b>Brevo rechaza el envío</b> si el remitente (De) es el usuario SMTP (<code>xxxx@smtp-brevo.com</code>).</p>
      <p>Ese valor solo sirve para <b>autenticar</b> en <code>SMTP_USER</code>. El remitente visible debe ser otro:</p>
      <ul style="text-align:left;margin:0.5rem 0;padding-left:1.2rem;">
        <li>En Brevo: <b>Senders & domains</b> → añade y verifica un correo (ej. <code>noreply@tudominio.com</code>) o tu dominio.</li>
        <li>En Netlify: variable <code>SMTP_FROM</code> = <b>exactamente ese correo verificado</b> (no el de smtp-brevo.com).</li>
        <li>No borres <code>SMTP_USER</code>: debe seguir siendo el login <code>@smtp-brevo.com</code> para la clave SMTP.</li>
      </ul>
    `,
    smtp_auth: `
      <p><b>Falló el acceso al servidor SMTP</b> (usuario/clave incorrectos o cuenta bloqueada).</p>
      <p>Revisa en Brevo/Gmail que <code>SMTP_USER</code> y <code>SMTP_PASS</code> sean la clave SMTP real, no la contraseña web.</p>
    `,
    smtp_timeout: `
      <p><b>No hubo respuesta del servidor SMTP</b> (red, firewall o host/puerto mal escritos).</p>
      <p>Comprueba <code>SMTP_HOST</code> y que el puerto sea el correcto (587 con STARTTLS).</p>
    `,
    smtp_rechazo: `
      <p>El servidor SMTP <b>aceptó la sesión pero rechazó el mensaje</b> (remitente no verificado, política anti-spam, etc.).</p>
      <p>En Brevo: verifica el dominio o el remitente. El remitente debe coincidir con lo permitido por tu cuenta SMTP.</p>
    `,
    destino_invalido: `
      <p>No hay un correo válido asociado en base de datos para enviar el PIN.</p>
    `,
  };

  return bloques[r] || bloques.smtp_rechazo;
}
