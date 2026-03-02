import { Component, ComponentProps } from "react"
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class ContextMenu extends Component<ComponentProps<typeof ContextMenuPrimitive.Root>> {
  render() {
    return (
      <ContextMenuPrimitive.Root {...this.componentProps} />
    )
  }
}

class ContextMenuTrigger extends Component<ComponentProps<typeof ContextMenuPrimitive.Trigger>> {
  render() {
    return (
      <ContextMenuPrimitive.Trigger
        data-slot="context-menu-trigger"
        {...this.componentProps}
      />
    )
  }
}

class ContextMenuGroup extends Component<ComponentProps<typeof ContextMenuPrimitive.Group>> {
  render() {
    return (
      <ContextMenuPrimitive.Group
        data-slot="context-menu-group"
        {...this.componentProps}
      />
    )
  }
}

class ContextMenuPortal extends Component<ComponentProps<typeof ContextMenuPrimitive.Portal>> {
  render() {
    return (
      <ContextMenuPrimitive.Portal
        data-slot="context-menu-portal"
        {...this.componentProps}
      />
    )
  }
}

class ContextMenuSub extends Component<ComponentProps<typeof ContextMenuPrimitive.Sub>> {
  render() {
    return (
      <ContextMenuPrimitive.Sub {...this.componentProps} />
    )
  }
}

class ContextMenuRadioGroup extends Component<ComponentProps<typeof ContextMenuPrimitive.RadioGroup>> {
  render() {
    return (
      <ContextMenuPrimitive.RadioGroup
        data-slot="context-menu-radio-group"
        {...this.componentProps}
      />
    )
  }
}

class ContextMenuSubTrigger extends Component<ComponentProps<typeof ContextMenuPrimitive.SubTrigger> & {
  inset?: boolean
}> {
  render() {
    const className = (this.componentProps).className
    const inset = (this.componentProps).inset
    const children = (this.componentProps).children
    const props = omitObjectKeys((this.componentProps), ['className', 'inset', 'children'])
    return (
      <ContextMenuPrimitive.SubTrigger
        data-slot="context-menu-sub-trigger"
        className={cn(
          "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
          inset && "pl-8",
          className
        )}
        {...props}
      >
        {children}
        <ChevronRight className="ml-auto size-4" />
      </ContextMenuPrimitive.SubTrigger>
    )
  }
}

class ContextMenuSubContent extends Component<ComponentProps<typeof ContextMenuPrimitive.SubContent>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <ContextMenuPrimitive.SubContent
        data-slot="context-menu-sub-content"
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-32 overflow-hidden rounded-md border p-1 shadow-lg",
          className
        )}
        {...props}
      />
    )
  }
}

class ContextMenuContent extends Component<ComponentProps<typeof ContextMenuPrimitive.Content>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content
          data-slot="context-menu-content"
          className={cn(
            "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-32 overflow-hidden rounded-md border p-1 shadow-lg",
            className
          )}
          {...props}
        />
      </ContextMenuPrimitive.Portal>
    )
  }
}

class ContextMenuItem extends Component<ComponentProps<typeof ContextMenuPrimitive.Item> & {
  inset?: boolean
}> {
  render() {
    const className = (this.componentProps).className
    const inset = (this.componentProps).inset
    const props = omitObjectKeys((this.componentProps), ['className', 'inset'])
    return (
      <ContextMenuPrimitive.Item
        data-slot="context-menu-item"
        className={cn(
          "focus:bg-accent focus:text-accent-foreground relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4",
          inset && "pl-8",
          className
        )}
        {...props}
      />
    )
  }
}

class ContextMenuCheckboxItem extends Component<ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>> {
  render() {
    const className = (this.componentProps).className
    const children = (this.componentProps).children
    const checked = (this.componentProps).checked
    const props = omitObjectKeys((this.componentProps), ['className', 'children', 'checked'])
    return (
      <ContextMenuPrimitive.CheckboxItem
        data-slot="context-menu-checkbox-item"
        className={cn(
          "focus:bg-accent focus:text-accent-foreground relative flex cursor-default select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          className
        )}
        checked={checked}
        {...props}
      >
        <span className="absolute left-2 flex size-3.5 items-center justify-center text-primary">
          <ContextMenuPrimitive.ItemIndicator>
            <Check className="size-4" />
          </ContextMenuPrimitive.ItemIndicator>
        </span>
        {children}
      </ContextMenuPrimitive.CheckboxItem>
    )
  }
}

class ContextMenuRadioItem extends Component<ComponentProps<typeof ContextMenuPrimitive.RadioItem>> {
  render() {
    const className = (this.componentProps).className
    const children = (this.componentProps).children
    const props = omitObjectKeys((this.componentProps), ['className', 'children'])
    return (
      <ContextMenuPrimitive.RadioItem
        data-slot="context-menu-radio-item"
        className={cn(
          "focus:bg-accent focus:text-accent-foreground relative flex cursor-default select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          className
        )}
        {...props}
      >
        <span className="absolute left-2 flex size-3.5 items-center justify-center text-primary">
          <ContextMenuPrimitive.ItemIndicator>
            <Circle className="size-2 fill-current" />
          </ContextMenuPrimitive.ItemIndicator>
        </span>
        {children}
      </ContextMenuPrimitive.RadioItem>
    )
  }
}

class ContextMenuLabel extends Component<ComponentProps<typeof ContextMenuPrimitive.Label> & {
  inset?: boolean
}> {
  render() {
    const className = (this.componentProps).className
    const inset = (this.componentProps).inset
    const props = omitObjectKeys((this.componentProps), ['className', 'inset'])
    return (
      <ContextMenuPrimitive.Label
        data-slot="context-menu-label"
        className={cn(
          "text-foreground px-2 py-1.5 text-sm font-semibold",
          inset && "pl-8",
          className
        )}
        {...props}
      />
    )
  }
}

class ContextMenuSeparator extends Component<ComponentProps<typeof ContextMenuPrimitive.Separator>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <ContextMenuPrimitive.Separator
        data-slot="context-menu-separator"
        className={cn("bg-border -mx-1 my-1 h-px", className)}
        {...props}
      />
    )
  }
}

class ContextMenuShortcut extends Component<ComponentProps<"span">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <span
        data-slot="context-menu-shortcut"
        className={cn(
          "text-muted-foreground ml-auto text-xs tracking-widest",
          className
        )}
        {...props}
      />
    )
  }
}

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
}
