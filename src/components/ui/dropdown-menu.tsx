import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

// Root component with performance optimizations
const DropdownMenu = React.memo(DropdownMenuPrimitive.Root)

// Trigger component with GPU acceleration
const DropdownMenuTrigger = React.memo(React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  const memoizedClassName = React.useMemo(() => 
    cn("transform-gpu", className),
    [className]
  )

  return (
    <DropdownMenuPrimitive.Trigger
      ref={ref}
      className={memoizedClassName}
      style={{ 
        willChange: 'transform',
        contain: 'layout paint',
      }}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Trigger>
  )
}))
DropdownMenuTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName

// Group component
const DropdownMenuGroup = React.memo(DropdownMenuPrimitive.Group)

// Portal component
const DropdownMenuPortal = React.memo(DropdownMenuPrimitive.Portal)

// Sub components
const DropdownMenuSub = React.memo(DropdownMenuPrimitive.Sub)

const DropdownMenuRadioGroup = React.memo(DropdownMenuPrimitive.RadioGroup)

// SubTrigger component with performance optimizations
const DropdownMenuSubTrigger = React.memo(React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => {
  const memoizedClassName = React.useMemo(() => 
    cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent transform-gpu",
      inset && "pl-8",
      className
    ),
    [className, inset]
  )

  return (
    <DropdownMenuPrimitive.SubTrigger
      ref={ref}
      className={memoizedClassName}
      style={{ 
        willChange: 'transform',
        contain: 'layout paint',
      }}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto h-4 w-4" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}))
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName

// SubContent component with performance optimizations
const DropdownMenuSubContent = React.memo(React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => {
  const memoizedClassName = React.useMemo(() => 
    cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg transform-gpu",
      className
    ),
    [className]
  )

  return (
    <DropdownMenuPrimitive.SubContent
      ref={ref}
      className={memoizedClassName}
      style={{ 
        willChange: 'transform',
        contain: 'layout paint',
        contentVisibility: 'auto',
        transform: 'translateZ(0)', // Force GPU acceleration
      }}
      onOpenAutoFocus={(e) => e.preventDefault()}
      onCloseAutoFocus={(e) => e.preventDefault()}
      {...props}
    />
  )
}))
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName

// Content component with simplified performance optimizations
const DropdownMenuContent = React.memo(React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => {
  const memoizedClassName = React.useMemo(() => 
    cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
      className
    ),
    [className]
  )

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={memoizedClassName}
        avoidCollisions={false}
        collisionPadding={8}
        style={{ 
          contain: 'layout paint',
          transform: 'translateZ(0)',
          contentVisibility: 'auto',
        }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

// Menu item component with simplified performance optimizations
const DropdownMenuItem = React.memo(React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => {
  const memoizedClassName = React.useMemo(() => 
    cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className
    ),
    [className, inset]
  )

  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      className={memoizedClassName}
      style={{ 
        contain: 'paint',
      }}
      {...props}
    />
  )
}))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

// Checkbox item component with performance optimizations
const DropdownMenuCheckboxItem = React.memo(React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => {
  const memoizedClassName = React.useMemo(() => 
    cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transform-gpu",
      className
    ),
    [className]
  )

  return (
    <DropdownMenuPrimitive.CheckboxItem
      ref={ref}
      className={memoizedClassName}
      checked={checked}
      style={{ 
        willChange: 'transform',
        contain: 'layout paint',
      }}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}))
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName

// Radio item component with performance optimizations
const DropdownMenuRadioItem = React.memo(React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => {
  const memoizedClassName = React.useMemo(() => 
    cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transform-gpu",
      className
    ),
    [className]
  )

  return (
    <DropdownMenuPrimitive.RadioItem
      ref={ref}
      className={memoizedClassName}
      style={{ 
        willChange: 'transform',
        contain: 'layout paint',
      }}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle className="h-2 w-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

// Label component with performance optimizations
const DropdownMenuLabel = React.memo(React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => {
  const memoizedClassName = React.useMemo(() => 
    cn(
      "px-2 py-1.5 text-sm font-semibold transform-gpu",
      inset && "pl-8",
      className
    ),
    [className, inset]
  )

  return (
    <DropdownMenuPrimitive.Label
      ref={ref}
      className={memoizedClassName}
      style={{ 
        willChange: 'transform',
        contain: 'layout paint',
      }}
      {...props}
    />
  )
}))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

// Separator component with performance optimizations
const DropdownMenuSeparator = React.memo(React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => {
  const memoizedClassName = React.useMemo(() => 
    cn("-mx-1 my-1 h-px bg-muted transform-gpu", className),
    [className]
  )

  return (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      className={memoizedClassName}
      style={{ 
        willChange: 'transform',
        contain: 'layout paint',
      }}
      {...props}
    />
  )
}))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

// Shortcut component with performance optimizations
const DropdownMenuShortcut = React.memo(({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  const memoizedClassName = React.useMemo(() => 
    cn("ml-auto text-xs tracking-widest opacity-60 transform-gpu", className),
    [className]
  )

  return (
    <span
      className={memoizedClassName}
      style={{ 
        willChange: 'transform',
        contain: 'layout paint',
      }}
      {...props}
    />
  )
})
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

// Export all components
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
