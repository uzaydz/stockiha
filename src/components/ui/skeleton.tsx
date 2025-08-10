import { cn } from "@/lib/utils"
import React from "react"

const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("animate-pulse rounded-md bg-muted transform-gpu", className)}
    style={{ contain: 'layout' }}
    {...props}
  />
))

export { Skeleton }
