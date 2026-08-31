"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UnfoldMoreIcon,
  Tick02Icon,
  Cancel01Icon,
  Add01Icon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

export type OpcionCombobox = {
  id: string;
  nombre: string;
  /** Punto de color a la izquierda (líneas de negocio). */
  color?: string;
  /** Texto secundario a la derecha (ej. la empresa de un proceso). */
  detalle?: string;
  /** Presente solo en la opción sintética "Crear …". */
  crear?: string;
};

type ComboboxProps = {
  opciones: OpcionCombobox[];
  valorId: string | null;
  onSeleccionar: (id: string | null) => void;
  /** Si se pasa, permite dar de alta un elemento nuevo escribiendo su nombre. */
  onCrear?: (nombre: string) => Promise<string | null>;
  placeholder?: string;
  textoVacio?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Desplegable con buscador que reemplaza a `<select>`. Cuando recibe `onCrear`,
 * ofrece dar de alta la opción escrita sin salir del formulario: así los
 * catálogos se llenan mientras se trabaja, en vez de tener que ir a otra
 * pantalla a crearlos primero.
 */
export function Combobox({
  opciones,
  valorId,
  onSeleccionar,
  onCrear,
  placeholder,
  textoVacio = "Sin coincidencias.",
  id,
  disabled,
  className,
}: ComboboxProps) {
  const [consulta, setConsulta] = React.useState("");
  const [creando, setCreando] = React.useState(false);

  const seleccion = React.useMemo(
    () => opciones.find((o) => o.id === valorId) ?? null,
    [opciones, valorId]
  );

  // La opción "Crear …" solo aparece si hay texto escrito y ninguna opción
  // coincide exactamente. Su nombre incluye la consulta para que sobreviva al
  // filtrado interno del combobox.
  const opcionesVisibles = React.useMemo(() => {
    const texto = consulta.trim();
    if (!onCrear || texto === "") return opciones;

    const normalizado = texto.toLocaleLowerCase();
    const yaExiste = opciones.some(
      (o) => o.nombre.trim().toLocaleLowerCase() === normalizado
    );
    if (yaExiste) return opciones;

    return [
      ...opciones,
      { id: `__crear__:${normalizado}`, nombre: texto, crear: texto },
    ];
  }, [opciones, consulta, onCrear]);

  function manejarCambio(valor: OpcionCombobox | null) {
    if (valor?.crear && onCrear) {
      const nombre = valor.crear;
      setCreando(true);
      onCrear(nombre)
        .then((nuevoId) => {
          if (nuevoId) onSeleccionar(nuevoId);
        })
        .finally(() => {
          setCreando(false);
          setConsulta("");
        });
      return;
    }
    onSeleccionar(valor?.id ?? null);
  }

  return (
    <ComboboxPrimitive.Root<OpcionCombobox>
      items={opcionesVisibles}
      value={seleccion}
      onValueChange={manejarCambio}
      onInputValueChange={setConsulta}
      isItemEqualToValue={(a, b) => a.id === b.id}
      itemToStringLabel={(item) => item.nombre}
      disabled={disabled || creando}
      autoHighlight
    >
      <ComboboxPrimitive.InputGroup
        className={cn(
          "relative flex h-9 w-full items-center rounded-4xl border border-input bg-input/30 transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
          disabled && "pointer-events-none opacity-50",
          className
        )}
      >
        {seleccion?.color && (
          <span
            aria-hidden
            className="ml-3 size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: seleccion.color }}
          />
        )}
        <ComboboxPrimitive.Input
          id={id}
          placeholder={creando ? "Creando…" : placeholder}
          className="h-full w-full min-w-0 rounded-4xl bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground md:text-sm"
        />
        <div className="absolute inset-y-0 right-1 flex items-center text-muted-foreground">
          {seleccion && (
            <ComboboxPrimitive.Clear
              aria-label="Limpiar selección"
              className="flex size-7 items-center justify-center rounded-full transition-colors hover:text-foreground"
            >
              <HugeiconsIcon
                icon={Cancel01Icon}
                strokeWidth={2}
                className="size-3.5"
              />
            </ComboboxPrimitive.Clear>
          )}
          <ComboboxPrimitive.Trigger
            aria-label="Abrir lista"
            className="flex size-7 items-center justify-center rounded-full transition-colors hover:text-foreground"
          >
            <HugeiconsIcon
              icon={UnfoldMoreIcon}
              strokeWidth={2}
              className="size-4"
            />
          </ComboboxPrimitive.Trigger>
        </div>
      </ComboboxPrimitive.InputGroup>

      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner sideOffset={6} className="z-50 outline-none">
          <ComboboxPrimitive.Popup className="max-h-[min(20rem,var(--available-height))] w-[var(--anchor-width)] max-w-[var(--available-width)] origin-[var(--transform-origin)] overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 transition-[transform,opacity] duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0">
            <ComboboxPrimitive.Empty className="px-3 py-4 text-sm text-muted-foreground empty:hidden">
              {textoVacio}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List className="max-h-[min(20rem,var(--available-height))] overflow-y-auto overscroll-contain p-1 data-empty:p-0">
              {(item: OpcionCombobox) => (
                <ComboboxPrimitive.Item
                  key={item.id}
                  value={item}
                  className="flex cursor-default items-center gap-2 rounded-xl px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  {item.crear ? (
                    <>
                      <HugeiconsIcon
                        icon={Add01Icon}
                        strokeWidth={2}
                        className="size-4 shrink-0 text-primary"
                      />
                      <span className="truncate">
                        Crear <span className="font-medium">{item.crear}</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <ComboboxPrimitive.ItemIndicator className="shrink-0">
                        <HugeiconsIcon
                          icon={Tick02Icon}
                          strokeWidth={2}
                          className="size-4"
                        />
                      </ComboboxPrimitive.ItemIndicator>
                      {item.color && (
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                      )}
                      <span className="flex-1 truncate">{item.nombre}</span>
                      {item.detalle && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {item.detalle}
                        </span>
                      )}
                    </>
                  )}
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}
