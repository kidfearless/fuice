import { Component, ComponentProps } from "react"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class Input extends Component<ComponentProps<"input">> {
  render() {
    const className = (this.componentProps).className
    const type = (this.componentProps).type
    const props = omitObjectKeys((this.componentProps), ['className', 'type'])
    return (
      <input
        data-slot="input"
        type={type}
        className={cn(
          "border-input file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-[3px] selection:bg-primary selection:text-primary-foreground",
          className
        )}
        {...props}
      />
    )
  }
}

export { Input }
