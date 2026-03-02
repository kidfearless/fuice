import { Component, ComponentProps } from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { CircleIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class RadioGroup extends Component<ComponentProps<typeof RadioGroupPrimitive.Root>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <RadioGroupPrimitive.Root
        data-slot="radio-group"
        className={cn("grid gap-2", className)}
        {...props}
      />
    )
  }
}

class RadioGroupItem extends Component<ComponentProps<typeof RadioGroupPrimitive.Item>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <RadioGroupPrimitive.Item
        data-slot="radio-group-item"
        className={cn(
          "border-input focus-visible:ring-ring aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive shadow-sm aspect-square size-4 shrink-0 rounded-full border transition-shadow focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        <RadioGroupPrimitive.Indicator
          data-slot="radio-group-indicator"
          className="flex items-center justify-center"
        >
          <CircleIcon className="fill-primary size-2" />
        </RadioGroupPrimitive.Indicator>
      </RadioGroupPrimitive.Item>
    )
  }
}

export { RadioGroup, RadioGroupItem }
