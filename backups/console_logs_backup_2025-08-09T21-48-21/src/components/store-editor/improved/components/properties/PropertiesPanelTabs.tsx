import React from 'react'
import { Settings2, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PropertiesPanelTabsProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  isMobile?: boolean
}

export const PropertiesPanelTabs: React.FC<PropertiesPanelTabsProps> = ({
  activeTab,
  setActiveTab,
  isMobile = false
}) => {
  return (
    <div className={cn(
      "flex-shrink-0 px-4 pt-4 pb-2",
      isMobile && "px-3 pt-3"
    )}>
      <div className={cn(
        "w-full grid grid-cols-2 bg-muted/30 border border-border/30 rounded-xl p-1",
        "backdrop-blur-sm shadow-sm",
        isMobile ? "h-9" : "h-10"
      )}>
        <Button
          variant={activeTab === 'properties' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('properties')}
          className={cn(
            "font-medium transition-all duration-200 rounded-lg",
            "data-[state=active]:bg-card data-[state=active]:shadow-sm",
            "data-[state=active]:border data-[state=active]:border-border/20",
            isMobile ? "text-xs py-1.5" : "text-sm py-2"
          )}
        >
          <Settings2 className={cn(
            isMobile ? "w-3 h-3 ml-1" : "w-4 h-4 ml-1.5"
          )} />
          الخصائص
        </Button>
        <Button
          variant={activeTab === 'style' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('style')}
          className={cn(
            "font-medium transition-all duration-200 rounded-lg",
            "data-[state=active]:bg-card data-[state=active]:shadow-sm",
            "data-[state=active]:border data-[state=active]:border-border/20",
            isMobile ? "text-xs py-1.5" : "text-sm py-2"
          )}
        >
          <Palette className={cn(
            isMobile ? "w-3 h-3 ml-1" : "w-4 h-4 ml-1.5"
          )} />
          التصميم
        </Button>
      </div>
    </div>
  )
}
