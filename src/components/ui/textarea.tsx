import { Component, ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class Textarea extends Component<ComponentProps<"textarea">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <textarea
        data-slot="textarea"
        className={cn(
          "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    )
  }
}

export { Textarea }
