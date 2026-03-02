import { Component, ComponentProps } from "react"
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio"

class AspectRatio extends Component<ComponentProps<typeof AspectRatioPrimitive.Root>> {
  render() {
    return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...this.componentProps} />
  }
}

export { AspectRatio }
