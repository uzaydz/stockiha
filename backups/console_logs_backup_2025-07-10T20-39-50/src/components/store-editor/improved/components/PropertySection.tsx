import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PropertySectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  expanded?: boolean
  onToggle?: () => void
  className?: string
}

export const PropertySection: React.FC<PropertySectionProps> = ({
  title,
  icon,
  children,
  expanded = true,
  onToggle,
  className
}) => {
  return (
    <div className={cn(
      "border border-border rounded-lg bg-card/50 backdrop-blur-sm shadow-sm",
      "hover:shadow-md transition-all duration-200",
      className
    )}>
      <Button
        variant="ghost"
        onClick={onToggle}
        className={cn(
          "w-full justify-between h-auto hover:bg-muted/30 transition-colors",
          "p-3 sm:p-4", // padding متجاوب
          expanded ? "rounded-b-none border-b border-border/50" : "rounded-lg"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="text-primary flex-shrink-0">
            {icon}
          </div>
          <span className={cn(
            "font-medium text-foreground truncate",
            "text-sm sm:text-base" // حجم خط متجاوب
          )}>
            {title}
          </span>
        </div>
        {onToggle && (
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="flex-shrink-0 ml-2"
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        )}
      </Button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ 
              duration: 0.25, 
              ease: [0.4, 0, 0.2, 1],
              opacity: { duration: 0.2 }
            }}
            className="overflow-hidden"
          >
            <div className={cn(
              "space-y-3",
              "p-3 sm:p-4", // padding متجاوب
              "border-t border-border/30 bg-gradient-to-b from-transparent to-muted/10"
            )}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
