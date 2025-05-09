import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Settings, 
  Layers, 
  PlusSquare, 
  Layout, 
  Image, 
  Palette,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';

interface SidebarNavigationProps {
  activePanel: string;
  onPanelChange: (panel: string) => void;
  children: React.ReactNode; // محتوى اللوحة المنبثقة
}

const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  activePanel,
  onPanelChange,
  children
}) => {
  const { t } = useTranslation();
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  
  const navigationItems = [
    { id: 'settings', icon: Settings, label: t('الإعدادات'), color: 'from-blue-500 to-sky-600' },
    { id: 'components', icon: PlusSquare, label: t('المكونات'), color: 'from-emerald-500 to-green-600' },
    { id: 'layers', icon: Layers, label: t('الطبقات'), color: 'from-amber-500 to-orange-600' },
    { id: 'layout', icon: Layout, label: t('التخطيط'), color: 'from-violet-500 to-purple-600' },
    { id: 'media', icon: Image, label: t('الوسائط'), color: 'from-rose-500 to-pink-600' },
    { id: 'theme', icon: Palette, label: t('المظهر'), color: 'from-indigo-500 to-blue-600' },
  ];

  const currentPanel = navigationItems.find(item => item.id === activePanel);
  
  // معالج النقر المعدل مع حماية من النقرات المتكررة
  const handlePanelToggle = (panelId: string, isActive: boolean) => {
    const now = Date.now();
    // منع النقرات المتكررة خلال 300 مللي ثانية
    if (now - lastClickTime < 300) {
      return;
    }
    setLastClickTime(now);
    
    // تبديل اللوحة
    onPanelChange(isActive ? '' : panelId);
  };

  return (
    <div className="fixed top-[160px] left-0 h-[calc(100vh-160px)] z-30 flex">
      {/* التخطيط الجديد - شريط أدوات ثابت في اليسار والبانل يظهر على يمينه */}
      <div className="relative flex h-full">
        {/* شريط الأدوات الضيق في أقصى اليسار - تصميم محسن */}
        <motion.div 
          className="h-full w-16 bg-background/95 border-r border-r-primary/10 flex flex-col shadow-lg backdrop-blur-sm rounded-r-xl"
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {/* أيقونات الأدوات */}
          <div className="flex flex-col items-center py-8 gap-6 flex-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePanel === item.id;
              
              return (
                <TooltipProvider key={item.id} delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "w-12 h-12 rounded-xl transition-all relative group overflow-hidden",
                            isActive 
                              ? `bg-gradient-to-br ${item.color} text-white shadow-md border border-white/20` 
                              : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                          )}
                          onClick={() => handlePanelToggle(item.id, isActive)}
                        >
                          <motion.div
                            initial={false}
                            animate={isActive ? { scale: 1 } : { scale: 1 }}
                            className={cn(
                              "absolute inset-0 opacity-0 transition-opacity duration-300",
                              isActive ? "opacity-100" : "group-hover:opacity-30"
                            )}
                            style={{
                              background: isActive ? `linear-gradient(135deg, ${item.color.split(' ')[0].replace('from-', '')}, ${item.color.split(' ')[1].replace('to-', '')})` : '',
                            }}
                          />
                          <Icon 
                            size={22} 
                            className={cn(
                              "transition-all duration-300 relative z-10",
                              isActive 
                                ? "" 
                                : "group-hover:scale-110"
                            )}
                          />
                        </Button>
                        
                        {/* مؤشر التحديد المحسن */}
                        {isActive && (
                          <motion.div 
                            layoutId="activeIndicator"
                            className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-white rounded-l-full shadow-md"
                          />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={6} className="font-medium bg-black/80 text-white border-none px-3 py-1.5 rounded-md">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </motion.div>

        {/* اللوحة المنبثقة للأداة النشطة - على يمين الشريط - تصميم محسن */}
        <AnimatePresence mode="wait">
          {activePanel && (
            <motion.div
              initial={{ width: 0, opacity: 0, x: -20 }}
              animate={{ width: 340, opacity: 1, x: 0 }}
              exit={{ width: 0, opacity: 0, x: -20 }}
              transition={{ type: 'spring', damping: 26, stiffness: 350 }}
              className="h-full overflow-hidden"
              style={{ position: 'absolute', left: '64px' }}
            >
              <Card className="h-full border border-primary/10 shadow-xl flex flex-col overflow-hidden rounded-xl bg-card/95 backdrop-blur-sm">
                {/* رأس اللوحة - تصميم محسن */}
                <motion.div 
                  className="h-16 border-b border-b-primary/10 bg-gradient-to-r from-background to-background/80 flex items-center justify-between px-5"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  {currentPanel && (
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center text-white shadow-inner",
                        `bg-gradient-to-br ${currentPanel.color}`
                      )}>
                        <currentPanel.icon size={20} />
                      </div>
                      <h3 className="font-semibold text-lg">{currentPanel.label}</h3>
                    </div>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
                    onClick={() => onPanelChange('')}
                  >
                    <X size={18} />
                  </Button>
                </motion.div>
                
                {/* محتوى اللوحة */}
                <ScrollArea className="flex-1">
                  <motion.div 
                    className="p-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                  >
                    {children}
                  </motion.div>
                </ScrollArea>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SidebarNavigation; 