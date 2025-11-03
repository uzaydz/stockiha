import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

// اكتشاف بيئة Electron لتعطيل الـ Tooltip لتفادي حلقات التحديث في بعض البيئات
const isElectron = typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron')
const envFlag = String((import.meta as any)?.env?.VITE_DISABLE_TOOLTIPS ?? '').toLowerCase() === 'true'
const DISABLE_TOOLTIPS = isElectron || envFlag

let TooltipProvider: any
let Tooltip: any
let TooltipTrigger: any
let TooltipContent: any

if (DISABLE_TOOLTIPS) {
  // وضع مبسط: لا يُنشئ أي حالة داخلية ولا يستخدم Radix
  TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>
  Tooltip = ({ children }: { children: React.ReactNode }) => <>{children}</>
  TooltipTrigger = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<'span'>>(({ children, ...props }, ref) => {
    // لا تمرر asChild لبنية الطفل لتجنب تسربه إلى عناصر DOM/مكونات أخرى
    const { asChild: _omitAsChild, ...rest } = (props as any) || {}
    if (React.isValidElement(children)) {
      return React.cloneElement(children as any, { ref, ...rest })
    }
    return <span ref={ref as any} {...rest}>{children}</span>
  })
  TooltipTrigger.displayName = 'TooltipTrigger'
  TooltipContent = React.forwardRef(() => null)
  TooltipContent.displayName = 'TooltipContent'
} else {
  TooltipProvider = TooltipPrimitive.Provider
  Tooltip = TooltipPrimitive.Root
  TooltipTrigger = TooltipPrimitive.Trigger
  TooltipContent = React.forwardRef<
    React.ElementRef<typeof TooltipPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
  >(({ className, sideOffset = 4, ...props }, ref) => (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 transform-gpu",
        className
      )}
      style={{ contain: 'layout', willChange: 'transform' }}
      {...props}
    />
  ))
  TooltipContent.displayName = TooltipPrimitive.Content.displayName
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
