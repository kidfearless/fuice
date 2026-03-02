import { Component, ComponentProps } from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class Popover extends Component<ComponentProps<typeof PopoverPrimitive.Root>> {
  render() {
    return <PopoverPrimitive.Root data-slot="popover" {...this.componentProps} />
  }
}

class PopoverTrigger extends Component<ComponentProps<typeof PopoverPrimitive.Trigger>> {
  render() {
    return (
      <PopoverPrimitive.Trigger data-slot="popover-trigger" {...this.componentProps} />
    )
  }
}

class PopoverAnchor extends Component<ComponentProps<typeof PopoverPrimitive.Anchor>> {
  render() {
    return (
      <PopoverPrimitive.Anchor data-slot="popover-anchor" {...this.componentProps} />
    )
  }
}

class PopoverContent extends Component<ComponentProps<typeof PopoverPrimitive.Content>> {
  render() {
    const className = (this.componentProps).className
    const align = (this.componentProps).align ?? "center"
    const sideOffset = (this.componentProps).sideOffset ?? 4
    const props = omitObjectKeys((this.componentProps), ['className', 'align', 'sideOffset'])
    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          data-slot="popover-content"
          align={align}
          sideOffset={sideOffset}
          className={cn(
            "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 rounded-md border p-4 shadow-md outline-none",
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Portal>
    )
  }
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
