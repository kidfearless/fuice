/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import {
  Component,
  ComponentProps,
  createContext,
  useContext,
  useId,
  useMemo,
} from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

// Format: { [key: string]: { label?: string; icon?: React.ComponentType; color?: string; theme?: Record<string, string> } }
export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<string, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = createContext<ChartContextProps | null>(null)

function useChart() {
  const context = useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

class ChartContainer extends Component<ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ReactNode
}> {
  render() {
    return <ChartContainerWrapper {...this.componentProps} />
  }
}

function ChartContainerWrapper({
  id,
  className,
  children,
  config,
  ...props
}: ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ReactNode
}) {
  const uniqueId = useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-area]:fill-opacity-10 [&_.recharts-curve.recharts-area]:stroke-width-2 [&_.recharts-dot]:fill-background [&_.recharts-dot]:stroke-width-2 [&_.recharts-grid-vertical_line]:display-none [&_.recharts-layer]:outline-none [&_.recharts-polar-grid-concentric-polygon]:fill-muted/20 [&_.recharts-polar-grid-concentric-polygon]:stroke-none [&_.recharts-polar-grid-radial_line]:stroke-muted [&_.recharts-sector]:outline-none [&_.recharts-sector.recharts-pie-sector]:stroke-background [&_.recharts-sector.recharts-pie-sector]:stroke-width-2 [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

class ChartStyle extends Component<{ id: string; config: ChartConfig }> {
  render() {
    const id = (this.componentProps).id
    const config = (this.componentProps).config
    const colorConfig = Object.entries(config).filter(
      ([_, config]) => config.theme || config.color
    )

    if (!colorConfig.length) {
      return null
    }

    return (
      <style
        dangerouslySetInnerHTML={{
          __html: Object.entries(THEMES)
            .map(
              ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`
            )
            .join("\n"),
        }}
      />
    )
  }
}

const THEMES = { light: "", dark: ".dark" } as const

class ChartTooltip extends RechartsPrimitive.Tooltip {
  render() {
    return <RechartsPrimitive.Tooltip {...this.componentProps} />
  }
}

class ChartTooltipContent extends Component<ComponentProps<typeof RechartsPrimitive.Tooltip> &
  ComponentProps<"div"> & {
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: "line" | "dot" | "dashed"
    nameKey?: string
    labelKey?: string
  }
> {
  // Skipping complex internal formatting logic but providing the base class implementation.
  static contextType = ChartContext
  render() {
    return <ChartTooltipContentWrapper {...this.componentProps} config={(this.context as ChartContextProps).config} />
  }
}

function ChartTooltipContentWrapper({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
  config,
}: any) {
  // Wrapper for payload processing logic which is functional heavy.
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
    >
      <div className="grid gap-1.5">
        {payload.map((item: any, index: number) => {
          const key = `${nameKey || item.name || item.dataKey || "value"}`
          const itemConfig = config[key]
          const indicatorColor = color || item.payload.fill || item.color

          return (
            <div
              key={item.dataKey || index}
              className={cn(
                "flex w-full items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                indicator === "dot" && "items-center"
              )}
            >
              {itemConfig?.icon ? (
                <itemConfig.icon />
              ) : (
                !hideIndicator && (
                  <div
                    className={cn(
                      "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                      {
                        "h-2.5 w-2.5": indicator === "dot",
                        "w-1": indicator === "line",
                        "w-0 border-l-2 border-dashed bg-transparent":
                          indicator === "dashed",
                        "my-0.5": indicator === "dashed",
                      }
                    )}
                    style={
                      {
                        "--color-bg": indicatorColor,
                        "--color-border": indicatorColor,
                      } as React.CSSProperties
                    }
                  />
                )
              )}
              <div
                className={cn(
                  "flex flex-1 justify-between leading-none",
                  indicator === "dashed" ? "items-end" : "items-center"
                )}
              >
                <div className="grid gap-1.5">
                  <span className="text-muted-foreground">
                    {itemConfig?.label || item.name}
                  </span>
                </div>
                {item.value && (
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {item.value.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

class ChartLegend extends RechartsPrimitive.Legend {
  render() {
    return <RechartsPrimitive.Legend {...this.componentProps} />
  }
}

class ChartLegendContent extends Component<ComponentProps<typeof RechartsPrimitive.Legend> &
  ComponentProps<"div"> & {
    hideIcon?: boolean
    nameKey?: string
  }
> {
  static contextType = ChartContext
  render() {
    return <ChartLegendContentWrapper {...this.componentProps} config={(this.context as ChartContextProps).config} />
  }
}

function ChartLegendContentWrapper({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
  config,
}: any) {
  if (!payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {payload.map((item: any, index: number) => {
        const key = `${nameKey || item.dataKey || "value"}`
        const itemConfig = config[key as keyof typeof config]

        return (
          <div
            key={item.value}
            className={cn(
              "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
            )}
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: item.color,
                }}
              />
            )}
            {itemConfig?.label || item.value}
          </div>
        )
      })}
    </div>
  )
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
