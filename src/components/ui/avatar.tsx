import { Component, ComponentProps } from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class Avatar extends Component<ComponentProps<typeof AvatarPrimitive.Root>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <AvatarPrimitive.Root
        data-slot="avatar"
        className={cn(
          "relative flex size-10 shrink-0 overflow-hidden rounded-full",
          className
        )}
        {...props}
      />
    )
  }
}

class AvatarImage extends Component<ComponentProps<typeof AvatarPrimitive.Image>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <AvatarPrimitive.Image
        data-slot="avatar-image"
        className={cn("aspect-square size-full", className)}
        {...props}
      />
    )
  }
}

class AvatarFallback extends Component<ComponentProps<typeof AvatarPrimitive.Fallback>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <AvatarPrimitive.Fallback
        data-slot="avatar-fallback"
        className={cn(
          "bg-muted flex size-full items-center justify-center rounded-full",
          className
        )}
        {...props}
      />
    )
  }
}

export { Avatar, AvatarImage, AvatarFallback }
