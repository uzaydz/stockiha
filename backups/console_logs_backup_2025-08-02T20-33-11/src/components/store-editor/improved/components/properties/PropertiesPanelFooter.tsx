import React from 'react'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PropertiesPanelFooterProps {
  isFullscreen?: boolean
  selectedComponent: any
  isMobile?: boolean
}

export const PropertiesPanelFooter: React.FC<PropertiesPanelFooterProps> = ({
  isFullscreen = false,
  selectedComponent,
  isMobile = false
}) => {
  if (isFullscreen || !selectedComponent) return null

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={cn(
        "flex-shrink-0 border-t border-border/30",
        "bg-gradient-to-l from-card/80 via-card/90 to-card/95",
        "backdrop-blur-sm",
        isMobile ? "p-3 pb-6" : "p-4 pb-8"
      )}
    >
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <div className="relative">
            <div className="w-7 h-7 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-full flex items-center justify-center shadow-lg">
              <Star className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse opacity-70" />
          </div>
          <span className={cn(
            "font-bold bg-gradient-to-l from-primary to-primary/80 bg-clip-text text-transparent",
            isMobile ? "text-sm" : "text-base"
          )}>
            سطوكيها
          </span>
        </div>
        
        <p className={cn(
          "text-muted-foreground leading-relaxed font-medium",
          isMobile ? "text-xs px-2" : "text-sm"
        )}>
          "أطلق العنان لإبداعك واصنع متجراً يحكي قصة نجاحك"
        </p>
        
        <div className="flex items-center justify-center gap-1.5 mt-3">
          <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/60 rounded-full animate-pulse" />
          <div className="w-1.5 h-1.5 bg-gradient-to-r from-primary/70 to-primary/40 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
          <div className="w-1 h-1 bg-gradient-to-r from-primary/50 to-primary/20 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
        </div>
      </div>
    </motion.div>
  )
}