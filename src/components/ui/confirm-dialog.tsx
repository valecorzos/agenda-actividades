"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Diálogo de confirmación. Reemplaza a `confirm()` del navegador, que no se
 * puede estilar ni traducir. Con `soloAviso` se convierte en un aviso de un
 * botón, para explicar por qué algo no se puede hacer.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  titulo,
  descripcion,
  textoConfirmar = "Eliminar",
  destructivo = true,
  soloAviso = false,
  onConfirmar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  descripcion: React.ReactNode;
  textoConfirmar?: string;
  destructivo?: boolean;
  soloAviso?: boolean;
  onConfirmar?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {soloAviso ? (
            <Button onClick={() => onOpenChange(false)}>Entendido</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                variant={destructivo ? "destructive" : "default"}
                onClick={() => {
                  onConfirmar?.();
                  onOpenChange(false);
                }}
              >
                {textoConfirmar}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
