import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useImprovedStoreEditor } from '../../hooks/useImprovedStoreEditor'
import { PropertiesPanelHeader } from './PropertiesPanelHeader'
import { PropertiesPanelTabs } from './PropertiesPanelTabs'
import { PropertiesPanelContent } from './PropertiesPanelContent'
import { PropertiesPanelFooter } from './PropertiesPanelFooter'

// Hook للتحقق من حجم الشاشة المحسن
const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  })

  const [breakpoint, setBreakpoint] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'>('lg')

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      setWindowSize({ width, height })
      
      // تحديد نقطة التوقف الحالية
      if (width < 480) setBreakpoint('xs')
      else if (width < 640) setBreakpoint('sm')
      else if (width < 768) setBreakpoint('md')
      else if (width < 1024) setBreakpoint('lg')
      else if (width < 1280) setBreakpoint('xl')
      else setBreakpoint('2xl')
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    windowSize,
    breakpoint,
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl',
    isSmallScreen: windowSize.width < 1024,
    isXs: breakpoint === 'xs'
  }
}

interface ResponsivePropertiesPanelProps {
  selectedComponent: any
  activeTab: string
  setActiveTab: (tab: string) => void
  updateProperty: (key: string, value: any) => void
  updateNestedProperty: (path: string[], value: any) => void
  toggleComponentVisibility: (id: string) => void
  isFullscreen?: boolean
  onClose?: () => void
  isMobile?: boolean
}

// محتوى لوحة الخصائص المحسن
export const ResponsivePropertiesPanel: React.FC<ResponsivePropertiesPanelProps> = ({
  selectedComponent,
  activeTab,
  setActiveTab,
  updateProperty,
  updateNestedProperty,
  toggleComponentVisibility,
  isFullscreen = false,
  onClose,
  isMobile = false
}) => {
  const { isSmallScreen } = useResponsive()

  return (
    <div className={cn(
      "flex flex-col h-full bg-gradient-to-br from-background via-background/95 to-muted/10",
      "properties-panel-container",
      isFullscreen && "properties-panel-fullscreen",
      isMobile && "properties-panel-mobile",
      isSmallScreen && "properties-panel-small-screen"
    )} style={{ willChange: 'auto' }}>
      {/* رأس اللوحة */}
      <PropertiesPanelHeader
        selectedComponent={selectedComponent}
        toggleComponentVisibility={toggleComponentVisibility}
        isFullscreen={isFullscreen}
        onClose={onClose}
        isMobile={isMobile}
      />
      
      {/* محتوى التبويبات */}
      <div className="flex-1 flex flex-col">
        {/* التبويبات */}
        <PropertiesPanelTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobile={isMobile}
        />
        
        {/* المحتوى مع سكرول كامل */}
        <div className="flex-1 overflow-y-auto">
          <PropertiesPanelContent
            selectedComponent={selectedComponent}
            activeTab={activeTab}
            updateProperty={updateProperty}
            updateNestedProperty={updateNestedProperty}
            isFullscreen={isFullscreen}
            isMobile={isMobile}
          />
        </div>
      </div>
      
      {/* فوتر تحفيزي محسن لسطوكيها */}
      <PropertiesPanelFooter
        isFullscreen={isFullscreen}
        selectedComponent={selectedComponent}
        isMobile={isMobile}
      />
    </div>
  )
}