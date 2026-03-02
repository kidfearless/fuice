import { Component, ComponentProps } from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class DropdownMenu extends Component<ComponentProps<typeof DropdownMenuPrimitive.Root>> {
  render() {
    return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...this.componentProps} />
  }
}

class DropdownMenuTrigger extends Component<ComponentProps<typeof DropdownMenuPrimitive.Trigger>> {
  render() {
    return (
      <DropdownMenuPrimitive.Trigger
        data-slot="dropdown-menu-trigger"
        {...this.componentProps}
      />
    )
  }
}

class DropdownMenuGroup extends Component<ComponentProps<typeof DropdownMenuPrimitive.Group>> {
  render() {
    return (
      <DropdownMenuPrimitive.Group
        data-slot="dropdown-menu-group"
        {...this.componentProps}
      />
    )
  }
}

class DropdownMenuPortal extends Component<ComponentProps<typeof DropdownMenuPrimitive.Portal>> {
  render() {
    return (
      <DropdownMenuPrimitive.Portal
        data-slot="dropdown-menu-portal"
        {...this.componentProps}
      />
    )
  }
}

class DropdownMenuSub extends Component<ComponentProps<typeof DropdownMenuPrimitive.Sub>> {
  render() {
    return (
      <DropdownMenuPrimitive.Sub
        data-slot="dropdown-menu-sub"
        {...this.componentProps}
      />
    )
  }
}

class DropdownMenuRadioGroup extends Component<ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>> {
  render() {
    return (
      <DropdownMenuPrimitive.RadioGroup
        data-slot="dropdown-menu-radio-group"
        {...this.componentProps}
      />
    )
  }
}

class DropdownMenuSubTrigger extends Component<ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}> {
  render() {
    const className = (this.componentProps).className
    const inset = (this.componentProps).inset
    const children = (this.componentProps).children
    const props = omitObjectKeys((this.componentProps), ['className', 'inset', 'children'])
    return (
      <DropdownMenuPrimitive.SubTrigger
        data-slot="dropdown-menu-sub-trigger"
        className={cn(
          "focus:bg-accent data-[state=open]:bg-accent flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
          inset && "pl-8",
          className
        )}
        {...props}
      >
        {children}
        <ChevronRight className="ml-auto size-4" />
      </DropdownMenuPrimitive.SubTrigger>
    )
  }
}

class DropdownMenuSubContent extends Component<ComponentProps<typeof DropdownMenuPrimitive.SubContent>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <DropdownMenuPrimitive.SubContent
        data-slot="dropdown-menu-sub-content"
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-32 overflow-hidden rounded-md border p-1 shadow-lg",
          className
        )}
        {...props}
      />
    )
  }
}

class DropdownMenuContent extends Component<ComponentProps<typeof DropdownMenuPrimitive.Content>> {
  render() {
    const className = (this.componentProps).className
    const sideOffset = (this.componentProps).sideOffset ?? 4
    const props = omitObjectKeys((this.componentProps), ['className', 'sideOffset'])
    return (
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          data-slot="dropdown-menu-content"
          sideOffset={sideOffset}
          className={cn(
            "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-32 overflow-hidden rounded-md border p-1 shadow-md",
            className
          )}
          {...props}
        />
      </DropdownMenuPrimitive.Portal>
    )
  }
}

class DropdownMenuItem extends Component<ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
}> {
  render() {
    const className = (this.componentProps).className
    const inset = (this.componentProps).inset
    const props = omitObjectKeys((this.componentProps), ['className', 'inset'])
    return (
      <DropdownMenuPrimitive.Item
        data-slot="dropdown-menu-item"
        className={cn(
          "focus:bg-accent focus:text-accent-foreground relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4",
          inset && "pl-8",
          className
        )}
        {...props}
      />
    )
  }
}

class DropdownMenuCheckboxItem extends Component<ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>> {
  render() {
    const className = (this.componentProps).className
    const children = (this.componentProps).children
    const checked = (this.componentProps).checked
    const props = omitObjectKeys((this.componentProps), ['className', 'children', 'checked'])
    return (
      <DropdownMenuPrimitive.CheckboxItem
        data-slot="dropdown-menu-checkbox-item"
        className={cn(
          "focus:bg-accent focus:text-accent-foreground relative flex cursor-default select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          className
        )}
        checked={checked}
        {...props}
      >
        <span className="absolute left-2 flex size-3.5 items-center justify-center">
          <DropdownMenuPrimitive.ItemIndicator>
            <Check className="size-4" />
          </DropdownMenuPrimitive.ItemIndicator>
        </span>
        {children}
      </DropdownMenuPrimitive.CheckboxItem>
    )
  }
}

class DropdownMenuRadioItem extends Component<ComponentProps<typeof DropdownMenuPrimitive.RadioItem>> {
  render() {
    const className = (this.componentProps).className
    const children = (this.componentProps).children
    const props = omitObjectKeys((this.componentProps), ['className', 'children'])
    return (
      <DropdownMenuPrimitive.RadioItem
        data-slot="dropdown-menu-radio-item"
        className={cn(
          "focus:bg-accent focus:text-accent-foreground relative flex cursor-default select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          className
        )}
        {...props}
      >
        <span className="absolute left-2 flex size-3.5 items-center justify-center">
          <DropdownMenuPrimitive.ItemIndicator>
            <Circle className="size-2 fill-current" />
          </DropdownMenuPrimitive.ItemIndicator>
        </span>
        {children}
      </DropdownMenuPrimitive.RadioItem>
    )
  }
}

class DropdownMenuLabel extends Component<ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}> {
  render() {
    const className = (this.componentProps).className
    const inset = (this.componentProps).inset
    const props = omitObjectKeys((this.componentProps), ['className', 'inset'])
    return (
      <DropdownMenuPrimitive.Label
        data-slot="dropdown-menu-label"
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

class DropdownMenuSeparator extends Component<ComponentProps<typeof DropdownMenuPrimitive.Separator>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <DropdownMenuPrimitive.Separator
        data-slot="dropdown-menu-separator"
        className={cn("bg-muted -mx-1 my-1 h-px", className)}
        {...props}
      />
    )
  }
}

class DropdownMenuShortcut extends Component<ComponentProps<"span">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <span
        data-slot="dropdown-menu-shortcut"
        className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
        {...props}
      />
    )
  }
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
