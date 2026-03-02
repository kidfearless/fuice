import { Component, ComponentProps, createContext } from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { toggleVariants } from "@/components/ui/toggle"
import { omitObjectKeys } from '@/lib/helpers'

const ToggleGroupContext = createContext<VariantProps<typeof toggleVariants>>({
  size: "default",
  variant: "default",
})

class ToggleGroup extends Component<
  ComponentProps<typeof ToggleGroupPrimitive.Root> &
    VariantProps<typeof toggleVariants>
> {
  render() {
    const className = (this.componentProps).className
    const variant = (this.componentProps).variant
    const size = (this.componentProps).size
    const children = (this.componentProps).children
    const props = omitObjectKeys((this.componentProps), ['className', 'variant', 'size', 'children'])
    return (
      <ToggleGroupPrimitive.Root
        data-slot="toggle-group"
        className={cn("flex items-center justify-center gap-1", className)}
        {...props}
      >
        <ToggleGroupContext.Provider value={{ variant, size }}>
          {children}
        </ToggleGroupContext.Provider>
      </ToggleGroupPrimitive.Root>
    )
  }
}

class ToggleGroupItem extends Component<
  ComponentProps<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleVariants>
> {
  static contextType = ToggleGroupContext
  declare context: VariantProps<typeof toggleVariants>

  render() {
    const className = (this.componentProps).className
    const children = (this.componentProps).children
    const variant = (this.componentProps).variant
    const size = (this.componentProps).size
    const props = omitObjectKeys((this.componentProps), ['className', 'children', 'variant', 'size'])
    const contextVariant = this.context.variant
    const contextSize = this.context.size

    return (
      <ToggleGroupPrimitive.Item
        data-slot="toggle-group-item"
        className={cn(
          toggleVariants({
            variant: contextVariant || variant,
            size: contextSize || size,
          }),
          className
        )}
        {...props}
      >
        {children}
      </ToggleGroupPrimitive.Item>
    )
  }
}

export { ToggleGroup, ToggleGroupItem }
