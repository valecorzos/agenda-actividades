import { supabase } from "@/lib/supabase/client";
import type { Mantenimiento, MantenimientoInput } from "@/lib/documentos";

/**
 * Los mantenimientos se cargan bajo demanda, al abrir el panel de un documento:
 * la tabla principal ya trae los contadores desde `v_documentos_detalle`, así
 * que no hace falta traerlos todos por adelantado.
 *
 * Se lee de `v_mantenimientos_detalle`, que ya trae los días en curso y el
 * semáforo del plazo calculados por Postgres. Las escrituras siguen yendo a la
 * tabla: `estado` es un campo derivado y la base lo recalcula sola.
 */
export async function fetchMantenimientos(
  documentoId: string
): Promise<Mantenimiento[]> {
  const { data, error } = await supabase
    .from("v_mantenimientos_detalle")
    .select("*")
    .eq("documento_id", documentoId)
    .order("fecha_solicitud", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Los mantenimientos abiertos de un lote de documentos, agrupados por
 * `documento_id`. La usa el reporte impreso: un documento puede estar "En
 * producción" y aun así tener un mantenimiento en curso, y eso es justo lo
 * que hay que mostrar. Los cerrados no aportan nada ahí —ya están resueltos—
 * así que se filtran en la propia consulta.
 */
export async function fetchMantenimientosAbiertosPorDocumentos(
  documentoIds: string[]
): Promise<Record<string, Mantenimiento[]>> {
  if (documentoIds.length === 0) return {};

  const { data, error } = await supabase
    .from("v_mantenimientos_detalle")
    .select("*")
    .in("documento_id", documentoIds)
    .neq("estado", "Cerrado")
    .order("fecha_estimada_entrega", { ascending: true, nullsFirst: false });

  if (error) throw error;

  const porDocumento: Record<string, Mantenimiento[]> = {};
  for (const m of data ?? []) {
    (porDocumento[m.documento_id] ??= []).push(m);
  }
  return porDocumento;
}

export async function createMantenimiento(
  input: MantenimientoInput
): Promise<void> {
  const { error } = await supabase
    .from("documento_mantenimientos")
    .insert(input);
  if (error) throw error;
}

export async function updateMantenimiento(
  id: string,
  cambios: Partial<Omit<MantenimientoInput, "documento_id">>
): Promise<void> {
  const { error } = await supabase
    .from("documento_mantenimientos")
    .update(cambios)
    .eq("id", id);
  if (error) throw error;
}

/** Borrado lógico, igual que en el resto del módulo. */
export async function deleteMantenimiento(id: string): Promise<void> {
  const { error } = await supabase
    .from("documento_mantenimientos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
