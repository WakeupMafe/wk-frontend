export function formatearFecha(fechaIso) {
  if (!fechaIso) return "";

  const fecha = new Date(fechaIso);

  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const anio = fecha.getFullYear();

  let horas = fecha.getHours();
  const minutos = String(fecha.getMinutes()).padStart(2, "0");
  const ampm = horas >= 12 ? "pm" : "am";

  horas = horas % 12 || 12;

  return `${dia}/${mes}/${anio} ${horas}:${minutos} ${ampm}`;
}
