/**
 * Convierte `detail` de respuestas FastAPI (string | array | object) en texto legible.
 */
export function formatApiDetail(detail) {
  if (detail == null || detail === "") return "";
  if (typeof detail === "string") return detail.trim();
  if (Array.isArray(detail)) {
    return detail
      .map((e) => {
        if (e && typeof e === "object" && "msg" in e) {
          const loc = Array.isArray(e.loc)
            ? e.loc.filter((x) => x !== "body").join(" · ")
            : "";
          return loc ? `${loc}: ${e.msg}` : e.msg;
        }
        return typeof e === "string" ? e : JSON.stringify(e);
      })
      .filter(Boolean)
      .join("\n");
  }
  if (typeof detail === "object") {
    if (detail.where != null && detail.error != null) {
      const err =
        typeof detail.error === "string"
          ? detail.error
          : JSON.stringify(detail.error);
      return `${detail.where}: ${err}`;
    }
    try {
      return JSON.stringify(detail);
    } catch {
      return "Respuesta de error no legible.";
    }
  }
  return String(detail);
}
