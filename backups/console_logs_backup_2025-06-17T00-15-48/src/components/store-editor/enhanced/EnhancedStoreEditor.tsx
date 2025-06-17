import React, { useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster } from '@/components/ui/toaster'
import { useHotkeys } from 'react-hotkeys-hook'
import { cn } from '@/lib/utils'

// المكونات الداخلية
import { EditorHeader } from './components/EditorHeader'
import { EditorSidebar } from './components/EditorSidebar'
import { EditorCanvas } from './components/EditorCanvas'
import { EditorFloatingPanels } from './components/EditorFloatingPanels'
import { EditorKeyboardShortcuts } from './components/EditorKeyboardShortcuts'
import { EditorStatusBar } from './components/EditorStatusBar'

// المتجر والأنواع
import { useEnhancedStoreEditor } from './store'
import type { PageConfig, EditorMode, ViewportSize } from './types'

interface EnhancedStoreEditorProps {
  className?: string
  initialPage?: PageConfig
  onSave?: (page: PageConfig) => Promise<void>
  onPublish?: (page: PageConfig) => Promise<void>
  onExport?: (page: PageConfig, format: string) => Promise<string>
  theme?: 'light' | 'dark' | 'auto'
  enableCollaboration?: boolean
  enableKeyboardShortcuts?: boolean
  maxHistorySize?: number
}

/**
 * محرر المتجر المحسن - النسخة المطورة
 * 
 * المزايا الجديدة:
 * - أداء محسن مع React optimizations
 * - واجهة مستخدم حديثة وسلسة
 * - دعم كامل للـ keyboard shortcuts
 * - نظام undo/redo متطور
 * - auto-save ذكي ومحسن
 * - دعم للتعاون في الوقت الفعلي
 * - تصدير متقدم بصيغ متعددة
 * - نظام templates متطور
 * - أدوات تصميم احترافية
 */
export const EnhancedStoreEditor: React.FC<EnhancedStoreEditorProps> = ({
  className,
  initialPage,
  onSave,
  onPublish,
  onExport,
  theme = 'light',
  enableCollaboration = false,
  enableKeyboardShortcuts = true,
  maxHistorySize = 50,
}) => {
  const {
    // الحالة
    currentPage,
    mode,
    viewport,
    zoom,
    activePanels,
    showGrid,
    showRulers,
    showElementBounds,
    isDirty,
    isLoading,
    isSaving,
    settings,
    
    // الإجراءات
    setCurrentPage,
    createPage,
    setMode,
    setViewport,
    setZoom,
    saveChanges,
    publishPage,
    exportPage,
    undo,
    redo,
    updateSettings,
    setMaxHistorySize,
  } = useEnhancedStoreEditor()

  // تهيئة الصفحة الأولى
  useEffect(() => {
    if (!currentPage && initialPage) {
      setCurrentPage(initialPage)
    } else if (!currentPage) {
      // إنشاء صفحة افتراضية
      createPage({
        name: 'الصفحة الرئيسية',
        slug: 'home',
        description: 'صفحة المتجر الرئيسية',
        elements: [],
      })
    }
  }, [currentPage, initialPage, setCurrentPage, createPage])

  // تحديث إعدادات المحرر
  useEffect(() => {
    updateSettings({
      enableCollaboration,
      enableKeyboardShortcuts,
      theme,
    })
    
    // تحديث حجم التاريخ
    setMaxHistorySize(maxHistorySize)
  }, [enableCollaboration, enableKeyboardShortcuts, theme, maxHistorySize, updateSettings, setMaxHistorySize])

  // معالجات الحفظ والنشر
  const handleSave = useCallback(async () => {
    if (!currentPage || !onSave) return
    
    try {
      await onSave(currentPage)
    } catch (error) {
      throw error
    }
  }, [currentPage, onSave])

  const handlePublish = useCallback(async () => {
    if (!currentPage || !onPublish) return
    
    try {
      await onPublish(currentPage)
    } catch (error) {
      throw error
    }
  }, [currentPage, onPublish])

  const handleExport = useCallback(async (format: string) => {
    if (!currentPage || !onExport) return ''
    
    try {
      return await onExport(currentPage, format)
    } catch (error) {
      throw error
    }
  }, [currentPage, onExport])

  // اختصارات لوحة المفاتيح
  useHotkeys('ctrl+s, cmd+s', (e) => {
    e.preventDefault()
    if (settings.enableKeyboardShortcuts) {
      saveChanges()
    }
  }, { enableOnContentEditable: true })

  useHotkeys('ctrl+z, cmd+z', (e) => {
    e.preventDefault()
    if (settings.enableKeyboardShortcuts) {
      undo()
    }
  }, { enableOnContentEditable: true })

  useHotkeys('ctrl+y, cmd+y, ctrl+shift+z, cmd+shift+z', (e) => {
    e.preventDefault()
    if (settings.enableKeyboardShortcuts) {
      redo()
    }
  }, { enableOnContentEditable: true })

  // تبديل أوضاع العرض
  useHotkeys('1', () => settings.enableKeyboardShortcuts && setViewport('desktop'))
  useHotkeys('2', () => settings.enableKeyboardShortcuts && setViewport('tablet'))
  useHotkeys('3', () => settings.enableKeyboardShortcuts && setViewport('mobile'))

  // تبديل أوضاع المحرر
  useHotkeys('tab', (e) => {
    e.preventDefault()
    if (settings.enableKeyboardShortcuts) {
      const modes: EditorMode[] = ['design', 'preview', 'code']
      const currentIndex = modes.indexOf(mode)
      const nextMode = modes[(currentIndex + 1) % modes.length]
      setMode(nextMode)
    }
  })

  // حساب فئات CSS ديناميكياً
  const editorClasses = useMemo(() => cn(
    'enhanced-store-editor',
    'min-h-screen w-full',
    'flex flex-col',
    'bg-background text-foreground',
    {
      'theme-light': theme === 'light',
      'theme-dark': theme === 'dark',
      'theme-auto': theme === 'auto',
      'collaboration-enabled': enableCollaboration,
      'loading': isLoading,
      'saving': isSaving,
      'has-unsaved-changes': isDirty,
    },
    className
  ), [theme, enableCollaboration, isLoading, isSaving, isDirty, className])

  // تخطيط الشاشة حسب الوضع
  const layoutConfig = useMemo(() => {
    switch (mode) {
      case 'preview':
        return {
          showSidebar: false,
          showFloatingPanels: false,
          showHeader: true,
          showStatusBar: true,
        }
      case 'code':
        return {
          showSidebar: true,
          showFloatingPanels: false,
          showHeader: true,
          showStatusBar: true,
        }
      default: // design
        return {
          showSidebar: true,
          showFloatingPanels: true,
          showHeader: true,
          showStatusBar: true,
        }
    }
  }, [mode])

  // إذا كان المحرر في حالة تحميل أولي
  if (isLoading && !currentPage) {
    return (
      <div className={editorClasses}>
        <div className="flex items-center justify-center flex-1">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto"></div>
            <h3 className="text-lg font-semibold">جاري تحميل المحرر...</h3>
            <p className="text-muted-foreground">يرجى الانتظار لحظات</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={editorClasses}>
      {/* شريط الرأس */}
      <AnimatePresence>
        {layoutConfig.showHeader && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex-shrink-0"
          >
            <EditorHeader
              onSave={handleSave}
              onPublish={handlePublish}
              onExport={handleExport}
              enableCollaboration={enableCollaboration}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* المحتوى الرئيسي */}
      <div className="flex flex-1 overflow-hidden">
        {/* الشريط الجانبي */}
        <AnimatePresence>
          {layoutConfig.showSidebar && (
            <motion.div
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex-shrink-0 h-full"
            >
              <EditorSidebar />
            </motion.div>
          )}
        </AnimatePresence>

        {/* منطقة الرسم */}
        <div className="flex-1 relative h-full overflow-hidden">
          <EditorCanvas />
          
          {/* اللوحات العائمة */}
          <AnimatePresence>
            {layoutConfig.showFloatingPanels && (
              <EditorFloatingPanels />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* شريط الحالة */}
      <AnimatePresence>
        {layoutConfig.showStatusBar && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex-shrink-0"
          >
            <EditorStatusBar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* اختصارات لوحة المفاتيح */}
      {settings.enableKeyboardShortcuts && <EditorKeyboardShortcuts />}

      {/* نظام الإشعارات */}
      <Toaster />

      {/* طبقة التحميل العامة */}
      <AnimatePresence>
        {(isLoading || isSaving) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <div className="bg-card rounded-lg shadow-lg p-6 max-w-sm mx-4">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                <div>
                  <h3 className="font-semibold">
                    {isSaving ? 'جاري الحفظ...' : 'جاري التحميل...'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isSaving ? 'يتم حفظ التغييرات' : 'يرجى الانتظار'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// تصدير إضافي للتوافق
export default EnhancedStoreEditor
