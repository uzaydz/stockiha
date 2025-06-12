import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  Undo2, 
  Redo2, 
  Save, 
  Play, 
  Monitor, 
  Tablet, 
  Smartphone,
  ZoomIn,
  ZoomOut,
  Grid3x3,
  Ruler,
  Eye,
  EyeOff,
  Settings,
  Download,
  Share2,
  Layers,
  Palette,
  Package,
  Image as ImageIcon,
  MousePointer2,
  Hand,
  Type,
  Square,
  Circle,
  Triangle,
  Plus
} from 'lucide-react'
import { useEditorStore } from '../../stores/editor-store'
import { ViewportSize } from '../../types/editor.types'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export const MainToolbar = () => {
  const {
    // State
    viewport,
    zoom,
    showGrid,
    showRulers,
    showElementBounds,
    isEditMode,
    isPreviewMode,
    canUndo,
    canRedo,
    isDirty,
    isSaving,
    isPublishing,
    
    // Actions
    setViewport,
    setZoom,
    toggleGrid,
    toggleRulers,
    toggleElementBounds,
    setEditMode,
    setPreviewMode,
    undo,
    redo,
    saveChanges,
    publishPage,
    toggleLayersPanel,
    togglePropertiesPanel,
    toggleTemplatesPanel,
    toggleAssetsPanel,
  } = useEditorStore()

  const viewportIcons = {
    desktop: Monitor,
    tablet: Tablet,
    mobile: Smartphone,
  }

  const handleZoomIn = () => {
    setZoom(Math.min(200, zoom + 10))
  }

  const handleZoomOut = () => {
    setZoom(Math.max(25, zoom - 10))
  }

  const handleZoomReset = () => {
    setZoom(100)
  }

  return (
    <TooltipProvider>
      <div className="h-16 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-700/60 shadow-sm">
        <div className="flex items-center justify-between h-full px-4">
          {/* قسم الشعار والعنوان */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-gray-900 dark:text-white">محرر المتجر</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">تخصيص متجرك الإلكتروني</p>
              </div>
            </div>
            
            <Separator orientation="vertical" className="h-6" />
            
            {/* أزرار التراجع والإعادة */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={undo}
                    disabled={!canUndo}
                    className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>تراجع (Ctrl+Z)</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={redo}
                    disabled={!canRedo}
                    className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Redo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>إعادة (Ctrl+Y)</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* قسم أدوات التحرير الوسطي */}
          <div className="flex items-center gap-2">
            {/* أدوات الرسم والتحديد */}
            <div className="flex items-center gap-1 p-1 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isEditMode ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setEditMode(true)}
                    className="h-8 w-8 p-0"
                  >
                    <MousePointer2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>أداة التحديد (V)</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Hand className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>أداة التحريك (H)</p>
                </TooltipContent>
              </Tooltip>
              
              <Separator orientation="vertical" className="h-4 mx-1" />
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Type className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>أداة النص (T)</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>مربع (R)</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Circle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>دائرة (O)</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* أزرار العرض */}
            <div className="flex items-center gap-1 p-1 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {(['desktop', 'tablet', 'mobile'] as ViewportSize[]).map((size) => {
                const Icon = viewportIcons[size]
                return (
                  <Tooltip key={size}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewport === size ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewport(size)}
                        className="h-8 w-8 p-0"
                      >
                        <Icon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {size === 'desktop' && 'سطح المكتب'}
                        {size === 'tablet' && 'الجهاز اللوحي'}
                        {size === 'mobile' && 'الهاتف المحمول'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* أدوات التكبير */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomOut}
                    className="h-8 w-8 p-0"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>تصغير</p>
                </TooltipContent>
              </Tooltip>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomReset}
                className="h-8 px-2 text-xs font-medium min-w-[50px]"
              >
                {zoom}%
              </Button>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomIn}
                    className="h-8 w-8 p-0"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>تكبير</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* أدوات المساعدة البصرية */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showGrid ? "default" : "ghost"}
                    size="sm"
                    onClick={toggleGrid}
                    className="h-8 w-8 p-0"
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>إظهار الشبكة</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showRulers ? "default" : "ghost"}
                    size="sm"
                    onClick={toggleRulers}
                    className="h-8 w-8 p-0"
                  >
                    <Ruler className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>إظهار المساطر</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showElementBounds ? "default" : "ghost"}
                    size="sm"
                    onClick={toggleElementBounds}
                    className="h-8 w-8 p-0"
                  >
                    {showElementBounds ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>إظهار حدود العناصر</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* قسم الأزرار الجانبية */}
          <div className="flex items-center gap-2">
            {/* أزرار اللوحات */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleLayersPanel}
                    className="h-8 w-8 p-0"
                  >
                    <Layers className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>لوحة الطبقات</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={togglePropertiesPanel}
                    className="h-8 w-8 p-0"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>لوحة الخصائص</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleTemplatesPanel}
                    className="h-8 w-8 p-0"
                  >
                    <Package className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>مكتبة القوالب</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAssetsPanel}
                    className="h-8 w-8 p-0"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>مكتبة الوسائط</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* أزرار العمل */}
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isPreviewMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewMode(!isPreviewMode)}
                    className="gap-2"
                  >
                    <Play className="h-4 w-4" />
                    معاينة
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>معاينة التصميم</p>
                </TooltipContent>
              </Tooltip>
              
              <Button
                variant="outline"
                size="sm"
                onClick={saveChanges}
                disabled={!isDirty || isSaving}
                className="gap-2 relative"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'حفظ...' : 'حفظ'}
                {isDirty && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 w-2 h-2 p-0 rounded-full"
                  />
                )}
              </Button>
              
              <Button
                size="sm"
                onClick={publishPage}
                disabled={isPublishing}
                className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Share2 className="h-4 w-4" />
                {isPublishing ? 'نشر...' : 'نشر'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
