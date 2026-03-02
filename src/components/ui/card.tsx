import { Component, ComponentProps } from "react"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class Card extends Component<ComponentProps<"div">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <div
        data-slot="card"
        className={cn(
          "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
          className
        )}
        {...props}
      />
    )
  }
}

class CardHeader extends Component<ComponentProps<"div">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <div
        data-slot="card-header"
        className={cn(
          "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
          className
        )}
        {...props}
      />
    )
  }
}

class CardTitle extends Component<ComponentProps<"div">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <div
        data-slot="card-title"
        className={cn("leading-none font-semibold", className)}
        {...props}
      />
    )
  }
}

class CardDescription extends Component<ComponentProps<"div">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <div
        data-slot="card-description"
        className={cn("text-muted-foreground text-sm", className)}
        {...props}
      />
    )
  }
}

class CardAction extends Component<ComponentProps<"div">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <div
        data-slot="card-action"
        className={cn(
          "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
          className
        )}
        {...props}
      />
    )
  }
}

class CardContent extends Component<ComponentProps<"div">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <div
        data-slot="card-content"
        className={cn("px-6", className)}
        {...props}
      />
    )
  }
}

class CardFooter extends Component<ComponentProps<"div">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <div
        data-slot="card-footer"
        className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
        {...props}
      />
    )
  }
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
