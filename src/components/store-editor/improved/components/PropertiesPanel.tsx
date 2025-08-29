import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
  Zap,
  Layers,
  Palette,
  MousePointer,
  Move,
  RotateCcw,
  Copy,
  Trash2,
  MoreVertical,
  Search,
  Filter,
  Grid3x3,
  Sliders
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { 
  useImprovedStoreEditor,
  getComponentIcon
} from '../hooks/useImprovedStoreEditor'

// المكونات الجديدة المحسنة
import { ResponsivePropertiesPanel } from './properties/ResponsivePropertiesPanel'
import { PropertiesDialogs } from './properties/PropertiesDialogs'
import { FloatingPropertiesButton } from './properties/FloatingPropertiesButton'

// استيراد الأنماط المخصصة
import './PropertiesPanel.css'

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

// تعريف أنواع الحالات الجديدة
type PanelMode = 'docked' | 'floating' | 'overlay' | 'sidebar'
type PanelSize = 'compact' | 'normal' | 'expanded'
type QuickAction = {
  id: string
  icon: React.ReactNode
  label: string
  action: () => void
  badge?: string
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

export const PropertiesPanel: React.FC = () => {
  // الحالات الأساسية الجديدة
  const [panelMode, setPanelMode] = useState<PanelMode>('docked')
  const [panelSize, setPanelSize] = useState<PanelSize>('normal')
  const [isPinned, setIsPinned] = useState(true)
  const [activeSection, setActiveSection] = useState('properties')
  const [searchQuery, setSearchQuery] = useState('')
  const [showQuickActions, setShowQuickActions] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  
  // حالات للتفاعل المحسن
  const [isHovering, setIsHovering] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  
  // المراجع
  const panelRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<HTMLDivElement>(null)

  const { windowSize, breakpoint, isMobile, isTablet, isDesktop, isSmallScreen, isXs } = useResponsive()
  
  const {
    selectedComponentId,
    updateComponent,
    toggleComponentVisibility,
    getSelectedComponent
  } = useImprovedStoreEditor()
  
  const selectedComponent = getSelectedComponent()
  
  // إعداد الإجراءات السريعة الذكية
  const getQuickActions = useCallback((): QuickAction[] => {
    if (!selectedComponent) return []
    
    const baseActions: QuickAction[] = [
      {
        id: 'visibility',
        icon: (selectedComponent.isVisible ?? true) ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />,
        label: (selectedComponent.isVisible ?? true) ? 'إخفاء' : 'إظهار',
        action: () => toggleComponentVisibility(selectedComponent.id),
        variant: (selectedComponent.isVisible ?? true) ? 'secondary' : 'outline'
      },
      {
        id: 'duplicate',
        icon: <Copy className="w-4 h-4" />,
        label: 'نسخ',
        action: () => {
          // منطق النسخ
        },
        variant: 'outline'
      },
      {
        id: 'reset',
        icon: <RotateCcw className="w-4 h-4" />,
        label: 'إعادة تعيين',
        action: () => {
          // منطق إعادة التعيين
        },
        variant: 'outline'
      }
    ]

    // إضافة إجراءات حسب نوع المكون
    if (selectedComponent.type && selectedComponent.type.toString() === 'button') {
      baseActions.unshift({
        id: 'style',
        icon: <Palette className="w-4 h-4" />,
        label: 'تصميم سريع',
        action: () => setActiveSection('style'),
        badge: '3',
        variant: 'default'
      })
    }

    return baseActions
  }, [selectedComponent, toggleComponentVisibility])

  // تحديث تلقائي للوضع حسب حجم الشاشة
  useEffect(() => {
    if (isMobile || isXs) {
      setPanelMode('overlay')
      setPanelSize('compact')
    } else if (isTablet) {
      setPanelMode('sidebar')
      setPanelSize('normal')
    } else {
      setPanelMode('docked')
      setPanelSize(isSmallScreen ? 'compact' : 'normal')
    }
  }, [isMobile, isXs, isTablet, isSmallScreen])

  // حفظ إعدادات اللوحة
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const settings = {
        panelMode,
        panelSize,
        isPinned,
        activeSection,
        isMinimized
      }
      localStorage.setItem('propertiesPanel.settings', JSON.stringify(settings))
    }
  }, [panelMode, panelSize, isPinned, activeSection, isMinimized])

  // استرجاع الإعدادات المحفوظة
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('propertiesPanel.settings')
      if (saved) {
        try {
          const settings = JSON.parse(saved)
          if (!isMobile && !isXs) {
            setPanelMode(settings.panelMode || 'docked')
            setPanelSize(settings.panelSize || 'normal')
            setIsPinned(settings.isPinned ?? true)
            setActiveSection(settings.activeSection || 'properties')
            setIsMinimized(settings.isMinimized || false)
          }
        } catch (e) {
        }
      }
    }
  }, [])
  
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
  
  // دوال التحكم في اللوحة الجديدة
  const togglePinned = () => setIsPinned(!isPinned)
  const toggleMinimized = () => setIsMinimized(!isMinimized)
  const cyclePanelSize = () => {
    const sizes: PanelSize[] = ['compact', 'normal', 'expanded']
    const currentIndex = sizes.indexOf(panelSize)
    const nextIndex = (currentIndex + 1) % sizes.length
    setPanelSize(sizes[nextIndex])
  }

  // حساب أبعاد اللوحة الديناميكية
  const getPanelDimensions = () => {
    const baseWidth = {
      compact: 280,
      normal: 360,
      expanded: 480
    }[panelSize]

    const maxWidth = Math.min(baseWidth, windowSize.width * 0.4)
    
    if (isMinimized) {
      return { width: 60, height: 'auto' }
    }

    if (panelMode === 'floating') {
      return { 
        width: Math.min(maxWidth, windowSize.width - 40),
        height: Math.min(600, windowSize.height - 100)
      }
    }

    return { width: maxWidth, height: '100%' }
  }

  // animation variants محسنة
  const panelVariants = {
    docked: {
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      transition: { type: "spring" as const, stiffness: 300, damping: 30 }
    },
    floating: {
      x: dragOffset.x,
      y: dragOffset.y,
      scale: isDragging ? 1.02 : 1,
      opacity: 1,
      transition: { type: "spring" as const, stiffness: 300, damping: 30 }
    },
    minimized: {
      scale: 0.95,
      opacity: 0.9,
      transition: { duration: 0.2 }
    }
  }

  // رندر شريط التحكم الذكي الجديد
  const renderSmartToolbar = () => (
    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-background/95 to-muted/20 border-b border-border/30 backdrop-blur-sm">
      {/* معلومات المكون */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {selectedComponent && (
          <>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm">{getComponentIcon(selectedComponent.type)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium truncate">{selectedComponent.name}</h3>
              <p className="text-xs text-muted-foreground">{selectedComponent.type}</p>
            </div>
          </>
        )}
      </div>

      {/* أدوات التحكم */}
      <div className="flex items-center gap-1">
        {/* بحث سريع */}
        {!isMinimized && panelSize !== 'compact' && (
          <div className="relative">
            <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-24 h-7 text-xs pr-7 pl-2 bg-muted/50 border-0"
            />
          </div>
        )}

        {/* أزرار التحكم */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={cyclePanelSize} className="h-7 w-7 p-0">
                <Grid3x3 className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>تغيير الحجم ({panelSize})</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={togglePinned} className="h-7 w-7 p-0">
                {isPinned ? <Pin className="w-3 h-3" /> : <PinOff className="w-3 h-3" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{isPinned ? 'إلغاء التثبيت' : 'تثبيت'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={toggleMinimized} className="h-7 w-7 p-0">
                {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{isMinimized ? 'توسيع' : 'تصغير'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )

  // رندر الإجراءات السريعة الجديدة
  const renderQuickActions = () => {
    if (!selectedComponent || !showQuickActions) return null
    
    const actions = getQuickActions()
    
    return (
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium text-muted-foreground">إجراءات سريعة</h4>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowQuickActions(false)}
            className="h-5 w-5 p-0"
          >
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant || "outline"}
              size="sm"
              onClick={action.action}
              className="h-8 text-xs relative"
            >
              {action.icon}
              <span className="mr-1">{action.label}</span>
              {action.badge && (
                <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs">
                  {action.badge}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  // رندر التبويبات الذكية الجديدة
  const renderSmartTabs = () => {
    const tabs = [
      { id: 'properties', label: 'خصائص', icon: Settings2 },
      { id: 'style', label: 'تصميم', icon: Palette },
      { id: 'layout', label: 'تخطيط', icon: Layers },
      { id: 'interactions', label: 'تفاعل', icon: MousePointer }
    ]

    return (
      <div className="px-3 py-2 border-b border-border/30">
        <div className="grid grid-cols-2 gap-1 bg-muted/20 rounded-lg p-1">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeSection === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveSection(tab.id)}
              className={cn(
                "h-8 text-xs font-medium transition-all duration-200",
                activeSection === tab.id && "shadow-sm"
              )}
            >
              <tab.icon className="w-3 h-3 ml-1" />
              {tab.label}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  // رندر المحتوى المحسن
  const renderEnhancedContent = () => (
    <div className="flex-1 overflow-y-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="p-4 space-y-4"
        >
          {selectedComponent ? (
            <ResponsivePropertiesPanel
              selectedComponent={selectedComponent}
              activeTab={activeSection}
              setActiveTab={setActiveSection}
              updateProperty={updateProperty}
              updateNestedProperty={updateNestedProperty}
              toggleComponentVisibility={toggleComponentVisibility}
              isMobile={isMobile}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">اختر مكوناً لعرض خصائصه</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )

  // رندر اللوحة الجديدة المطورة
  const renderNewPanel = () => {
    const dimensions = getPanelDimensions()
    
    return (
      <motion.div
        ref={panelRef}
        variants={panelVariants}
        animate={isMinimized ? "minimized" : panelMode}
        className={cn(
          "bg-gradient-to-br from-background/95 via-background/90 to-muted/10",
          "backdrop-blur-xl border border-border/30 shadow-2xl",
          "flex flex-col overflow-hidden",
          panelMode === 'floating' && "rounded-2xl fixed top-20 right-6 z-50",
          panelMode === 'docked' && "border-l-0 rounded-l-none",
          panelMode === 'sidebar' && "rounded-l-xl",
          panelMode === 'overlay' && "fixed inset-0 z-50 bg-background/95",
          isMinimized && "rounded-xl",
          !isPinned && panelMode === 'floating' && "cursor-move"
        )}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          direction: 'rtl'
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        drag={!isPinned && panelMode === 'floating'}
        dragMomentum={false}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(_, info) => {
          setIsDragging(false)
          setDragOffset({
            x: dragOffset.x + info.offset.x,
            y: dragOffset.y + info.offset.y
          })
        }}
      >
        {/* شريط التحكم الذكي */}
        {renderSmartToolbar()}

        {/* المحتوى الرئيسي */}
        {!isMinimized && (
          <>
            {/* الإجراءات السريعة */}
            {renderQuickActions()}
            
            {/* التبويبات الذكية */}
            {renderSmartTabs()}
            
            {/* المحتوى */}
            {renderEnhancedContent()}
          </>
        )}

        {/* مؤشر الحالة */}
        {selectedComponent && (
          <div className="absolute top-2 left-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              selectedComponent.isVisible ? "bg-green-500" : "bg-red-500"
            )} />
          </div>
        )}
      </motion.div>
    )
  }

  // عرض اللوحة حسب الجهاز
  const renderPanelForDevice = () => {
    if (isMobile || isXs) {
      return (
        <>
          {/* اللوحة العائمة للهواتف */}
          {panelMode === 'overlay' && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setPanelMode('floating')}
              />
              {renderNewPanel()}
            </AnimatePresence>
          )}
          
          {/* الزر العائم للهواتف */}
          {panelMode === 'floating' && selectedComponent && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="fixed bottom-6 right-6 z-50"
            >
              <Button
                size="lg"
                onClick={() => setPanelMode('overlay')}
                className="rounded-full w-14 h-14 shadow-2xl"
              >
                <Sliders className="w-6 h-6" />
              </Button>
            </motion.div>
          )}
        </>
      )
    }

    return renderNewPanel()
  }

  return (
    <TooltipProvider>
      {/* اللوحة الجديدة المطورة */}
      {renderPanelForDevice()}
      
      {/* مؤثرات بصرية إضافية */}
      {isHovering && panelMode === 'floating' && !isPinned && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent" />
        </motion.div>
      )}
      
      {/* مؤشر الاتصال */}
      {selectedComponent && (
        <motion.div
          className="fixed top-4 right-4 z-60"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
        >
          <div className="flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border/30 rounded-full px-3 py-1 shadow-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
        </motion.div>
      )}
    </TooltipProvider>
  )
}

// تصدير افتراضي لحل مشكلة الاستيراد
export default PropertiesPanel
