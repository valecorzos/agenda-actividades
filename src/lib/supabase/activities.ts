import { supabase } from "@/lib/supabase/client";
import type { Activity, Categoria, Usuario } from "@/lib/types";

export async function fetchActivitiesByDate(fecha: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("fecha", fecha)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchActivitiesByDateRange(
  startFecha: string,
  endFecha: string
): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .gte("fecha", startFecha)
    .lte("fecha", endFecha)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createActivity(input: {
  usuario: Usuario;
  categoria: Categoria;
  descripcion: string;
  fecha: string;
}): Promise<Activity> {
  const { data, error } = await supabase
    .from("activities")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateActivity(
  id: string,
  input: { usuario: Usuario; categoria: Categoria; descripcion: string }
): Promise<Activity> {
  const { data, error } = await supabase
    .from("activities")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteActivity(id: string): Promise<void> {
  const { error } = await supabase.from("activities").delete().eq("id", id);
  if (error) throw error;
}
