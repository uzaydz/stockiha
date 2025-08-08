import React from 'react'
import { motion } from 'framer-motion'
import { Settings2, Eye, EyeOff, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { getComponentDisplayName, getComponentIcon } from '../../hooks/useImprovedStoreEditor'

interface PropertiesPanelHeaderProps {
  selectedComponent: any
  toggleComponentVisibility: (id: string) => void
  isFullscreen?: boolean
  onClose?: () => void
  isMobile?: boolean
}

export const PropertiesPanelHeader: React.FC<PropertiesPanelHeaderProps> = ({
  selectedComponent,
  toggleComponentVisibility,
  isFullscreen = false,
  onClose,
  isMobile = false
}) => {
  return (
    <div className={cn(
      "flex-shrink-0 border-b border-border/30",
      "bg-gradient-to-l from-card/80 via-card/90 to-card/95",
      "backdrop-blur-sm",
      isFullscreen ? "p-4 lg:p-6" : "p-4",
      isMobile && "p-3"
    )}>
      <div className="flex items-center justify-between mb-4">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
            <Settings2 className="w-4 h-4 text-primary" />
          </div>
          <h2 className={cn(
            "font-semibold text-foreground",
            isMobile ? "text-sm" : "text-base"
          )}>
            لوحة الخصائص
          </h2>
        </motion.div>
        
        <div className="flex items-center gap-2">
          {selectedComponent && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleComponentVisibility(selectedComponent.id)}
                    className={cn(
                      "h-8 w-8 p-0 rounded-lg transition-all duration-200",
                      "hover:bg-primary/10 border border-transparent hover:border-primary/20"
                    )}
                  >
                    {(selectedComponent.isVisible ?? true) ? (
                      <Eye className="w-4 h-4 text-green-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-red-500" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{(selectedComponent.isVisible ?? true) ? "إخفاء المكون" : "إظهار المكون"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {isFullscreen && onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-lg hover:bg-muted/80 transition-all duration-200"
            >
              <Minimize2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>
      
      {/* معلومات المكون المحدد */}
      {selectedComponent && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "relative overflow-hidden rounded-xl border border-border/40",
            "bg-gradient-to-l from-muted/30 via-muted/20 to-muted/10",
            "backdrop-blur-sm shadow-sm",
            "p-3 lg:p-4"
          )}
        >
          {/* خلفية متحركة */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center border border-primary/20 flex-shrink-0">
              <span className="text-lg">{getComponentIcon(selectedComponent.type)}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "font-medium text-foreground truncate",
                isMobile ? "text-sm" : "text-base"
              )}>
                {selectedComponent.name}
              </h3>
              <p className={cn(
                "text-muted-foreground truncate",
                isMobile ? "text-xs" : "text-sm"
              )}>
                {getComponentDisplayName(selectedComponent.type)}
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge 
                variant={(selectedComponent.isVisible ?? true) ? 'default' : 'secondary'}
                className={cn(
                  "font-medium border transition-all duration-200",
                  isMobile ? "text-xs px-2 py-1" : "text-xs px-3 py-1",
                  (selectedComponent.isVisible ?? true) 
                    ? "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400" 
                    : "bg-gray-500/10 text-gray-700 border-gray-500/20 dark:text-gray-400"
                )}
              >
                {(selectedComponent.isVisible ?? true) ? 'مرئي' : 'مخفي'}
              </Badge>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}