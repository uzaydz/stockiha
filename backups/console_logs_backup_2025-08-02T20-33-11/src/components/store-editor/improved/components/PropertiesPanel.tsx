import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings2,
  Eye,
  EyeOff,
  PanelRightClose,
  PanelRightOpen,
  Maximize2
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { 
  useImprovedStoreEditor,
  getComponentIcon
} from '../hooks/useImprovedStoreEditor'

// المكونات الجديدة المحسنة
import { ResponsivePropertiesPanel } from './properties/ResponsivePropertiesPanel'
import { PropertiesDialogs } from './properties/PropertiesDialogs'
import { FloatingPropertiesButton } from './properties/FloatingPropertiesButton'

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



export const PropertiesPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('properties')
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('propertiesPanel.collapsed')
      return saved ? JSON.parse(saved) : false
    }
    return false
  })
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [showFloatingButton, setShowFloatingButton] = useState(true)
  const [showTooltipHint, setShowTooltipHint] = useState(true)

  const { windowSize, breakpoint, isMobile, isTablet, isDesktop, isSmallScreen, isXs } = useResponsive()
  
  const {
    selectedComponentId,
    updateComponent,
    toggleComponentVisibility,
    getSelectedComponent
  } = useImprovedStoreEditor()
  
  const selectedComponent = getSelectedComponent()
  
  // فتح الخصائص تلقائياً عند اختيار مكون في الهاتف
  useEffect(() => {
    if (selectedComponent && (isMobile || isXs)) {
      setShowFloatingButton(true)
      setShowTooltipHint(true)
      // تأخير قصير للسماح للانيميشن بالانتهاء
      const timer = setTimeout(() => {
        setShowFullscreen(true)
        setActiveTab('properties')
      }, 300)
      
      return () => clearTimeout(timer)
      } else {
      setShowFloatingButton(false)
      setShowTooltipHint(false)
    }
  }, [selectedComponentId, isMobile, isXs])

  // إخفاء التلميح النصي أولاً
  useEffect(() => {
    if (selectedComponent && (isMobile || isXs) && !showFullscreen && showTooltipHint) {
      const hideTooltipTimer = setTimeout(() => {
        setShowTooltipHint(false)
      }, 4000) // 4 ثوان
      
      return () => clearTimeout(hideTooltipTimer)
    }
  }, [selectedComponentId, showFullscreen, isMobile, isXs, showTooltipHint])

  // إخفاء الزر العائم تدريجياً بعد عرضه
  useEffect(() => {
    if (selectedComponent && (isMobile || isXs) && !showFullscreen && showFloatingButton) {
      const hideTimer = setTimeout(() => {
        setShowFloatingButton(false)
      }, 8000) // 8 ثوان
      
      return () => clearTimeout(hideTimer)
    }
  }, [selectedComponentId, showFullscreen, isMobile, isXs, showFloatingButton])

  // إظهار الزر العائم مرة أخرى عند إغلاق الشاشة الكاملة
  useEffect(() => {
    if (!showFullscreen && selectedComponent && (isMobile || isXs)) {
      setShowFloatingButton(true)
      setShowTooltipHint(true)
    }
  }, [showFullscreen, selectedComponent, isMobile, isXs])

  // إظهار الزر العائم عند لمس الشاشة إذا كان هناك مكون محدد
  useEffect(() => {
    if (!(isMobile || isXs) || !selectedComponent || showFullscreen) return

    const handleTouch = () => {
      if (!showFloatingButton) {
        setShowFloatingButton(true)
        setShowTooltipHint(true)
      }
    }

    const handleScroll = () => {
      if (!showFloatingButton) {
        setShowFloatingButton(true)
        setShowTooltipHint(false) // لا نظهر التلميح عند التمرير لتجنب الإزعاج
      }
    }

    document.addEventListener('touchstart', handleTouch, { passive: true })
    document.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      document.removeEventListener('touchstart', handleTouch)
      document.removeEventListener('scroll', handleScroll)
    }
  }, [isMobile, isXs, selectedComponent, showFullscreen, showFloatingButton])

  // حفظ حالة التوسيع في localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('propertiesPanel.collapsed', JSON.stringify(isCollapsed))
    }
  }, [isCollapsed])
  
  // تحديث خاصية في المكون
  const updateProperty = useCallback((key: string, value: any) => {
    if (!selectedComponent) return

    updateComponent(selectedComponent.id, {
      settings: {
        ...selectedComponent.settings,
        [key]: value
      }
    })
  }, [selectedComponent, updateComponent])
  
  // تحديث خاصية متداخلة
  const updateNestedProperty = useCallback((path: string[], value: any) => {
    if (!selectedComponent) return
    
    const settings = { ...selectedComponent.settings }
    let current = settings
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {}
      current = current[path[i]]
    }
    
    current[path[path.length - 1]] = value
    
    updateComponent(selectedComponent.id, { settings })
  }, [selectedComponent, updateComponent])
  
  // تعريف animation variants للمحتوى
  const contentVariants = {
    expanded: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, delay: 0.1 }
    },
    collapsed: {
      opacity: 0,
      x: 20,
      transition: { duration: 0.2 }
    }
  }

  // دالة تبديل حالة التوسيع
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  // دالة التوسيع التلقائي عند الضغط على أيقونة
  const expandOnAction = (action?: () => void) => {
    if (isCollapsed) {
      setIsCollapsed(false)
      if (action) {
        setTimeout(action, 300)
      }
    } else if (action) {
      action()
    }
  }

  // رندر النسخة المضغوطة المحسنة
  const renderCollapsedView = () => (
    <div className="h-full flex flex-col bg-gradient-to-b from-card/90 via-card/95 to-muted/20 backdrop-blur-sm border-r border-border/30">
      {/* شريط التحكم العلوي */}
      <div className="p-3 border-b border-border/30">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCollapse}
                className="w-full h-10 p-0 hover:bg-primary/10 transition-all duration-200 rounded-lg border border-transparent hover:border-primary/20"
              >
                <PanelRightOpen className="w-5 h-5 text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>توسيع لوحة الخصائص</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* الأيقونات الرئيسية */}
      <div className="flex-1 p-2 space-y-2">
        {/* أيقونة المكون المحدد */}
        {selectedComponent && (
          <div className="mb-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={(selectedComponent.isVisible ?? true) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (isMobile || isXs) {
                        setShowFullscreen(true)
                      } else {
                        expandOnAction()
                      }
                    }}
                    className="w-full h-12 p-0 transition-all duration-200 rounded-lg"
                  >
                    <span className="text-lg">{getComponentIcon(selectedComponent.type)}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{selectedComponent.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* أيقونات التبويبات */}
        <div className="space-y-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTab === 'properties' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    if (isMobile || isXs) {
                      setActiveTab('properties')
                      setShowFullscreen(true)
                    } else {
                      expandOnAction(() => setActiveTab('properties'))
                    }
                  }}
                  className="w-full h-10 p-0 transition-all duration-200 rounded-lg"
                >
                  <Settings2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>الخصائص</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* أيقونات إضافية */}
        {selectedComponent && (
          <div className="mt-4 pt-4 border-t border-border/30 space-y-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullscreen(true)}
                    className="w-full h-10 p-0 transition-all duration-200 rounded-lg hover:bg-primary/10"
                  >
                    <Maximize2 className="w-4 h-4 text-primary" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>فتح في الشاشة الكاملة</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleComponentVisibility(selectedComponent.id)}
                    className="w-full h-10 p-0 transition-all duration-200 rounded-lg"
                  >
                    {(selectedComponent.isVisible ?? true) ? (
                      <Eye className="w-4 h-4 text-green-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-red-500" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{(selectedComponent.isVisible ?? true) ? "إخفاء المكون" : "إظهار المكون"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  )

  // رندر اللوحة للشاشات الكبيرة
  const renderDesktopPanel = () => (
    <motion.div 
      className={cn(
        "h-full flex flex-col properties-panel-enhanced properties-panel-rtl",
        "bg-gradient-to-bl from-card/95 via-card/90 to-background/95",
        "backdrop-blur-md shadow-xl",
        "border-l border-border/30", // تغيير من border-r إلى border-l
        "relative overflow-hidden",
        isMobile && "properties-panel-mobile",
        isTablet && "properties-panel-tablet"
      )}
      animate={{
        width: isCollapsed ? (isMobile ? 50 : 60) : Math.min(
          isXs ? Math.min(300, windowSize.width - 40) :
          isMobile ? Math.min(340, windowSize.width - 60) :
          isTablet ? Math.min(380, windowSize.width * 0.4) :
          isSmallScreen ? Math.min(400, windowSize.width * 0.35) : 420,
          windowSize.width - 80
        )
      }}
      transition={{ duration: isCollapsed ? 0.3 : 0.4, ease: "easeInOut" }}
      initial={false}
      style={{ 
        direction: 'rtl',
        position: 'relative',
        maxWidth: '100%'
      }}
    >
      {isCollapsed ? (
        renderCollapsedView()
      ) : (
        <motion.div 
          variants={contentVariants}
          initial="collapsed"
          animate="expanded"
          className="h-full"
        >
          <ResponsivePropertiesPanel
            selectedComponent={selectedComponent}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            updateProperty={updateProperty}
            updateNestedProperty={updateNestedProperty}
            toggleComponentVisibility={toggleComponentVisibility}
            isMobile={isMobile}
          />
        </motion.div>
      )}
    </motion.div>
  )

  const handleOpenProperties = () => {
    setShowFullscreen(true)
    setActiveTab('properties')
  }

  return (
    <>
      {/* اللوحة الأساسية للشاشات الكبيرة */}
      {!isMobile && !isXs && renderDesktopPanel()}
      
      {/* الحوارات للشاشات الصغيرة */}
      <PropertiesDialogs
        selectedComponent={selectedComponent}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        updateProperty={updateProperty}
        updateNestedProperty={updateNestedProperty}
        toggleComponentVisibility={toggleComponentVisibility}
        showFullscreen={showFullscreen}
        setShowFullscreen={setShowFullscreen}
        isMobile={isMobile}
      />
      
      {/* الأزرار العائمة للهواتف */}
      <FloatingPropertiesButton
        selectedComponent={selectedComponent}
        showFloatingButton={showFloatingButton}
        showTooltipHint={showTooltipHint}
        onOpenProperties={handleOpenProperties}
        isMobile={isMobile}
        isXs={isXs}
      />
    </>
  )
}

// تصدير افتراضي لحل مشكلة الاستيراد
export default PropertiesPanel
