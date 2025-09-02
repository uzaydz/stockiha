import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Layers, 
  Layout, 
  Image, 
  Palette,
  Settings,
  X,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { useTheme } from '@/context/ThemeContext';

interface SidebarNavigationProps {
  activePanel: string;
  onPanelChange: (panel: string) => void;
  children: React.ReactNode;
}

const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  activePanel,
  onPanelChange,
  children
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  
  const navigationItems = [
    { 
      id: 'components', 
      icon: Plus, 
      label: 'المكونات', 
      description: 'إضافة وتحرير عناصر الصفحة',
      color: 'bg-emerald-500',
      hoverColor: 'hover:bg-emerald-600'
    },
    { 
      id: 'layers', 
      icon: Layers, 
      label: 'الطبقات', 
      description: 'ترتيب وإدارة طبقات المحتوى',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    { 
      id: 'layout', 
      icon: Layout, 
      label: 'التخطيط', 
      description: 'تصميم تخطيط الصفحة',
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600'
    },
    { 
      id: 'media', 
      icon: Image, 
      label: 'الوسائط', 
      description: 'إدارة الصور والملفات',
      color: 'bg-pink-500',
      hoverColor: 'hover:bg-pink-600'
    },
    { 
      id: 'theme', 
      icon: Palette, 
      label: 'المظهر', 
      description: 'تخصيص ألوان ونمط الموقع',
      color: 'bg-indigo-500',
      hoverColor: 'hover:bg-indigo-600'
    },
    { 
      id: 'settings', 
      icon: Settings, 
      label: 'الإعدادات', 
      description: 'إدارة إعدادات الموقع العامة',
      color: 'bg-gray-500',
      hoverColor: 'hover:bg-gray-600'
    },
  ];

  const currentPanel = navigationItems.find(item => item.id === activePanel);
  
  const handlePanelToggle = useCallback((panelId: string) => {
    if (activePanel === panelId) {
      onPanelChange('');
      setIsOpen(false);
    } else {
      onPanelChange(panelId);
      setIsOpen(true);
    }
  }, [activePanel, onPanelChange]);
  
  // تأثير لفتح الشريط الجانبي تلقائياً عند تغيير activePanel
  React.useEffect(() => {
    if (activePanel && activePanel !== '') {
      setIsOpen(true);
    }
  }, [activePanel]);

  const closePanel = useCallback(() => {
    onPanelChange('');
    setIsOpen(false);
  }, [onPanelChange]);

  return (
    <>
      {/* شريط الأدوات الجانبي */}
      <div className="fixed top-1/2 -translate-y-1/2 right-4 z-50" dir="rtl">
        <motion.div 
          className={cn(
            "w-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden",
            "backdrop-blur-sm bg-white/90 dark:bg-gray-800/90"
          )}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {/* رأس الشريط */}
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          </div>

          {/* أيقونات الأدوات */}
          <div className="p-2 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePanel === item.id;
              
              return (
                <TooltipProvider key={item.id} delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "w-12 h-12 p-0 rounded-xl transition-all duration-200 relative group",
                          isActive 
                            ? `${item.color} text-white shadow-lg` 
                            : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                        )}
                        onClick={() => handlePanelToggle(item.id)}
                      >
                        <Icon size={20} />
                        
                        {/* مؤشر النشاط */}
                        {isActive && (
                          <motion.div 
                            layoutId="activeIndicator"
                            className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-white dark:bg-gray-800 rounded-r-full"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="left" 
                      sideOffset={8}
                      className="font-medium bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-none px-3 py-2 rounded-lg shadow-lg"
                    >
                      <div className="text-center">
                        <div className="font-semibold text-sm">{item.label}</div>
                        <div className="text-xs opacity-80">{item.description}</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* النافذة المنبثقة */}
      <AnimatePresence mode="wait">
        {isOpen && activePanel && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* خلفية معتمة */}
            <motion.div
              className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePanel}
            />
            
            {/* النافذة المنبثقة */}
            <motion.div
              className="relative w-full max-w-2xl h-[90vh] overflow-hidden"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{ zIndex: 9998 }}
            >
              <Card 
                className={cn(
                  "w-full h-full border-0 shadow-2xl overflow-hidden",
                  "bg-white dark:bg-gray-800",
                  "backdrop-blur-sm bg-white/95 dark:bg-gray-800/95"
                )}
                onClick={(e) => e.stopPropagation()}
                style={{ 
                  position: 'relative',
                  zIndex: 1,
                  contain: 'layout style paint',
                  willChange: 'auto'
                }}
              >
                {/* رأس النافذة */}
                <div className={cn(
                  "flex items-center justify-between p-6 border-b",
                  "border-gray-200 dark:border-gray-700",
                  "bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700"
                )}>
                  <div className="flex items-center gap-4">
                    {currentPanel && (
                      <>
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center text-white",
                          currentPanel.color
                        )}>
                          <currentPanel.icon size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                            {currentPanel.label}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {currentPanel.description}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={closePanel}
                  >
                    <X size={20} />
                  </Button>
                </div>
                
                {/* محتوى النافذة */}
                <div 
                  className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 max-h-full"
                  onWheel={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                >
                  {children ? (
                    <div className="w-full h-full p-4 flex flex-col overflow-hidden">
                      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                        {children}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 flex flex-col items-center justify-center h-40 text-center">
                      <div className="text-4xl mb-4">
                        {currentPanel?.id === 'settings' && '⚙️'}
                        {currentPanel?.id === 'components' && '🧩'}
                        {currentPanel?.id === 'layers' && '📚'}
                        {currentPanel?.id === 'layout' && '📐'}
                        {currentPanel?.id === 'media' && '🖼️'}
                        {currentPanel?.id === 'theme' && '🎨'}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                        يتم تحضير محتوى {currentPanel?.label}...
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        سيكون متاحًا قريبًا
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SidebarNavigation;
