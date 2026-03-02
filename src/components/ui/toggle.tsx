import { Component, ComponentProps } from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

const toggleVariants = cva(
  "ring-offset-background hover:bg-muted hover:text-muted-foreground focus-visible:ring-ring data-[state=on]:bg-accent data-[state=on]:text-accent-foreground inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border-input hover:bg-accent hover:text-accent-foreground border bg-transparent",
      },
      size: {
        default: "h-10 px-3",
        sm: "h-9 px-2.5",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

class Toggle extends Component<
  ComponentProps<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
> {
  render() {
    const className = (this.componentProps).className
    const variant = (this.componentProps).variant
    const size = (this.componentProps).size
    const props = omitObjectKeys((this.componentProps), ['className', 'variant', 'size'])
    return (
      <TogglePrimitive.Root
        data-slot="toggle"
        className={cn(toggleVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
}

export { Toggle, toggleVariants }
