import { Component, ComponentProps } from "react"
import { GripVerticalIcon } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class ResizablePanelGroup extends Component<ComponentProps<typeof ResizablePrimitive.PanelGroup>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <ResizablePrimitive.PanelGroup
        data-slot="resizable-panel-group"
        className={cn(
          "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
          className
        )}
        {...props}
      />
    )
  }
}

class ResizablePanel extends Component<ComponentProps<typeof ResizablePrimitive.Panel>> {
  render() {
    return <ResizablePrimitive.Panel data-slot="resizable-panel" {...this.componentProps} />
  }
}

class ResizableHandle extends Component<ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & { withHandle?: boolean }> {
  render() {
    const withHandle = (this.componentProps).withHandle
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['withHandle', 'className'])
    return (
      <ResizablePrimitive.PanelResizeHandle
        data-slot="resizable-handle"
        className={cn(
          "bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-[3px] focus-visible:outline-none data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
          className
        )}
        {...props}
      >
        {withHandle && (
          <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-sm border">
            <GVerticalIcon className="size-2.5" />
          </div>
        )}
      </ResizablePrimitive.PanelResizeHandle>
    )
  }
}

const GVerticalIcon = GripVerticalIcon

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
