import { Component, ComponentProps } from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class Sheet extends Component<ComponentProps<typeof SheetPrimitive.Root>> {
  render() {
    return <SheetPrimitive.Root data-slot="sheet" {...this.componentProps} />
  }
}

class SheetTrigger extends Component<ComponentProps<typeof SheetPrimitive.Trigger>> {
  render() {
    return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...this.componentProps} />
  }
}

class SheetClose extends Component<ComponentProps<typeof SheetPrimitive.Close>> {
  render() {
    return <SheetPrimitive.Close data-slot="sheet-close" {...this.componentProps} />
  }
}

class SheetPortal extends Component<ComponentProps<typeof SheetPrimitive.Portal>> {
  render() {
    return <SheetPrimitive.Portal data-slot="sheet-portal" {...this.componentProps} />
  }
}

class SheetOverlay extends Component<ComponentProps<typeof SheetPrimitive.Overlay>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <SheetPrimitive.Overlay
        data-slot="sheet-overlay"
        className={cn(
          "bg-background/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 backdrop-blur-sm",
          className
        )}
        {...props}
      />
    )
  }
}

const sheetVariants = cva(
  "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 border-b",
        bottom:
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 border-t",
        left: "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
        right:
          "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface SheetContentProps
  extends ComponentProps<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

class SheetContent extends Component<SheetContentProps> {
  render() {
    const side = (this.componentProps).side ?? "right"
    const className = (this.componentProps).className
    const children = (this.componentProps).children
    const props = omitObjectKeys((this.componentProps), ['side', 'className', 'children'])
    return (
      <SheetPrimitive.Portal>
        <SheetOverlay />
        <SheetPrimitive.Content
          data-slot="sheet-content"
          className={cn(sheetVariants({ side }), className)}
          {...props}
        >
          {children}
          <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute right-4 top-4 rounded-md opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    )
  }
}

class SheetHeader extends Component<ComponentProps<"div">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <div
        data-slot="sheet-header"
        className={cn(
          "flex flex-col space-y-2 text-center sm:text-left",
          className
        )}
        {...props}
      />
    )
  }
}

class SheetFooter extends Component<ComponentProps<"div">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <div
        data-slot="sheet-footer"
        className={cn(
          "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
          className
        )}
        {...props}
      />
    )
  }
}

class SheetTitle extends Component<ComponentProps<typeof SheetPrimitive.Title>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <SheetPrimitive.Title
        data-slot="sheet-title"
        className={cn("text-foreground text-lg font-semibold", className)}
        {...props}
      />
    )
  }
}

class SheetDescription extends Component<ComponentProps<typeof SheetPrimitive.Description>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <SheetPrimitive.Description
        data-slot="sheet-description"
        className={cn("text-muted-foreground text-sm", className)}
        {...props}
      />
    )
  }
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetPortal,
  SheetOverlay,
}
