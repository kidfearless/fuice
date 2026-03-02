import { Component, ComponentProps } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground shadow-sm",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

class Alert extends Component<ComponentProps<"div"> & VariantProps<typeof alertVariants>> {
  render() {
    const className = (this.componentProps).className
    const variant = (this.componentProps).variant
    const props = omitObjectKeys((this.componentProps), ['className', 'variant'])
    return (
      <div
        data-slot="alert"
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      />
    )
  }
}

class AlertTitle extends Component<ComponentProps<"div">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <div
        data-slot="alert-title"
        className={cn("mb-1 font-medium leading-none tracking-tight", className)}
        {...props}
      />
    )
  }
}

class AlertDescription extends Component<ComponentProps<"div">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <div
        data-slot="alert-description"
        className={cn("text-muted-foreground text-sm [&_p]:leading-relaxed", className)}
        {...props}
      />
    )
  }
}

export { Alert, AlertTitle, AlertDescription }
