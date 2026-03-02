import { Component, ComponentProps } from "react"
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu"
import { cva } from "class-variance-authority"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class NavigationMenu extends Component<ComponentProps<typeof NavigationMenuPrimitive.Root>> {
  render() {
    const className = (this.componentProps).className
    const children = (this.componentProps).children
    const props = omitObjectKeys((this.componentProps), ['className', 'children'])
    return (
      <NavigationMenuPrimitive.Root
        data-slot="navigation-menu"
        className={cn(
          "relative z-10 flex max-w-max flex-1 items-center justify-center",
          className
        )}
        {...props}
      >
        {children}
        <NavigationMenuViewport />
      </NavigationMenuPrimitive.Root>
    )
  }
}

class NavigationMenuList extends Component<ComponentProps<typeof NavigationMenuPrimitive.List>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <NavigationMenuPrimitive.List
        data-slot="navigation-menu-list"
        className={cn(
          "group flex flex-1 list-none items-center justify-center gap-1",
          className
        )}
        {...props}
      />
    )
  }
}

class NavigationMenuItem extends Component<ComponentProps<typeof NavigationMenuPrimitive.Item>> {
  render() {
    return (
      <NavigationMenuPrimitive.Item
        data-slot="navigation-menu-item"
        {...this.componentProps}
      />
    )
  }
}

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
)

class NavigationMenuTrigger extends Component<ComponentProps<typeof NavigationMenuPrimitive.Trigger>> {
  render() {
    const className = (this.componentProps).className
    const children = (this.componentProps).children
    const props = omitObjectKeys((this.componentProps), ['className', 'children'])
    return (
      <NavigationMenuPrimitive.Trigger
        data-slot="navigation-menu-trigger"
        className={cn(navigationMenuTriggerStyle(), "group", className)}
        {...props}
      >
        {children}
        <ChevronDown
          className="relative top-[1px] ml-1 size-3 transition duration-300 group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      </NavigationMenuPrimitive.Trigger>
    )
  }
}

class NavigationMenuContent extends Component<ComponentProps<typeof NavigationMenuPrimitive.Content>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <NavigationMenuPrimitive.Content
        data-slot="navigation-menu-content"
        className={cn(
          "data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 top-0 left-0 w-full md:absolute md:w-auto",
          className
        )}
        {...props}
      />
    )
  }
}

class NavigationMenuLink extends Component<ComponentProps<typeof NavigationMenuPrimitive.Link>> {
  render() {
    return (
      <NavigationMenuPrimitive.Link
        data-slot="navigation-menu-link"
        {...this.componentProps}
      />
    )
  }
}

class NavigationMenuViewport extends Component<ComponentProps<typeof NavigationMenuPrimitive.Viewport>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <div className={cn("absolute top-full left-0 flex justify-center")}>
        <NavigationMenuPrimitive.Viewport
          data-slot="navigation-menu-viewport"
          className={cn(
            "origin-top-center bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:zoom-in-90 data-[state=closed]:zoom-out-95 relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border shadow-lg md:w-[var(--radix-navigation-menu-viewport-width)]",
            className
          )}
          {...props}
        />
      </div>
    )
  }
}

class NavigationMenuIndicator extends Component<ComponentProps<typeof NavigationMenuPrimitive.Indicator>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <NavigationMenuPrimitive.Indicator
        data-slot="navigation-menu-indicator"
        className={cn(
          "data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=visible]:fade-in data-[state=hidden]:fade-out top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden",
          className
        )}
        {...props}
      >
        <div className="bg-border relative top-[60%] size-2 rotate-45 rounded-tl-sm shadow-md" />
      </NavigationMenuPrimitive.Indicator>
    )
  }
}

export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
}
