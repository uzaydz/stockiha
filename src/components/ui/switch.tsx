import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, size = 'default', variant = 'default', ...props }, ref) => {
  const sizeClasses = {
    sm: "h-5 w-9",
    default: "h-6 w-11", 
    lg: "h-7 w-14"
  }
  
  const thumbSizeClasses = {
    sm: "h-4 w-4",
    default: "h-5 w-5",
    lg: "h-6 w-6"
  }
  
  const translateClasses = {
    sm: {
      checked: "translate-x-4",
      unchecked: "translate-x-0",
      checkedRtl: "translate-x-0", 
      uncheckedRtl: "translate-x-4"
    },
    default: {
      checked: "translate-x-5",
      unchecked: "translate-x-0",
      checkedRtl: "translate-x-0",
      uncheckedRtl: "translate-x-5"
    },
    lg: {
      checked: "translate-x-7",
      unchecked: "translate-x-0", 
      checkedRtl: "translate-x-0",
      uncheckedRtl: "translate-x-7"
    }
  }
  
  const variantClasses = {
    default: "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
    success: "data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-input",
    warning: "data-[state=checked]:bg-yellow-500 data-[state=unchecked]:bg-input", 
    danger: "data-[state=checked]:bg-red-500 data-[state=unchecked]:bg-input"
  }

  return (
    <SwitchPrimitives.Root
      className={cn(
        // الأساسيات
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
        // التحولات والتأثيرات
        "transition-all duration-300 ease-in-out",
        // التركيز والحالات
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // تأثيرات التحويم
        "hover:shadow-md hover:scale-105 active:scale-95",
        // الحجم والمظهر
        sizeClasses[size],
        variantClasses[variant],
        // تحسينات إضافية
        "shadow-inner backdrop-blur-sm",
        "data-[state=checked]:shadow-lg data-[state=checked]:shadow-primary/25",
        className
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          // الأساسيات
          "pointer-events-none block rounded-full bg-background ring-0",
          // الظل والتأثيرات
          "shadow-xl drop-shadow-md backdrop-blur-sm",
          // التحولات
          "transition-all duration-300 ease-in-out",
          // الحجم
          thumbSizeClasses[size],
          // الحركة العادية (LTR)
          `data-[state=checked]:${translateClasses[size].checked}`,
          `data-[state=unchecked]:${translateClasses[size].unchecked}`,
          // الحركة العربية (RTL) - إصلاح الاتجاه
          `rtl:data-[state=checked]:${translateClasses[size].checkedRtl}`,
          `rtl:data-[state=unchecked]:${translateClasses[size].uncheckedRtl}`,
          `[dir='rtl'] &:data-[state=checked]:${translateClasses[size].checkedRtl}`,
          `[dir='rtl'] &:data-[state=unchecked]:${translateClasses[size].uncheckedRtl}`,
          // تأثيرات إضافية
          "data-[state=checked]:bg-white data-[state=checked]:shadow-primary/20",
          "hover:shadow-xl active:scale-90"
        )}
      />
    </SwitchPrimitives.Root>
  )
})
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
