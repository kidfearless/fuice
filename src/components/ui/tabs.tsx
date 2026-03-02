import { Component, ComponentProps } from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class Tabs extends Component<ComponentProps<typeof TabsPrimitive.Root>> {
  render() {
    return <TabsPrimitive.Root data-slot="tabs" {...this.componentProps} />
  }
}

class TabsList extends Component<ComponentProps<typeof TabsPrimitive.List>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <TabsPrimitive.List
        data-slot="tabs-list"
        className={cn(
          "bg-muted text-muted-foreground inline-flex h-10 items-center justify-center rounded-md p-1",
          className
        )}
        {...props}
      />
    )
  }
}

class TabsTrigger extends Component<ComponentProps<typeof TabsPrimitive.Trigger>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <TabsPrimitive.Trigger
        data-slot="tabs-trigger"
        className={cn(
          "ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm",
          className
        )}
        {...props}
      />
    )
  }
}

class TabsContent extends Component<ComponentProps<typeof TabsPrimitive.Content>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <TabsPrimitive.Content
        data-slot="tabs-content"
        className={cn(
          "ring-offset-background focus-visible:ring-ring mt-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          className
        )}
        {...props}
      />
    )
  }
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
