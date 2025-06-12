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
    <div className={cn("border border-border rounded-lg bg-card/50 backdrop-blur-sm shadow-sm", className)}>
      <Button
        variant="ghost"
        onClick={onToggle}
        className="w-full justify-between p-3 h-auto hover:bg-muted/30 rounded-b-none border-b border-border/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="text-primary flex-shrink-0">
            {icon}
          </div>
          <span className="text-sm font-medium text-foreground truncate">{title}</span>
        </div>
        {onToggle && (
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0"
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
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
