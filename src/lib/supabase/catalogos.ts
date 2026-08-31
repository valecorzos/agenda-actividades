import { supabase } from "@/lib/supabase/client";
import type { LineaNegocio, Proceso } from "@/lib/documentos";

/**
 * Error de negocio: no se puede dar de baja un elemento del catálogo que
 * todavía tiene documentos asociados. Se corrige editándolo, no borrándolo.
 */
export class CatalogoEnUsoError extends Error {
  constructor(public readonly enUso: number) {
    super(
      `No se puede eliminar: ${enUso} ${
        enUso === 1 ? "documento lo usa" : "documentos lo usan"
      }. Edítalo en vez de eliminarlo.`
    );
    this.name = "CatalogoEnUsoError";
  }
}

// ------------------------------------------------------ Líneas de negocio

export async function fetchLineasNegocio(): Promise<LineaNegocio[]> {
  const { data, error } = await supabase
    .from("lineas_negocio")
    .select("id, nombre, color, orden, activo")
    .is("deleted_at", null)
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createLineaNegocio(
  nombre: string,
  color: string
): Promise<LineaNegocio> {
  const { data, error } = await supabase
    .from("lineas_negocio")
    .insert({ nombre: nombre.trim(), color })
    .select("id, nombre, color, orden, activo")
    .single();

  if (error) throw error;
  return data;
}

export async function updateLineaNegocio(
  id: string,
  cambios: Partial<Pick<LineaNegocio, "nombre" | "color" | "orden" | "activo">>
): Promise<void> {
  const { error } = await supabase
    .from("lineas_negocio")
    .update(cambios)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteLineaNegocio(id: string): Promise<void> {
  const { count, error: errorConteo } = await supabase
    .from("documentos")
    .select("id", { count: "exact", head: true })
    .eq("linea_negocio_id", id)
    .is("deleted_at", null);

  if (errorConteo) throw errorConteo;
  if (count && count > 0) throw new CatalogoEnUsoError(count);

  const { error } = await supabase
    .from("lineas_negocio")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------- Procesos

export async function fetchProcesos(): Promise<Proceso[]> {
  const { data, error } = await supabase
    .from("procesos")
    .select("id, nombre, linea_negocio_id, activo")
    .is("deleted_at", null)
    .order("nombre", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createProceso(
  nombre: string,
  lineaNegocioId: string | null
): Promise<Proceso> {
  const { data, error } = await supabase
    .from("procesos")
    .insert({ nombre: nombre.trim(), linea_negocio_id: lineaNegocioId })
    .select("id, nombre, linea_negocio_id, activo")
    .single();

  if (error) throw error;
  return data;
}

export async function updateProceso(
  id: string,
  cambios: Partial<Pick<Proceso, "nombre" | "linea_negocio_id" | "activo">>
): Promise<void> {
  const { error } = await supabase.from("procesos").update(cambios).eq("id", id);
  if (error) throw error;
}

export async function deleteProceso(id: string): Promise<void> {
  const { count, error: errorConteo } = await supabase
    .from("documentos")
    .select("id", { count: "exact", head: true })
    .eq("proceso_id", id)
    .is("deleted_at", null);

  if (errorConteo) throw errorConteo;
  if (count && count > 0) throw new CatalogoEnUsoError(count);

  const { error } = await supabase
    .from("procesos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
