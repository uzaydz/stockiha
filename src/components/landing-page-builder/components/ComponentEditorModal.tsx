import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Settings, Check, ChevronDown, Save, Trash2, Eye, EyeOff, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

import ComponentEditor from '../ComponentEditor';
import { LandingPageComponent } from '../types';

interface ComponentEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  component: LandingPageComponent | null;
  onUpdateSettings: (settings: Record<string, any>) => void;
  onToggleComponentActive: (id: string) => void;
  onDuplicateComponent?: (id: string) => void;
  onDeleteComponent?: (id: string) => void;
}

const ComponentEditorModal: React.FC<ComponentEditorModalProps> = ({
  isOpen,
  onClose,
  component,
  onUpdateSettings,
  onToggleComponentActive,
  onDuplicateComponent,
  onDeleteComponent
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('settings');
  
  if (!component) return null;
  
  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 0.6 }
  };
  
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0 }
  };

  const handleDuplicate = () => {
    if (onDuplicateComponent && component.id) {
      onDuplicateComponent(component.id);
      onClose();
    }
  };

  const handleDelete = () => {
    if (onDeleteComponent && component.id) {
      onDeleteComponent(component.id);
      onClose();
    }
  };
  
  return (
    <AnimatePresence>
      {isOpen && component && (
        <>
          {/* Backdrop - الخلفية المعتمة */}
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={backdropVariants}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal - النافذة المنبثقة */}
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={modalVariants}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 35 
            }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 
                     w-[94%] max-w-2xl max-h-[90vh] bg-background rounded-xl shadow-2xl
                     overflow-hidden border"
          >
            {/* Header - الرأس */}
            <div className="p-5 border-b bg-muted/20 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <Settings size={18} />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">{t('تحرير المكون')}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-card/80">
                      {t(component.type)}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1",
                      component.isActive ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"
                    )}>
                      {component.isActive ? <Eye size={10} /> : <EyeOff size={10} />}
                      {component.isActive ? t('ظاهر') : t('مخفي')}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* أزرار إضافية للتحكم بالمكون */}
                {onDuplicateComponent && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t('نسخ المكون')}
                    onClick={handleDuplicate}
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/5"
                  >
                    <Copy size={16} />
                  </Button>
                )}
                {onDeleteComponent && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t('حذف المكون')}
                    onClick={handleDelete}
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 rounded-lg ml-2"
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
            
            {/* Content - المحتوى */}
            <Tabs 
              defaultValue="settings" 
              className="w-full"
              value={activeTab}
              onValueChange={setActiveTab}
            >
              <div className="px-5 pt-4 border-b bg-muted/10">
                <TabsList className="w-full bg-muted/60">
                  <TabsTrigger value="settings" className="flex-1 data-[state=active]:bg-background">{t('الإعدادات')}</TabsTrigger>
                  <TabsTrigger value="style" className="flex-1 data-[state=active]:bg-background">{t('المظهر')}</TabsTrigger>
                  <TabsTrigger value="advanced" className="flex-1 data-[state=active]:bg-background">{t('متقدم')}</TabsTrigger>
                </TabsList>
              </div>
              
              <ScrollArea className="max-h-[calc(90vh-180px)]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TabsContent value="settings" className="p-6 min-h-[400px] focus-visible:outline-none focus-visible:ring-0">
                      <ComponentEditor 
                        component={component} 
                        onUpdateSettings={onUpdateSettings} 
                      />
                    </TabsContent>
                    
                    <TabsContent value="style" className="p-6 flex items-center justify-center min-h-[400px] focus-visible:outline-none focus-visible:ring-0">
                      <div className="text-center p-8">
                        <div className="w-16 h-16 bg-muted/50 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <ChevronDown size={24} className="text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">{t('خيارات المظهر')}</h3>
                        <p className="text-muted-foreground text-sm max-w-md">
                          {t('ستكون إعدادات المظهر والألوان متاحة قريبًا لتخصيص شكل المكون بشكل كامل.')}
                        </p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="advanced" className="p-6 flex items-center justify-center min-h-[400px] focus-visible:outline-none focus-visible:ring-0">
                      <div className="text-center p-8">
                        <div className="w-16 h-16 bg-muted/50 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <ChevronDown size={24} className="text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">{t('إعدادات متقدمة')}</h3>
                        <p className="text-muted-foreground text-sm max-w-md">
                          {t('الإعدادات المتقدمة للمكون ستكون متاحة قريبًا، مثل التحكم بالحركة والتأثيرات وسلوك المكون.')}
                        </p>
                      </div>
                    </TabsContent>
                  </motion.div>
                </AnimatePresence>
              </ScrollArea>
              
              {/* Footer - التذييل */}
              <div className="p-4 flex items-center justify-between border-t bg-muted/20">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => component.id && onToggleComponentActive(component.id)}
                  className="gap-1.5"
                >
                  {component.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                  {component.isActive ? t('إخفاء') : t('إظهار')}
                </Button>
                
                <Button
                  variant="default"
                  size="sm"
                  onClick={onClose}
                  className="gap-1.5"
                >
                  <Save size={14} />
                  {t('حفظ التغييرات')}
                </Button>
              </div>
            </Tabs>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ComponentEditorModal; 