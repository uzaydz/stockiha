import React from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Sliders } from 'lucide-react';
import { motion } from 'framer-motion';

import SlidePanel from './SlidePanel';
import ComponentEditorWrapper from '../ComponentEditorWrapper';
import { LandingPageComponent } from '../types';

interface SettingsSlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeComponent: LandingPageComponent | null;
  onUpdateSettings: (settings: Record<string, any>) => void;
}

const SettingsSlidePanel: React.FC<SettingsSlidePanelProps> = ({
  isOpen,
  onClose,
  activeComponent,
  onUpdateSettings
}) => {
  const { t } = useTranslation();
  
  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={activeComponent ? t('إعدادات المكون') : t('الإعدادات')}
      icon={<Settings className="text-primary" size={20} />}
      width={460}
    >
      {activeComponent ? (
        <motion.div 
          key={activeComponent.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <ComponentEditorWrapper 
            component={activeComponent} 
            onUpdateSettings={onUpdateSettings} 
          />
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
    </SlidePanel>
  );
};

export default SettingsSlidePanel; 