import { Component, ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class Skeleton extends Component<ComponentProps<"div">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <div
        data-slot="skeleton"
        className={cn("bg-primary/10 animate-pulse rounded-md", className)}
        {...props}
      />
    )
  }
}

export { Skeleton }
