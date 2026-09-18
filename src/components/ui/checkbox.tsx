"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon, MinusSignIcon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

/**
 * Casilla de selección. Admite el estado intermedio (`indeterminate`), que es
 * lo que necesita la casilla de "seleccionar todo" cuando solo parte de la
 * tabla está marcada.
 */
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "flex size-4.5 shrink-0 items-center justify-center rounded-[6px] border border-input bg-input/30 text-primary-foreground transition-colors outline-none data-checked:border-primary data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className="flex items-center justify-center text-current"
        render={(propsIndicador, estado) => (
          <span {...propsIndicador}>
            <HugeiconsIcon
              icon={estado.indeterminate ? MinusSignIcon : Tick02Icon}
              strokeWidth={3}
              className="size-3"
            />
          </span>
        )}
      />
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
