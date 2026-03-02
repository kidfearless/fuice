import { Component, ComponentProps, ReactNode } from "react"
import { Slot } from "@radix-ui/react-slot"
import { ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class Breadcrumb extends Component<ComponentProps<"nav"> & { separator?: ReactNode }> {
  render() {
    return <nav data-slot="breadcrumb" aria-label="breadcrumb" {...this.componentProps} />
  }
}

class BreadcrumbList extends Component<ComponentProps<"ol">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <ol
        data-slot="breadcrumb-list"
        className={cn(
          "text-muted-foreground flex flex-wrap items-center gap-1.5 break-words text-sm sm:gap-2.5",
          className
        )}
        {...props}
      />
    )
  }
}

class BreadcrumbItem extends Component<ComponentProps<"li">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <li
        data-slot="breadcrumb-item"
        className={cn("inline-flex items-center gap-1.5", className)}
        {...props}
      />
    )
  }
}

class BreadcrumbLink extends Component<ComponentProps<"a"> & { asChild?: boolean }> {
  render() {
    const asChild = (this.componentProps).asChild
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['asChild', 'className'])
    const Comp = asChild ? Slot : "a"
    return (
      <Comp
        data-slot="breadcrumb-link"
        className={cn("hover:text-foreground transition-colors", className)}
        {...props}
      />
    )
  }
}

class BreadcrumbPage extends Component<ComponentProps<"span">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <span
        data-slot="breadcrumb-page"
        role="link"
        aria-disabled="true"
        aria-current="page"
        className={cn("text-foreground font-normal", className)}
        {...props}
      />
    )
  }
}

class BreadcrumbSeparator extends Component<ComponentProps<"li">> {
  render() {
    const children = (this.componentProps).children
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['children', 'className'])
    return (
      <li
        data-slot="breadcrumb-separator"
        role="presentation"
        aria-hidden="true"
        className={cn("[&>svg]:size-3.5", className)}
        {...props}
      >
        {children ?? <ChevronRight />}
      </li>
    )
  }
}

class BreadcrumbEllipsis extends Component<ComponentProps<"span">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <span
        data-slot="breadcrumb-ellipsis"
        role="presentation"
        aria-hidden="true"
        className={cn("flex size-9 items-center justify-center", className)}
        {...props}
      >
        <MoreHorizontal className="size-4" />
        <span className="sr-only">More</span>
      </span>
    )
  }
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
}
