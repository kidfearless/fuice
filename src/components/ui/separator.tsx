import { Component, ComponentProps } from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"

import { cn } from "@/lib/utils"

class Separator extends Component<ComponentProps<typeof SeparatorPrimitive.Root>> {
  render() {
    const {
      className,
      orientation = "horizontal",
      decorative = true,
      ...props
    } = this.componentProps
    return (
      <SeparatorPrimitive.Root
        data-slot="separator-root"
        decorative={decorative}
        orientation={orientation}
        className={cn(
          "bg-border shrink-0",
          orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
          className
        )}
        {...props}
      />
    )
  }
}

export { Separator }
