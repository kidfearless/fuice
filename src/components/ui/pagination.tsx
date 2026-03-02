import { Component, ComponentProps } from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { omitObjectKeys } from '@/lib/helpers'

class Pagination extends Component<ComponentProps<"nav">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <nav
        data-slot="pagination"
        role="navigation"
        aria-label="pagination"
        className={cn("mx-auto flex w-full justify-center", className)}
        {...props}
      />
    )
  }
}

class PaginationContent extends Component<ComponentProps<"ul">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <ul
        data-slot="pagination-content"
        className={cn("flex flex-row items-center gap-1", className)}
        {...props}
      />
    )
  }
}

class PaginationItem extends Component<ComponentProps<"li">> {
  render() {
    return <li data-slot="pagination-item" {...this.componentProps} />
  }
}

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<ComponentProps<typeof Button>, "size"> &
  ComponentProps<"a">

class PaginationLink extends Component<PaginationLinkProps> {
  render() {
    const className = (this.componentProps).className
    const isActive = (this.componentProps).isActive
    const size = (this.componentProps).size ?? "icon"
    const props = omitObjectKeys((this.componentProps), ['className', 'isActive', 'size'])
    return (
      <a
        data-slot="pagination-link"
        aria-current={isActive ? "page" : undefined}
        className={cn(
          buttonVariants({
            variant: isActive ? "outline" : "ghost",
            size,
          }),
          className
        )}
        {...props}
      />
    )
  }
}

class PaginationPrevious extends Component<ComponentProps<typeof PaginationLink>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <PaginationLink
        aria-label="Go to previous page"
        size="default"
        className={cn("gap-1 pl-2.5", className)}
        {...props}
      >
        <ChevronLeft className="size-4" />
        <span>Previous</span>
      </PaginationLink>
    )
  }
}

class PaginationNext extends Component<ComponentProps<typeof PaginationLink>> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <PaginationLink
        aria-label="Go to next page"
        size="default"
        className={cn("gap-1 pr-2.5", className)}
        {...props}
      >
        <span>Next</span>
        <ChevronRight className="size-4" />
      </PaginationLink>
    )
  }
}

class PaginationEllipsis extends Component<ComponentProps<"span">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <span
        data-slot="pagination-ellipsis"
        aria-hidden
        className={cn("flex size-9 items-center justify-center", className)}
        {...props}
      >
        <MoreHorizontal className="size-4" />
        <span className="sr-only">More pages</span>
      </span>
    )
  }
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
