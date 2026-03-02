import { Component, ComponentProps } from "react"
import * as MenubarPrimitive from "@radix-ui/react-menubar"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class Menubar extends Component<ComponentProps<typeof MenubarPrimitive.Root>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <MenubarPrimitive.Root
        data-slot="menubar"
        className={cn(
          "bg-background flex h-9 items-center gap-1 rounded-md border p-1 shadow-xs",
          className
        )}
        {...props}
      />
    )
  }
}

class MenubarMenu extends Component<ComponentProps<typeof MenubarPrimitive.Menu>> {
  render() {
    return <MenubarPrimitive.Menu {...this.componentProps} />
  }
}

class MenubarGroup extends Component<ComponentProps<typeof MenubarPrimitive.Group>> {
  render() {
    return <MenubarPrimitive.Group {...this.componentProps} />
  }
}

class MenubarPortal extends Component<ComponentProps<typeof MenubarPrimitive.Portal>> {
  render() {
    return <MenubarPrimitive.Portal {...this.componentProps} />
  }
}

class MenubarSub extends Component<ComponentProps<typeof MenubarPrimitive.Sub>> {
  render() {
    return <MenubarPrimitive.Sub {...this.componentProps} />
  }
}

class MenubarRadioGroup extends Component<ComponentProps<typeof MenubarPrimitive.RadioGroup>> {
  render() {
    return <MenubarPrimitive.RadioGroup {...this.componentProps} />
  }
}

class MenubarTrigger extends Component<ComponentProps<typeof MenubarPrimitive.Trigger>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <MenubarPrimitive.Trigger
        data-slot="menubar-trigger"
        className={cn(
          "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default select-none items-center rounded-sm px-3 py-1 text-sm font-medium outline-none",
          className
        )}
        {...props}
      />
    )
  }
}

class MenubarSubTrigger extends Component<ComponentProps<typeof MenubarPrimitive.SubTrigger> & {
  inset?: boolean
}> {
  render() {
    const className = (this.componentProps).className
    const inset = (this.componentProps).inset
    const children = (this.componentProps).children
    const props = omitObjectKeys((this.componentProps), ['className', 'inset', 'children'])
    return (
      <MenubarPrimitive.SubTrigger
        data-slot="menubar-sub-trigger"
        className={cn(
          "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
          inset && "pl-8",
          className
        )}
        {...props}
      >
        {children}
        <ChevronRight className="ml-auto size-4" />
      </MenubarPrimitive.SubTrigger>
    )
  }
}

class MenubarSubContent extends Component<ComponentProps<typeof MenubarPrimitive.SubContent>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <MenubarPrimitive.SubContent
        data-slot="menubar-sub-content"
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-32 overflow-hidden rounded-md border p-1 shadow-lg",
          className
        )}
        {...props}
      />
    )
  }
}

class MenubarContent extends Component<ComponentProps<typeof MenubarPrimitive.Content>> {
  render() {
    const className = (this.componentProps).className
    const align = (this.componentProps).align ?? "start"
    const alignOffset = (this.componentProps).alignOffset ?? -4
    const sideOffset = (this.componentProps).sideOffset ?? 8
    const props = omitObjectKeys((this.componentProps), ['className', 'align', 'alignOffset', 'sideOffset'])
    return (
      <MenubarPrimitive.Portal>
        <MenubarPrimitive.Content
          data-slot="menubar-content"
          align={align}
          alignOffset={alignOffset}
          sideOffset={sideOffset}
          className={cn(
            "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-48 overflow-hidden rounded-md border p-1 shadow-md",
            className
          )}
          {...props}
        />
      </MenubarPrimitive.Portal>
    )
  }
}

class MenubarItem extends Component<ComponentProps<typeof MenubarPrimitive.Item> & {
  inset?: boolean
}> {
  render() {
    const className = (this.componentProps).className
    const inset = (this.componentProps).inset
    const props = omitObjectKeys((this.componentProps), ['className', 'inset'])
    return (
      <MenubarPrimitive.Item
        data-slot="menubar-item"
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

class MenubarCheckboxItem extends Component<ComponentProps<typeof MenubarPrimitive.CheckboxItem>> {
  render() {
    const className = (this.componentProps).className
    const children = (this.componentProps).children
    const checked = (this.componentProps).checked
    const props = omitObjectKeys((this.componentProps), ['className', 'children', 'checked'])
    return (
      <MenubarPrimitive.CheckboxItem
        data-slot="menubar-checkbox-item"
        className={cn(
          "focus:bg-accent focus:text-accent-foreground relative flex cursor-default select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          className
        )}
        checked={checked}
        {...props}
      >
        <span className="absolute left-2 flex size-3.5 items-center justify-center">
          <MenubarPrimitive.ItemIndicator>
            <Check className="size-4" />
          </MenubarPrimitive.ItemIndicator>
        </span>
        {children}
      </MenubarPrimitive.CheckboxItem>
    )
  }
}

class MenubarRadioItem extends Component<ComponentProps<typeof MenubarPrimitive.RadioItem>> {
  render() {
    const className = (this.componentProps).className
    const children = (this.componentProps).children
    const props = omitObjectKeys((this.componentProps), ['className', 'children'])
    return (
      <MenubarPrimitive.RadioItem
        data-slot="menubar-radio-item"
        className={cn(
          "focus:bg-accent focus:text-accent-foreground relative flex cursor-default select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          className
        )}
        {...props}
      >
        <span className="absolute left-2 flex size-3.5 items-center justify-center">
          <MenubarPrimitive.ItemIndicator>
            <Circle className="size-2 fill-current" />
          </MenubarPrimitive.ItemIndicator>
        </span>
        {children}
      </MenubarPrimitive.RadioItem>
    )
  }
}

class MenubarLabel extends Component<ComponentProps<typeof MenubarPrimitive.Label> & {
  inset?: boolean
}> {
  render() {
    const className = (this.componentProps).className
    const inset = (this.componentProps).inset
    const props = omitObjectKeys((this.componentProps), ['className', 'inset'])
    return (
      <MenubarPrimitive.Label
        data-slot="menubar-label"
        className={cn(
          "px-2 py-1.5 text-sm font-semibold",
          inset && "pl-8",
          className
        )}
        {...props}
      />
    )
  }
}

class MenubarSeparator extends Component<ComponentProps<typeof MenubarPrimitive.Separator>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <MenubarPrimitive.Separator
        data-slot="menubar-separator"
        className={cn("bg-muted -mx-1 my-1 h-px", className)}
        {...props}
      />
    )
  }
}

class MenubarShortcut extends Component<ComponentProps<"span">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <span
        data-slot="menubar-shortcut"
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
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarGroup,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarShortcut,
}
