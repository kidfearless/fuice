import { Component, ComponentProps } from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { omitObjectKeys } from '@/lib/helpers'

class AlertDialog extends Component<ComponentProps<typeof AlertDialogPrimitive.Root>> {
  render() {
    return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...this.componentProps} />
  }
}

class AlertDialogTrigger extends Component<ComponentProps<typeof AlertDialogPrimitive.Trigger>> {
  render() {
    return (
      <AlertDialogPrimitive.Trigger
        data-slot="alert-dialog-trigger"
        {...this.componentProps}
      />
    )
  }
}

class AlertDialogPortal extends Component<ComponentProps<typeof AlertDialogPrimitive.Portal>> {
  render() {
    return (
      <AlertDialogPrimitive.Portal
        data-slot="alert-dialog-portal"
        {...this.componentProps}
      />
    )
  }
}

class AlertDialogOverlay extends Component<ComponentProps<typeof AlertDialogPrimitive.Overlay>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <AlertDialogPrimitive.Overlay
        data-slot="alert-dialog-overlay"
        className={cn(
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80",
          className
        )}
        {...props}
      />
    )
  }
}

class AlertDialogContent extends Component<ComponentProps<typeof AlertDialogPrimitive.Content>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <AlertDialogPortal>
        <AlertDialogOverlay />
        <AlertDialogPrimitive.Content
          data-slot="alert-dialog-content"
          className={cn(
            "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
            className
          )}
          {...props}
        />
      </AlertDialogPortal>
    )
  }
}

class AlertDialogHeader extends Component<ComponentProps<"div">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <div
        data-slot="alert-dialog-header"
        className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
        {...props}
      />
    )
  }
}

class AlertDialogFooter extends Component<ComponentProps<"div">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <div
        data-slot="alert-dialog-footer"
        className={cn(
          "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
          className
        )}
        {...props}
      />
    )
  }
}

class AlertDialogTitle extends Component<ComponentProps<typeof AlertDialogPrimitive.Title>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <AlertDialogPrimitive.Title
        data-slot="alert-dialog-title"
        className={cn("text-lg font-semibold", className)}
        {...props}
      />
    )
  }
}

class AlertDialogDescription extends Component<ComponentProps<typeof AlertDialogPrimitive.Description>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <AlertDialogPrimitive.Description
        data-slot="alert-dialog-description"
        className={cn("text-muted-foreground text-sm", className)}
        {...props}
      />
    )
  }
}

class AlertDialogAction extends Component<ComponentProps<typeof AlertDialogPrimitive.Action>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <AlertDialogPrimitive.Action
        data-slot="alert-dialog-action"
        className={cn(buttonVariants(), className)}
        {...props}
      />
    )
  }
}

class AlertDialogCancel extends Component<ComponentProps<typeof AlertDialogPrimitive.Cancel>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <AlertDialogPrimitive.Cancel
        data-slot="alert-dialog-cancel"
        className={cn(buttonVariants({ variant: "outline" }), className)}
        {...props}
      />
    )
  }
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
