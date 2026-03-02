import { Component, ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class Table extends Component<ComponentProps<"table">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <div className="relative w-full overflow-auto">
        <table
          data-slot="table"
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        />
      </div>
    )
  }
}

class TableHeader extends Component<ComponentProps<"thead">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <thead
        data-slot="table-header"
        className={cn("[&_tr]:border-b", className)}
        {...props}
      />
    )
  }
}

class TableBody extends Component<ComponentProps<"tbody">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <tbody
        data-slot="table-body"
        className={cn("[&_tr:last-child]:border-0", className)}
        {...props}
      />
    )
  }
}

class TableFooter extends Component<ComponentProps<"tfoot">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <tfoot
        data-slot="table-footer"
        className={cn(
          "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
          className
        )}
        {...props}
      />
    )
  }
}

class TableRow extends Component<ComponentProps<"tr">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <tr
        data-slot="table-row"
        className={cn(
          "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
          className
        )}
        {...props}
      />
    )
  }
}

class TableHead extends Component<ComponentProps<"th">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <th
        data-slot="table-head"
        className={cn(
          "text-muted-foreground h-12 px-4 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0",
          className
        )}
        {...props}
      />
    )
  }
}

class TableCell extends Component<ComponentProps<"td">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <td
        data-slot="table-cell"
        className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
        {...props}
      />
    )
  }
}

class TableCaption extends Component<ComponentProps<"caption">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <caption
        data-slot="table-caption"
        className={cn("text-muted-foreground mt-4 text-sm", className)}
        {...props}
      />
    )
  }
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
