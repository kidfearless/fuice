import { Component, ComponentProps } from "react"
import { OTPInput, OTPInputContext } from "input-otp"
import { MinusIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { omitObjectKeys } from '@/lib/helpers'

class InputOTP extends Component<ComponentProps<typeof OTPInput>> {
  render() {
    const className = (this.componentProps).className
    const containerClassName = (this.componentProps).containerClassName
    const props = omitObjectKeys((this.componentProps), ['className', 'containerClassName'])
    return (
      <OTPInput
        data-slot="input-otp"
        containerClassName={cn(
          "flex items-center gap-2 has-disabled:opacity-50",
          containerClassName
        )}
        className={cn("disabled:cursor-not-allowed", className)}
        {...props}
      />
    )
  }
}

class InputOTPGroup extends Component<ComponentProps<"div">> {
  render() {
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['className'])
    return (
      <div
        data-slot="input-otp-group"
        className={cn("flex items-center", className)}
        {...props}
      />
    )
  }
}

class InputOTPSlot extends Component<ComponentProps<"div"> & { index: number }> {
  static contextType = OTPInputContext
  render() {
    const index = (this.componentProps).index
    const className = (this.componentProps).className
    const props = omitObjectKeys((this.componentProps), ['index', 'className'])
    const context = this.context as {
      slots?: Array<{
        char?: string
        hasFakeCaret?: boolean
        isActive?: boolean
      }>
    }
    const slot = context?.slots?.[index] ?? {}
    const { char, hasFakeCaret, isActive } = slot

    return (
      <div
        data-slot="input-otp-slot"
        data-active={isActive}
        className={cn(
          "border-input data-[active=true]:border-ring data-[active=true]:ring-ring/50 relative flex size-9 items-center justify-center border-y border-r text-sm shadow-xs transition-all first:rounded-l-md first:border-l last:rounded-r-md data-[active=true]:z-10 data-[active=true]:ring-[3px]",
          className
        )}
        {...props}
      >
        {char}
        {hasFakeCaret && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="animate-caret-blink bg-foreground h-4 w-px duration-1000" />
          </div>
        )}
      </div>
    )
  }
}

class InputOTPSeparator extends Component<ComponentProps<"div">> {
  render() {
    return (
      <div data-slot="input-otp-separator" role="separator" {...this.componentProps}>
        <MinusIcon />
      </div>
    )
  }
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
