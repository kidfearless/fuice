import { Component, ComponentProps } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit shrink-0 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&>svg]:size-3 [&>svg]:shrink-0 gap-1",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90",
        outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

class Badge extends Component<ComponentProps<"span"> & VariantProps<typeof badgeVariants>> {
  render() {
    const className = (this.componentProps).className
    const variant = (this.componentProps).variant
    const props = omitObjectKeys((this.componentProps), ['className', 'variant'])
    return (
      <span
        data-slot="badge"
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      />
    )
  }
}

export { Badge, badgeVariants }
