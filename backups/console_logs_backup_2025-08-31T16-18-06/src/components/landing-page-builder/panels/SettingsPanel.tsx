import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Sliders } from 'lucide-react';

import ComponentEditor from '../ComponentEditor';
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
    <div className="h-full flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {activeComponent ? (
          <motion.div 
            key={activeComponent.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="h-full flex flex-col overflow-hidden"
          >
            {/* رأس ثابت */}
            <div className="flex-shrink-0 pb-4 border-b">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-md font-medium">
                  {t(activeComponent.type)}
                </span>
                {!activeComponent.isActive && (
                  <span className="px-2.5 py-1 bg-yellow-500/10 text-yellow-600 text-xs rounded-md font-medium">
                    {t('مخفي')}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-medium">{t('تحرير إعدادات الـ')} {t(activeComponent.type)}</h3>
            </div>
            
            {/* المحتوى القابل للسكرول */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 mt-4">
              <div className="rounded-lg border bg-card/50 p-4">
                <ComponentEditor 
                  component={activeComponent} 
                  onUpdateSettings={onUpdateSettings} 
                />
              </div>
              
              <div className="mt-6 pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  {t('التغييرات تحفظ تلقائيًا عند إدخالها')}
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <Sliders size={48} className="mb-4 text-muted-foreground/50" />
            <h3 className="text-base font-medium mb-2">{t('اختر مكونًا من الصفحة')}</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {t('انقر على أي مكون في الصفحة للبدء في تحرير خصائصه ومحتواه')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPanel;
