import { Component, ComponentProps } from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class Drawer extends Component<ComponentProps<typeof DrawerPrimitive.Root> & {
  shouldScaleBackground?: boolean
}> {
  render() {
    const shouldScaleBackground = (this.componentProps).shouldScaleBackground ?? true
    const props = omitObjectKeys((this.componentProps), ['shouldScaleBackground'])
    return (
      <DrawerPrimitive.Root
        data-slot="drawer"
        shouldScaleBackground={shouldScaleBackground}
        {...props}
      />
    )
  }
}

class DrawerTrigger extends Component<ComponentProps<typeof DrawerPrimitive.Trigger>> {
  render() {
    return (
      <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...this.componentProps} />
    )
  }
}

class DrawerPortal extends Component<ComponentProps<typeof DrawerPrimitive.Portal>> {
  render() {
    return <DrawerPrimitive.Portal data-slot="drawer-portal" {...this.componentProps} />
  }
}

class DrawerOverlay extends Component<ComponentProps<typeof DrawerPrimitive.Overlay>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <DrawerPrimitive.Overlay
        data-slot="drawer-overlay"
        className={cn("fixed inset-0 z-50 bg-black/80", className)}
        {...props}
      />
    )
  }
}

class DrawerContent extends Component<ComponentProps<typeof DrawerPrimitive.Content>> {
  render() {
    const className = (this.componentProps).className
    const children = (this.componentProps).children
    const props = omitObjectKeys((this.componentProps), ['className', 'children'])
    return (
      <DrawerPortal>
        <DrawerOverlay />
        <DrawerPrimitive.Content
          data-slot="drawer-content"
          className={cn(
            "bg-background fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border",
            className
          )}
          {...props}
        >
          <div className="bg-muted mx-auto mt-4 h-2 w-[100px] rounded-full" />
          {children}
        </DrawerPrimitive.Content>
      </DrawerPortal>
    )
  }
}

class DrawerHeader extends Component<ComponentProps<"div">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <div
        data-slot="drawer-header"
        className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
        {...props}
      />
    )
  }
}

class DrawerFooter extends Component<ComponentProps<"div">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <div
        data-slot="drawer-footer"
        className={cn("mt-auto flex flex-col gap-2 p-4", className)}
        {...props}
      />
    )
  }
}

class DrawerTitle extends Component<ComponentProps<typeof DrawerPrimitive.Title>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <DrawerPrimitive.Title
        data-slot="drawer-title"
        className={cn(
          "text-lg font-semibold leading-none tracking-tight",
          className
        )}
        {...props}
      />
    )
  }
}

class DrawerDescription extends Component<ComponentProps<typeof DrawerPrimitive.Description>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <DrawerPrimitive.Description
        data-slot="drawer-description"
        className={cn("text-muted-foreground text-sm", className)}
        {...props}
      />
    )
  }
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
