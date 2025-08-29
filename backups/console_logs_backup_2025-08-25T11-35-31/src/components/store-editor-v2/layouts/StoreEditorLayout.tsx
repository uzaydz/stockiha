import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Eye, Save, Monitor, Tablet, Smartphone, RefreshCw, 
  Palette, Type, Image, Layout, Layers, Code, Zap,
  ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTenant } from '@/context/TenantContext';
import { StoreEditorCanvas, PropertiesPanel } from '../components';

interface StoreEditorLayoutProps {
  children?: React.ReactNode;
  className?: string;
}

export type EditorTool = 
  | 'design' 
  | 'typography' 
  | 'media' 
  | 'layout' 
  | 'components' 
  | 'code' 
  | 'effects'
  | null;

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

const StoreEditorLayout: React.FC<StoreEditorLayoutProps> = ({ children, className }) => {
  const { currentOrganization } = useTenant();
  const [activeTool, setActiveTool] = useState<EditorTool>(null);
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleToolSelect = useCallback((tool: EditorTool) => {
    if (activeTool === tool) {
      setActiveTool(null);
      setIsSidebarOpen(false);
    } else {
      setActiveTool(tool);
      setIsSidebarOpen(true);
    }
  }, [activeTool]);

  const handleDeviceChange = useCallback((device: DeviceType) => {
    setDeviceType(device);
  }, []);

  const togglePreview = useCallback(() => {
    setIsPreviewMode(!isPreviewMode);
    if (!isPreviewMode) {
      setActiveTool(null);
      setIsSidebarOpen(false);
    }
  }, [isPreviewMode]);

  const closeSidebar = useCallback(() => {
    setActiveTool(null);
    setIsSidebarOpen(false);
  }, []);

  // تحسين الأداء: استخدام useMemo للأدوات
  const sidebarTools = useMemo(() => [
    { id: 'design' as EditorTool, icon: Palette, label: 'التصميم', description: 'الألوان والخلفيات', color: 'bg-pink-500' },
    { id: 'typography' as EditorTool, icon: Type, label: 'النصوص', description: 'الخطوط والتنسيق', color: 'bg-blue-500' },
    { id: 'media' as EditorTool, icon: Image, label: 'الوسائط', description: 'الصور والفيديوهات', color: 'bg-green-500' },
    { id: 'layout' as EditorTool, icon: Layout, label: 'التخطيط', description: 'ترتيب العناصر', color: 'bg-orange-500' },
    { id: 'components' as EditorTool, icon: Layers, label: 'المكونات', description: 'عناصر المتجر', color: 'bg-purple-500' },
    { id: 'code' as EditorTool, icon: Code, label: 'الكود', description: 'HTML/CSS مخصص', color: 'bg-gray-500' },
    { id: 'effects' as EditorTool, icon: Zap, label: 'التأثيرات', description: 'الحركات والانتقالات', color: 'bg-yellow-500' },
  ], []);

  return (
    <div className={cn("h-screen bg-white dark:bg-gray-900 flex flex-col overflow-hidden", className)}>
      {/* شريط العلوي المحسن */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between shadow-sm z-50">
        {/* معلومات المتجر */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">🏪</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                محرر المتجر V2
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {currentOrganization?.name || 'متجرك الإلكتروني'}
              </p>
            </div>
          </div>
          
          {/* مؤشر الحفظ */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-green-600 dark:text-green-400">
              محفوظ تلقائياً
            </span>
          </div>
        </div>
        
        {/* أدوات التحكم */}
        <div className="flex items-center gap-3">
          {/* اختيار نوع الجهاز */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {[
              { type: 'desktop' as DeviceType, icon: Monitor, label: 'سطح المكتب' },
              { type: 'tablet' as DeviceType, icon: Tablet, label: 'تابلت' },
              { type: 'mobile' as DeviceType, icon: Smartphone, label: 'جوال' }
            ].map(({ type, icon: Icon, label }) => (
              <Button
                key={type}
                variant={deviceType === type ? "default" : "ghost"}
                size="sm"
                onClick={() => handleDeviceChange(type)}
                className={cn(
                  "h-8 w-8 p-0",
                  deviceType === type 
                    ? "bg-white dark:bg-gray-700 shadow-sm" 
                    : "hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
                title={label}
              >
                <Icon className="w-4 h-4" />
              </Button>
            ))}
          </div>

          {/* أزرار الإجراءات */}
          <Button
            variant="outline"
            size="sm"
            onClick={togglePreview}
            className={cn(
              "gap-2",
              isPreviewMode && "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
            )}
          >
            <Eye className="w-4 h-4" />
            {isPreviewMode ? 'تحرير' : 'معاينة'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/store/${currentOrganization?.id}`, '_blank')}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            عرض المتجر
          </Button>
          
          <Button
            size="sm"
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            <Save className="w-4 h-4" />
            نشر
          </Button>
        </div>
      </header>

      {/* شريط الأدوات */}
      {!isPreviewMode && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-2">
          <div className="flex items-center gap-1">
            {sidebarTools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              
              return (
                <Button
                  key={tool.id}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleToolSelect(tool.id)}
                  className={cn(
                    "gap-2 h-9",
                    isActive && "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                  )}
                  title={tool.description}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{tool.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* المحتوى الرئيسي */}
      <div className="flex-1 flex overflow-hidden">
        {/* لوحة الخصائص الجانبية */}
        <AnimatePresence>
          {isSidebarOpen && activeTool && !isPreviewMode && (
            <motion.div
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col"
            >
              {/* رأس اللوحة */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const tool = sidebarTools.find(t => t.id === activeTool);
                    if (!tool) return null;
                    const Icon = tool.icon;
                    return (
                      <>
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white", tool.color)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{tool.label}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{tool.description}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeSidebar}
                  className="h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* محتوى اللوحة */}
              <div className="flex-1 overflow-auto">
                <PropertiesPanel
                  activeTool={activeTool}
                  onClose={closeSidebar}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* منطقة التحرير */}
        <div className="flex-1 bg-gray-50 dark:bg-gray-800">
          <StoreEditorCanvas
            deviceType={deviceType}
            isPreviewMode={isPreviewMode}
          >
            {children}
          </StoreEditorCanvas>
        </div>
      </div>
    </div>
  );
};

export default StoreEditorLayout;