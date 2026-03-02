import { Component, ComponentProps } from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

class Toaster extends Component<ComponentProps<typeof Sonner>> {
  render() {
    return <ToasterWrapper {...this.componentProps} />
  }
}

function ToasterWrapper(props: ComponentProps<typeof Sonner>) {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ComponentProps<typeof Sonner>["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
