"use client";

import * as React from "react";
import {
  createDocumento,
  deleteDocumento,
  fetchDocumentos,
  updateDocumento,
  updateResponsable,
} from "@/lib/supabase/documentos";
import {
  createLineaNegocio,
  createProceso,
  fetchLineasNegocio,
  fetchProcesos,
} from "@/lib/supabase/catalogos";
import type {
  Documento,
  DocumentoInput,
  EstadoDocumento,
  LineaNegocio,
  Proceso,
  Responsable,
  TipoDocumento,
} from "@/lib/documentos";
import { COLORES_CATALOGO } from "@/lib/documentos";

/** `"sin-asignar"` es un filtro real: los documentos que nadie está trabajando. */
export type FiltroResponsable = Responsable | "sin-asignar";

export type Filtros = {
  lineaNegocioId: string | null;
  procesoId: string | null;
  tipo: TipoDocumento | null;
  responsable: FiltroResponsable | null;
  estado: EstadoDocumento | null;
  /** Oculta lo que ya está en producción para ver solo el trabajo vivo. */
  soloEnCurso: boolean;
  busqueda: string;
};

export const FILTROS_VACIOS: Filtros = {
  lineaNegocioId: null,
  procesoId: null,
  tipo: null,
  responsable: null,
  estado: null,
  soloEnCurso: false,
  busqueda: "",
};

type ContextoDocumentos = {
  documentos: Documento[];
  visibles: Documento[];
  lineas: LineaNegocio[];
  procesos: Proceso[];
  filtros: Filtros;
  hayFiltros: boolean;
  cargando: boolean;
  error: string | null;
  setFiltro: <K extends keyof Filtros>(clave: K, valor: Filtros[K]) => void;
  limpiarFiltros: () => void;
  recargar: () => Promise<void>;
  guardar: (id: string | null, input: DocumentoInput) => Promise<void>;
  eliminar: (documento: Documento) => Promise<void>;
  cambiarResponsable: (
    documento: Documento,
    responsable: Responsable | null
  ) => Promise<void>;
  crearLinea: (nombre: string) => Promise<string | null>;
  crearProceso: (nombre: string) => Promise<string | null>;
};

const Contexto = React.createContext<ContextoDocumentos | null>(null);

export function useDocumentos(): ContextoDocumentos {
  const valor = React.useContext(Contexto);
  if (!valor) {
    throw new Error("useDocumentos debe usarse dentro de <DocumentosProvider>");
  }
  return valor;
}

/** Quita tildes y mayúsculas para que la búsqueda no dependa de cómo se escriba. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();
}

export function DocumentosProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [documentos, setDocumentos] = React.useState<Documento[]>([]);
  const [lineas, setLineas] = React.useState<LineaNegocio[]>([]);
  const [procesos, setProcesos] = React.useState<Proceso[]>([]);
  const [filtros, setFiltros] = React.useState<Filtros>(FILTROS_VACIOS);
  const [cargando, setCargando] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const recargar = React.useCallback(async () => {
    setError(null);
    try {
      const [docs, lns, prcs] = await Promise.all([
        fetchDocumentos(),
        fetchLineasNegocio(),
        fetchProcesos(),
      ]);
      setDocumentos(docs);
      setLineas(lns);
      setProcesos(prcs);
    } catch (e) {
      setError(
        e instanceof Error
          ? `No se pudieron cargar los datos: ${e.message}`
          : "No se pudieron cargar los datos."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  React.useEffect(() => {
    recargar();
  }, [recargar]);

  const setFiltro = React.useCallback(
    <K extends keyof Filtros>(clave: K, valor: Filtros[K]) => {
      setFiltros((previos) => {
        const siguientes = { ...previos, [clave]: valor };
        // Cambiar de empresa invalida el proceso elegido si ya no le pertenece.
        if (clave === "lineaNegocioId") siguientes.procesoId = null;
        return siguientes;
      });
    },
    []
  );

  const limpiarFiltros = React.useCallback(() => setFiltros(FILTROS_VACIOS), []);

  const hayFiltros = React.useMemo(
    () =>
      filtros.lineaNegocioId !== null ||
      filtros.procesoId !== null ||
      filtros.tipo !== null ||
      filtros.responsable !== null ||
      filtros.estado !== null ||
      filtros.soloEnCurso ||
      filtros.busqueda.trim() !== "",
    [filtros]
  );

  const visibles = React.useMemo(() => {
    const busqueda = normalizar(filtros.busqueda.trim());

    return documentos.filter((d) => {
      if (filtros.lineaNegocioId && d.linea_negocio_id !== filtros.lineaNegocioId)
        return false;
      if (filtros.procesoId && d.proceso_id !== filtros.procesoId) return false;
      if (filtros.tipo && d.tipo !== filtros.tipo) return false;
      if (filtros.estado && d.estado !== filtros.estado) return false;
      if (filtros.soloEnCurso && d.en_produccion) return false;

      if (filtros.responsable === "sin-asignar") {
        if (d.responsable !== null) return false;
      } else if (filtros.responsable && d.responsable !== filtros.responsable) {
        return false;
      }

      if (busqueda) {
        const heno = normalizar(
          `${d.nombre} ${d.linea_negocio} ${d.proceso} ${d.tipo} ${d.descripcion ?? ""}`
        );
        if (!heno.includes(busqueda)) return false;
      }
      return true;
    });
  }, [documentos, filtros]);

  const guardar = React.useCallback(
    async (id: string | null, input: DocumentoInput) => {
      if (id) await updateDocumento(id, input);
      else await createDocumento(input);
      await recargar();
    },
    [recargar]
  );

  // Las actualizaciones optimistas revierten campo por campo en vez de
  // restaurar una copia completa del arreglo: si hay dos cambios en vuelo, el
  // fallo de uno ya no pisa el resultado del otro.
  const eliminar = React.useCallback(async (documento: Documento) => {
    setDocumentos((actuales) => actuales.filter((d) => d.id !== documento.id));
    try {
      await deleteDocumento(documento.id);
    } catch {
      setDocumentos((actuales) =>
        actuales.some((d) => d.id === documento.id)
          ? actuales
          : [documento, ...actuales]
      );
      setError("No se pudo eliminar el documento.");
    }
  }, []);

  const cambiarResponsable = React.useCallback(
    async (documento: Documento, responsable: Responsable | null) => {
      const anterior = documento.responsable;
      setDocumentos((actuales) =>
        actuales.map((d) => (d.id === documento.id ? { ...d, responsable } : d))
      );
      try {
        await updateResponsable(documento.id, responsable);
      } catch {
        setDocumentos((actuales) =>
          actuales.map((d) =>
            d.id === documento.id ? { ...d, responsable: anterior } : d
          )
        );
        setError("No se pudo cambiar el enfoque.");
      }
    },
    []
  );

  const crearLinea = React.useCallback(async (nombre: string) => {
    try {
      // El color sale de un hash del nombre: es estable, reparte bien la paleta
      // y evita una consulta extra solo para saber cuántas empresas hay.
      const semilla = [...nombre.trim().toLocaleLowerCase()].reduce(
        (suma, caracter) => suma + caracter.charCodeAt(0),
        0
      );
      const color = COLORES_CATALOGO[semilla % COLORES_CATALOGO.length];
      const nueva = await createLineaNegocio(nombre, color);
      setLineas((actuales) =>
        [...actuales, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre))
      );
      return nueva.id;
    } catch {
      setError(`No se pudo crear la línea de negocio "${nombre}".`);
      return null;
    }
  }, []);

  const crearProceso = React.useCallback(async (nombre: string) => {
    try {
      // Se crea transversal: sirve para cualquier empresa y evita duplicar
      // "Compras" una vez por cada línea de negocio.
      const nuevo = await createProceso(nombre, null);
      setProcesos((actuales) =>
        [...actuales, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre))
      );
      return nuevo.id;
    } catch {
      setError(`No se pudo crear el proceso "${nombre}".`);
      return null;
    }
  }, []);

  const valor: ContextoDocumentos = {
    documentos,
    visibles,
    lineas,
    procesos,
    filtros,
    hayFiltros,
    cargando,
    error,
    setFiltro,
    limpiarFiltros,
    recargar,
    guardar,
    eliminar,
    cambiarResponsable,
    crearLinea,
    crearProceso,
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
