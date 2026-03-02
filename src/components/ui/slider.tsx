import { Component, ComponentProps } from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class Slider extends Component<ComponentProps<typeof SliderPrimitive.Root>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <SliderPrimitive.Root
        data-slot="slider"
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          className
        )}
        {...props}
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="bg-primary/20 relative h-1.5 w-full grow overflow-hidden rounded-full"
        >
          <SliderPrimitive.Range
            data-slot="slider-range"
            className="bg-primary absolute h-full"
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          className="border-primary bg-background focus-visible:ring-ring block size-4 rounded-full border shadow transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        />
      </SliderPrimitive.Root>
    )
  }
}

export { Slider }
