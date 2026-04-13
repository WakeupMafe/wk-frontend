import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Suma `encuestas_realizadas` en `autorizados` para la cédula indicada.
 * Misma lógica que POST /autorizados/incrementar-encuesta (uso interno desde crearLogros2).
 */
export async function incrementarEncuestasRealizadas(
  supabase: SupabaseClient,
  cedula: string | number,
  incremento = 1,
): Promise<
  | { ok: true; antes: number; despues: number; data: unknown }
  | { ok: false; error: string }
> {
  if (cedula === undefined || cedula === null || String(cedula).trim() === "") {
    return { ok: false, error: "cedula requerida" };
  }

  const c = String(cedula).trim();
  const inc = Number(incremento);
  const delta = Number.isFinite(inc) && inc > 0 ? inc : 1;

  const q = await supabase
    .from("autorizados")
    .select("encuestas_realizadas")
    .eq("cedula", c)
    .limit(1)
    .maybeSingle();

  if (q.error) {
    return { ok: false, error: q.error.message };
  }
  if (!q.data) {
    return { ok: false, error: `No existe autorizado con cédula ${c}` };
  }

  const actual = Number(q.data.encuestas_realizadas ?? 0);
  const nuevo = actual + delta;

  const upd = await supabase
    .from("autorizados")
    .update({ encuestas_realizadas: nuevo })
    .eq("cedula", c)
    .select();

  if (upd.error) {
    return { ok: false, error: upd.error.message };
  }
  if (!upd.data?.length) {
    return { ok: false, error: "No se obtuvo fila tras actualizar encuestas_realizadas." };
  }

  return { ok: true, antes: actual, despues: nuevo, data: upd.data };
}
