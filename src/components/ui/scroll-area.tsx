import { Component, ComponentProps } from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class ScrollArea extends Component<ComponentProps<typeof ScrollAreaPrimitive.Root>> {
  render() {
    const className = (this.componentProps).className
    const children = (this.componentProps).children
    const props = omitObjectKeys((this.componentProps), ['className', 'children'])
    return (
      <ScrollAreaPrimitive.Root
        data-slot="scroll-area"
        className={cn("relative overflow-hidden", className)}
        {...props}
      >
        <ScrollAreaPrimitive.Viewport
          data-slot="scroll-area-viewport"
          className="h-full w-full rounded-[inherit] outline-none"
        >
          {children}
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar />
        <ScrollAreaPrimitive.Corner />
      </ScrollAreaPrimitive.Root>
    )
  }
}

class ScrollBar extends Component<ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>> {
  render() {
    const className = (this.componentProps).className
    const orientation = (this.componentProps).orientation ?? "vertical"
    const props = omitObjectKeys((this.componentProps), ['className', 'orientation'])
    return (
      <ScrollAreaPrimitive.ScrollAreaScrollbar
        data-slot="scroll-area-scrollbar"
        orientation={orientation}
        className={cn(
          "flex touch-none select-none transition-colors",
          orientation === "vertical" &&
            "h-full w-2.5 border-l border-l-transparent p-[1px]",
          orientation === "horizontal" &&
            "h-2.5 flex-col border-t border-t-transparent p-[1px]",
          className
        )}
        {...props}
      >
        <ScrollAreaPrimitive.ScrollAreaThumb
          data-slot="scroll-area-thumb"
          className="bg-border relative flex-1 rounded-full"
        />
      </ScrollAreaPrimitive.ScrollAreaScrollbar>
    )
  }
}

export { ScrollArea, ScrollBar }
