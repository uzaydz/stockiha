import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Save, 
  Upload, 
  Download, 
  Undo2, 
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
  ZoomOut,
  Grid3x3,
  Ruler,
  Eye,
  Settings,
  Share2,
  Play,
  Code,
  Palette,
  Users,
  ChevronDown,
  Loader2
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

import { useEnhancedStoreEditor } from '../store'
import type { ViewportSize, EditorMode, PageConfig } from '../types'

interface EditorHeaderProps {
  onSave?: () => Promise<void>
  onPublish?: () => Promise<void>
  onExport?: (format: string) => Promise<string>
  enableCollaboration?: boolean
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  onSave,
  onPublish,
  onExport,
  enableCollaboration = false,
}) => {
  const {
    // الحالة
    currentPage,
    mode,
    viewport,
    zoom,
    showGrid,
    showRulers,
    showElementBounds,
    isDirty,
    isSaving,
    isPublishing,
    history,
    historyIndex,
    
    // الإجراءات
    setMode,
    setViewport,
    setZoom,
    toggleGrid,
    toggleRulers,
    toggleElementBounds,
    undo,
    redo,
    saveChanges,
    publishPage,
    exportPage,
  } = useEnhancedStoreEditor()

  const [isExporting, setIsExporting] = useState(false)

  // معالجات الأحداث
  const handleSave = async () => {
    try {
      if (onSave) {
        await onSave()
      } else {
        await saveChanges()
      }
    } catch (error) {
    }
  }

  const handlePublish = async () => {
    try {
      if (onPublish) {
        await onPublish()
      } else {
        await publishPage()
      }
    } catch (error) {
    }
  }

  const handleExport = async (format: string) => {
    setIsExporting(true)
    try {
      if (onExport) {
        await onExport(format)
      } else {
        await exportPage({ 
          format: format as any, 
          includeAssets: true, 
          minify: true, 
          responsive: true, 
          seo: true 
        })
      }
    } catch (error) {
    } finally {
      setIsExporting(false)
    }
  }

  const handleZoomIn = () => setZoom(Math.min(200, zoom + 10))
  const handleZoomOut = () => setZoom(Math.max(25, zoom - 10))
  const handleZoomReset = () => setZoom(100)

  // تحديد إعدادات العرض
  const viewportConfig = {
    desktop: { icon: Monitor, label: 'سطح المكتب', width: '1920px' },
    tablet: { icon: Tablet, label: 'تابلت', width: '768px' },
    mobile: { icon: Smartphone, label: 'جوال', width: '375px' },
  }

  const modeConfig = {
    design: { icon: Palette, label: 'تصميم', color: 'bg-blue-500' },
    preview: { icon: Eye, label: 'معاينة', color: 'bg-green-500' },
    code: { icon: Code, label: 'كود', color: 'bg-purple-500' },
  }

  const canUndo = historyIndex >= 0
  const canRedo = historyIndex < history.length - 1

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-4 shadow-sm"
    >
      {/* القسم الأيسر - الشعار والمعلومات */}
      <div className="flex items-center gap-4">
        {/* شعار المحرر */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Palette className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-white">
              محرر المتجر المتطور
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {currentPage?.name || 'بدون عنوان'}
            </p>
          </div>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* حالة الحفظ */}
        <div className="flex items-center gap-2">
          {isDirty && (
            <Badge variant="secondary" className="text-xs">
              تغييرات غير محفوظة
            </Badge>
          )}
          {isSaving && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              جاري الحفظ...
            </div>
          )}
        </div>
      </div>

      {/* القسم الأوسط - أدوات التحرير */}
      <div className="flex items-center gap-2">
        {/* أدوات التراجع والإعادة */}
        <div className="flex items-center gap-1 p-1 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={!canUndo}
            className="h-8 w-8 p-0"
            title="تراجع (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={!canRedo}
            className="h-8 w-8 p-0"
            title="إعادة (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* أوضاع العرض */}
        <div className="flex items-center gap-1 p-1 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {Object.entries(viewportConfig).map(([key, config]) => {
            const Icon = config.icon
            const isActive = viewport === key
            return (
              <Button
                key={key}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewport(key as ViewportSize)}
                className="h-8 w-8 p-0"
                title={`${config.label} (${config.width})`}
              >
                <Icon className="w-4 h-4" />
              </Button>
            )
          })}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* أدوات التكبير */}
        <div className="flex items-center gap-1 p-1 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 25}
            className="h-8 w-8 p-0"
            title="تصغير"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomReset}
            className="h-8 px-2 text-xs font-mono"
            title="إعادة تعيين التكبير"
          >
            {zoom}%
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
            className="h-8 w-8 p-0"
            title="تكبير"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* أدوات العرض */}
        <div className="flex items-center gap-1 p-1 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Button
            variant={showGrid ? "default" : "ghost"}
            size="sm"
            onClick={toggleGrid}
            className="h-8 w-8 p-0"
            title="إظهار/إخفاء الشبكة"
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button
            variant={showRulers ? "default" : "ghost"}
            size="sm"
            onClick={toggleRulers}
            className="h-8 w-8 p-0"
            title="إظهار/إخفاء المساطر"
          >
            <Ruler className="w-4 h-4" />
          </Button>
          <Button
            variant={showElementBounds ? "default" : "ghost"}
            size="sm"
            onClick={toggleElementBounds}
            className="h-8 w-8 p-0"
            title="إظهار/إخفاء حدود العناصر"
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* القسم الأيمن - أوضاع المحرر والإجراءات */}
      <div className="flex items-center gap-3">
        {/* أوضاع المحرر */}
        <div className="flex items-center gap-1 p-1 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {Object.entries(modeConfig).map(([key, config]) => {
            const Icon = config.icon
            const isActive = mode === key
            return (
              <Button
                key={key}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => setMode(key as EditorMode)}
                className={cn(
                  "h-8 px-3 gap-1",
                  isActive && config.color
                )}
                title={config.label}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{config.label}</span>
              </Button>
            )
          })}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* أزرار الإجراءات */}
        <div className="flex items-center gap-2">
          {/* التعاون المباشر */}
          {enableCollaboration && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              title="التعاون المباشر"
            >
              <Users className="w-4 h-4" />
              <span className="text-xs">تعاون</span>
            </Button>
          )}

          {/* الحفظ */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="h-8 gap-1"
            title="حفظ (Ctrl+S)"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span className="text-xs">حفظ</span>
          </Button>

          {/* التصدير */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isExporting}
                className="h-8 gap-1"
                title="تصدير"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span className="text-xs">تصدير</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('html')}>
                <Code className="w-4 h-4 mr-2" />
                HTML
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('react')}>
                <Code className="w-4 h-4 mr-2" />
                React
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                <Code className="w-4 h-4 mr-2" />
                JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <Download className="w-4 h-4 mr-2" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* النشر */}
          <Button
            variant="default"
            size="sm"
            onClick={handlePublish}
            disabled={isPublishing}
            className="h-8 gap-1 bg-green-600 hover:bg-green-700"
            title="نشر المتجر"
          >
            {isPublishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span className="text-xs">نشر</span>
          </Button>

          {/* المعاينة المباشرة */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            title="معاينة مباشرة"
          >
            <Play className="w-4 h-4" />
            <span className="text-xs">معاينة</span>
          </Button>

          {/* الإعدادات */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="إعدادات المحرر"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.header>
  )
}
