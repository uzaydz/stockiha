import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface FloatingPropertiesButtonProps {
  selectedComponent: any
  showFloatingButton: boolean
  showTooltipHint: boolean
  onOpenProperties: () => void
  isMobile: boolean
  isXs: boolean
}

export const FloatingPropertiesButton: React.FC<FloatingPropertiesButtonProps> = ({
  selectedComponent,
  showFloatingButton,
  showTooltipHint,
  onOpenProperties,
  isMobile,
  isXs
}) => {
  if (!selectedComponent || !(isMobile || isXs)) return null

  return (
    <>
      {/* مؤشر في الشريط العلوي للهاتف */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40"
      >
        <button
          onClick={onOpenProperties}
          className="bg-primary/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm shadow-lg border border-white/20 hover:bg-primary transition-all duration-200 hover:scale-105"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            <span>تحرير {selectedComponent.name}</span>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </div>
        </button>
      </motion.div>

      {/* زر عائم للهواتف المحمولة */}
      <AnimatePresence>
        {showFloatingButton && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-6 left-6 z-50 floating-properties-button"
            style={{ direction: 'ltr' }}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onOpenProperties}
                    className={cn(
                      "w-14 h-14 rounded-full shadow-2xl",
                      "bg-gradient-to-br from-primary via-primary/90 to-primary/80",
                      "border-2 border-background/20",
                      "hover:shadow-xl hover:scale-105",
                      "transition-all duration-300",
                      "backdrop-blur-sm"
                    )}
                  >
                    <div className="relative">
                      <Settings2 className="w-6 h-6 text-white" />
                      {/* نقطة تنبيه متحركة */}
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="mb-2">
                  <p>تحرير خصائص {selectedComponent.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* مؤشر نص صغير */}
            {showTooltipHint && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: 0.5 }}
                className="absolute -top-12 right-0 bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap"
              >
                اضغط لتحرير الخصائص
                <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-black/80" />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}