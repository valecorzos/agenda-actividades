export type Usuario = "Juan" | "Valentina";
export type Categoria =
  | "Formulario"
  | "Procedimiento"
  | "Desarrollo"
  | "Diseño"
  | "Reunión"
  | "Capacitación"
  | "Dashboard"
  | "Mantenimiento";

export type Activity = {
  id: string;
  usuario: Usuario;
  categoria: Categoria;
  descripcion: string;
  fecha: string;
  created_at: string;
};

export const USUARIOS: Usuario[] = ["Juan", "Valentina"];
export const CATEGORIAS: Categoria[] = [
  "Formulario",
  "Procedimiento",
  "Desarrollo",
  "Diseño",
  "Reunión",
  "Capacitación",
  "Dashboard",
  "Mantenimiento",
];

export type EstadoProyecto =
  | "Planificación"
  | "En progreso"
  | "Completado"
  | "Pausado";

export type Project = {
  id: string;
  nombre: string;
  estado: EstadoProyecto;
  porcentaje_avance: number;
  created_at: string;
  updated_at: string;
};

export const ESTADOS_PROYECTO: EstadoProyecto[] = [
  "Planificación",
  "En progreso",
  "Completado",
  "Pausado",
];
