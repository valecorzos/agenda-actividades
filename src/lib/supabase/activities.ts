import { supabase } from "@/lib/supabase/client";
import { conReintentos } from "@/lib/supabase/reintentar";
import type { Activity, Categoria, Usuario } from "@/lib/types";

export async function fetchActivitiesByDate(fecha: string): Promise<Activity[]> {
  const data = await conReintentos(() =>
    supabase
      .from("activities")
      .select("*")
      .eq("fecha", fecha)
      .order("created_at", { ascending: true })
  );
  return data ?? [];
}

export async function fetchActivitiesByDateRange(
  startFecha: string,
  endFecha: string
): Promise<Activity[]> {
  const data = await conReintentos(() =>
    supabase
      .from("activities")
      .select("*")
      .gte("fecha", startFecha)
      .lte("fecha", endFecha)
      .order("created_at", { ascending: true })
  );
  return data ?? [];
}

export async function createActivity(input: {
  usuario: Usuario;
  categoria: Categoria;
  descripcion: string;
  fecha: string;
}): Promise<Activity> {
  // El id lo pone el cliente, y por eso el alta es un upsert y no un insert: si
  // la primera petición llegó a aplicarse pero su respuesta se perdió por el
  // camino —que es justo lo que pasa con un 504—, el reintento cae sobre la
  // misma fila en vez de crear una segunda actividad idéntica.
  const fila = { id: crypto.randomUUID(), ...input };

  return conReintentos(() =>
    supabase.from("activities").upsert(fila).select().single()
  );
}

export async function updateActivity(
  id: string,
  input: { usuario: Usuario; categoria: Categoria; descripcion: string }
): Promise<Activity> {
  // Repetible tal cual: escribe los mismos campos sobre la misma fila.
  return conReintentos(() =>
    supabase.from("activities").update(input).eq("id", id).select().single()
  );
}

export async function deleteActivity(id: string): Promise<void> {
  await conReintentos(() =>
    supabase.from("activities").delete().eq("id", id)
  );
}
