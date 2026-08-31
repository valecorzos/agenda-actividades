"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Panel lateral para formularios largos. Entra desde la derecha y ocupa el
 * ancho completo en móvil. El pie queda fijo mientras el cuerpo hace scroll,
 * así el botón de guardar siempre está a la vista.
 */
function Sheet(props: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root swipeDirection="right" {...props} />;
}

const SheetTrigger = DrawerPrimitive.Trigger;
const SheetClose = DrawerPrimitive.Close;

function SheetContent({
  className,
  children,
  title,
  description,
  footer,
  ...props
}: Omit<DrawerPrimitive.Popup.Props, "title"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Backdrop className="fixed inset-0 z-50 min-h-dvh bg-foreground/40 opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] supports-backdrop-filter:backdrop-blur-xs data-swiping:duration-0 data-starting-style:opacity-0 data-ending-style:opacity-0" />
      <DrawerPrimitive.Viewport className="fixed inset-0 z-50 flex items-stretch justify-end">
        <DrawerPrimitive.Popup
          className={cn(
            "flex h-full w-full flex-col bg-card text-card-foreground shadow-2xl shadow-foreground/10 outline-none sm:max-w-md sm:rounded-l-4xl",
            "[transform:translateX(var(--drawer-swipe-movement-x))] transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
            "data-swiping:select-none data-starting-style:[transform:translateX(100%)] data-ending-style:[transform:translateX(100%)]",
            className
          )}
          {...props}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div className="flex flex-col gap-1">
              <DrawerPrimitive.Title className="font-heading text-base leading-none font-medium">
                {title}
              </DrawerPrimitive.Title>
              {description && (
                <DrawerPrimitive.Description className="text-sm text-muted-foreground">
                  {description}
                </DrawerPrimitive.Description>
              )}
            </div>
            <DrawerPrimitive.Close
              render={<Button variant="ghost" size="icon-sm" />}
              aria-label="Cerrar"
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            </DrawerPrimitive.Close>
          </div>

          {/* Drawer.Content aísla el contenido del gesto de arrastre: sin él,
              seleccionar texto o mover un control horizontal dentro del panel
              se interpretaría como un swipe para cerrarlo. */}
          <DrawerPrimitive.Content className="flex-1 overflow-y-auto overscroll-contain px-6 py-5">
            {children}
          </DrawerPrimitive.Content>

          {footer && (
            <div className="border-t border-border px-6 py-4">{footer}</div>
          )}
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent };
