import { Component, ComponentProps } from "react"
import * as HoverCardPrimitive from "@radix-ui/react-hover-card"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class HoverCard extends Component<ComponentProps<typeof HoverCardPrimitive.Root>> {
  render() {
    return <HoverCardPrimitive.Root data-slot="hover-card" {...this.componentProps} />
  }
}

class HoverCardTrigger extends Component<ComponentProps<typeof HoverCardPrimitive.Trigger>> {
  render() {
    return (
      <HoverCardPrimitive.Trigger
        data-slot="hover-card-trigger"
        {...this.componentProps}
      />
    )
  }
}

class HoverCardContent extends Component<ComponentProps<typeof HoverCardPrimitive.Content>> {
  render() {
    const className = (this.componentProps).className
    const align = (this.componentProps).align ?? "center"
    const sideOffset = (this.componentProps).sideOffset ?? 4
    const props = omitObjectKeys((this.componentProps), ['className', 'align', 'sideOffset'])
    return (
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          data-slot="hover-card-content"
          align={align}
          sideOffset={sideOffset}
          className={cn(
            "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-64 rounded-md border p-4 shadow-md outline-none",
            className
          )}
          {...props}
        />
      </HoverCardPrimitive.Portal>
    )
  }
}

export { HoverCard, HoverCardTrigger, HoverCardContent }
