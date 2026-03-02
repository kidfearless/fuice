import { Component, ComponentProps } from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class TooltipProvider extends Component<ComponentProps<typeof TooltipPrimitive.Provider>> {
  render() {
    return <TooltipPrimitive.Provider data-slot="tooltip-provider" {...this.componentProps} />
  }
}

class Tooltip extends Component<ComponentProps<typeof TooltipPrimitive.Root>> {
  render() {
    return (
      <TooltipPrimitive.Root data-slot="tooltip" {...this.componentProps} />
    )
  }
}

class TooltipTrigger extends Component<ComponentProps<typeof TooltipPrimitive.Trigger>> {
  render() {
    return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...this.componentProps} />
  }
}

class TooltipContent extends Component<ComponentProps<typeof TooltipPrimitive.Content>> {
  render() {
    const className = (this.componentProps).className
    const sideOffset = (this.componentProps).sideOffset ?? 4
    const props = omitObjectKeys((this.componentProps), ['className', 'sideOffset'])
    return (
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          data-slot="tooltip-content"
          sideOffset={sideOffset}
          className={cn(
            "bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden rounded-md border px-3 py-1.5 text-sm shadow-md",
            className
          )}
          {...props}
        />
      </TooltipPrimitive.Portal>
    )
  }
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
