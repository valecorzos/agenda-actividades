"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

function Slider({
  className,
  color,
  ...props
}: SliderPrimitive.Root.Props & { color?: string }) {
  return (
    <SliderPrimitive.Root data-slot="slider" {...props}>
      <SliderPrimitive.Control
        // El arrastre horizontal del slider no debe leerse como el swipe que
        // cierra un Drawer que lo contenga.
        data-base-ui-swipe-ignore=""
        className={cn(
          "flex w-full touch-none items-center py-2 select-none",
          className
        )}
      >
        <SliderPrimitive.Track className="h-2.5 w-full rounded-4xl bg-muted select-none">
          <SliderPrimitive.Indicator
            className="rounded-4xl bg-primary select-none"
            style={color ? { backgroundColor: color } : undefined}
          />
          <SliderPrimitive.Thumb
            className="size-5 rounded-full border-2 border-primary bg-card shadow-sm transition-shadow select-none has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50"
            style={color ? { borderColor: color } : undefined}
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
