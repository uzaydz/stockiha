import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Sliders } from 'lucide-react';
import ComponentEditorWrapper from '../ComponentEditorWrapper';
import { LandingPageComponent } from '../types';

interface SettingsPanelProps {
  activeComponent: LandingPageComponent | null;
  onUpdateSettings: (settings: Record<string, any>) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  activeComponent,
  onUpdateSettings
}) => {
  const { t } = useTranslation();

  return (
    <motion.div 
      className="h-full"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full overflow-hidden">
        <div className="p-4 border-b bg-muted/40 flex items-center gap-2">
          {activeComponent ? (
            <Sliders size={18} className="text-primary" />
          ) : (
            <Settings size={18} className="text-muted-foreground" />
          )}
          <h2 className="font-semibold text-lg">
            {activeComponent
              ? t('إعدادات المكون')
              : t('اختر مكونًا للتعديل')}
          </h2>
        </div>
        <div className="h-[calc(100%-60px)] overflow-hidden">
          <AnimatePresence mode="wait">
            {activeComponent ? (
              <motion.div 
                key={activeComponent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full p-4"
              >
                <div className="h-full overflow-y-auto">
                  <ComponentEditorWrapper 
                    component={activeComponent} 
                    onUpdateSettings={onUpdateSettings} 
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full p-8 text-center"
              >
                <Settings size={48} className="mb-4 text-muted-foreground/50" />
                <h3 className="text-base font-medium mb-2">{t('اختر مكونًا من القائمة')}</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {t('انقر على أي مكون في الصفحة للبدء في تحرير خصائصه ومحتواه')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
};

export default SettingsPanel;
