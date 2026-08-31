import { supabase } from "@/lib/supabase/client";
import type { Mantenimiento, MantenimientoInput } from "@/lib/documentos";

/**
 * Los mantenimientos se cargan bajo demanda, al abrir el panel de un documento:
 * la tabla principal ya trae los contadores desde `v_documentos_detalle`, así
 * que no hace falta traerlos todos por adelantado.
 */
export async function fetchMantenimientos(
  documentoId: string
): Promise<Mantenimiento[]> {
  const { data, error } = await supabase
    .from("documento_mantenimientos")
    .select("*")
    .eq("documento_id", documentoId)
    .is("deleted_at", null)
    .order("fecha_solicitud", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
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
