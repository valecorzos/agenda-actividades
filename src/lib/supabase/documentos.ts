import { supabase } from "@/lib/supabase/client";
import type {
  Documento,
  DocumentoInput,
  MovimientoHistorial,
} from "@/lib/documentos";

/**
 * Lee de la vista `v_documentos_detalle`, que ya trae resueltos los nombres de
 * los catálogos y las métricas derivadas. Las escrituras van a la tabla
 * `documentos`: `avance_global` y `estado` son columnas generadas y Postgres
 * rechaza cualquier intento de escribirlas.
 */
export async function fetchDocumentos(): Promise<Documento[]> {
  const { data, error } = await supabase
    .from("v_documentos_detalle")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createDocumento(input: DocumentoInput): Promise<void> {
  const { error } = await supabase.from("documentos").insert(input);
  if (error) throw error;
}

export async function updateDocumento(
  id: string,
  input: DocumentoInput
): Promise<void> {
  const { error } = await supabase
    .from("documentos")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

/**
 * Actualización puntual del enfoque, para poder cambiar el responsable desde la
 * tabla sin abrir el formulario completo.
 */
export async function updateResponsable(
  id: string,
  responsable: DocumentoInput["responsable"]
): Promise<void> {
  const { error } = await supabase
    .from("documentos")
    .update({ responsable })
    .eq("id", id);
  if (error) throw error;
}

/** Borrado lógico: el histórico de la bitácora nunca se pierde. */
export async function deleteDocumento(id: string): Promise<void> {
  const { error } = await supabase
    .from("documentos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Bitácora de avance para el gráfico de velocidad. Se limita a los últimos
 * `dias` porque el dashboard solo grafica el período reciente.
 */
export async function fetchHistorial(
  dias = 180
): Promise<MovimientoHistorial[]> {
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);

  const { data, error } = await supabase
    .from("documento_historial")
    .select("*")
    .gte("registrado_at", desde.toISOString())
    .order("registrado_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
