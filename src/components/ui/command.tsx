import { Component, ComponentProps } from "react"
import { Command as CommandPrimitive } from "cmdk"
import { SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { omitObjectKeys } from '@/lib/helpers'

class Command extends Component<ComponentProps<typeof CommandPrimitive>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <CommandPrimitive
        data-slot="command"
        className={cn(
          "bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md",
          className
        )}
        {...props}
      />
    )
  }
}

class CommandDialog extends Component<ComponentProps<typeof Dialog>> {
  render() {
    const children = (this.componentProps).children
    const props = omitObjectKeys((this.componentProps), ['children'])
    return (
      <Dialog {...props}>
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
          <DialogDescription>Search for commands and settings</DialogDescription>
        </DialogHeader>
        <DialogContent className="overflow-hidden p-0">
          <Command className="[&_[cmdk-group-heading]]:text-muted-foreground **:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
            {children}
          </Command>
        </DialogContent>
      </Dialog>
    )
  }
}

class CommandInput extends Component<ComponentProps<typeof CommandPrimitive.Input>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <div
        data-slot="command-input-wrapper"
        className="flex items-center border-b px-3"
      >
        <SearchIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <CommandPrimitive.Input
          data-slot="command-input"
          className={cn(
            "placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
      </div>
    )
  }
}

class CommandList extends Component<ComponentProps<typeof CommandPrimitive.List>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <CommandPrimitive.List
        data-slot="command-list"
        className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
        {...props}
      />
    )
  }
}

class CommandEmpty extends Component<ComponentProps<typeof CommandPrimitive.Empty>> {
  render() {
    return (
      <CommandPrimitive.Empty
        data-slot="command-empty"
        className="py-6 text-center text-sm"
        {...this.componentProps}
      />
    )
  }
}

class CommandGroup extends Component<ComponentProps<typeof CommandPrimitive.Group>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <CommandPrimitive.Group
        data-slot="command-group"
        className={cn(
          "text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
          className
        )}
        {...props}
      />
    )
  }
}

class CommandSeparator extends Component<ComponentProps<typeof CommandPrimitive.Separator>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <CommandPrimitive.Separator
        data-slot="command-separator"
        className={cn("bg-border -mx-1 h-px", className)}
        {...props}
      />
    )
  }
}

class CommandItem extends Component<ComponentProps<typeof CommandPrimitive.Item>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <CommandPrimitive.Item
        data-slot="command-item"
        className={cn(
          "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
          className
        )}
        {...props}
      />
    )
  }
}

class CommandShortcut extends Component<ComponentProps<"span">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <span
        data-slot="command-shortcut"
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
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
