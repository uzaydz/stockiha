import React from 'react'
import { motion } from 'framer-motion'
import { Settings, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { cn } from '@/lib/utils'
import { getComponentDisplayName, getComponentIcon } from '../../hooks/useImprovedStoreEditor'
import { ResponsivePropertiesPanel } from './ResponsivePropertiesPanel'

interface PropertiesDialogsProps {
  selectedComponent: any
  activeTab: string
  setActiveTab: (tab: string) => void
  updateProperty: (key: string, value: any) => void
  updateNestedProperty: (path: string[], value: any) => void
  toggleComponentVisibility: (id: string) => void
  showFullscreen: boolean
  setShowFullscreen: (show: boolean) => void
  isMobile: boolean
}

export const PropertiesDialogs: React.FC<PropertiesDialogsProps> = ({
  selectedComponent,
  activeTab,
  setActiveTab,
  updateProperty,
  updateNestedProperty,
  toggleComponentVisibility,
  showFullscreen,
  setShowFullscreen,
  isMobile
}) => {
  const DialogComponent = isMobile ? Drawer : Dialog
  const ContentComponent = isMobile ? DrawerContent : DialogContent
  const HeaderComponent = isMobile ? DrawerHeader : DialogHeader
  const TitleComponent = isMobile ? DrawerTitle : DialogTitle
  const DescriptionComponent = isMobile ? DrawerDescription : DialogDescription

  return (
    <DialogComponent open={showFullscreen} onOpenChange={setShowFullscreen}>
      <ContentComponent className={cn(
        isMobile ? "h-[92vh] rounded-t-2xl" : "max-w-3xl max-h-[90vh]",
        "overflow-hidden p-0 bg-gradient-to-br from-background via-background/95 to-muted/10",
        "border-border/30"
      )}>
        {selectedComponent && (
          <HeaderComponent className="p-4 pb-2 border-b border-border/30 bg-card/50 backdrop-blur-sm">
            <TitleComponent className="text-right flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center border border-primary/20">
                <span className="text-lg">{getComponentIcon(selectedComponent.type)}</span>
              </div>
              <span>خصائص {selectedComponent.name}</span>
            </TitleComponent>
            <DescriptionComponent className="text-right text-muted-foreground">
              {getComponentDisplayName(selectedComponent.type)}
            </DescriptionComponent>
          </HeaderComponent>
        )}
        
        <div className="flex-1 overflow-hidden">
          <ResponsivePropertiesPanel
            selectedComponent={selectedComponent}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            updateProperty={updateProperty}
            updateNestedProperty={updateNestedProperty}
            toggleComponentVisibility={toggleComponentVisibility}
            isFullscreen={true}
            onClose={() => setShowFullscreen(false)}
            isMobile={isMobile}
          />
        </div>
      </ContentComponent>
    </DialogComponent>
  )
}
