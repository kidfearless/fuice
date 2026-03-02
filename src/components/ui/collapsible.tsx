import { Component, ComponentProps } from "react"
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

class Collapsible extends Component<ComponentProps<typeof CollapsiblePrimitive.Root>> {
  render() {
    return <CollapsiblePrimitive.Root data-slot="collapsible" {...this.componentProps} />
  }
}

class CollapsibleTrigger extends Component<ComponentProps<typeof CollapsiblePrimitive.Trigger>> {
  render() {
    return (
      <CollapsiblePrimitive.Trigger
        data-slot="collapsible-trigger"
        {...this.componentProps}
      />
    )
  }
}

class CollapsibleContent extends Component<ComponentProps<typeof CollapsiblePrimitive.Content>> {
  render() {
    return (
      <CollapsiblePrimitive.Content
        data-slot="collapsible-content"
        {...this.componentProps}
      />
    )
  }
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
