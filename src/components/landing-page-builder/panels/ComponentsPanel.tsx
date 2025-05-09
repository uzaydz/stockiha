import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { PlusCircle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

import ComponentSelector from '../ComponentSelector';
import { useRecentComponents } from '../hooks/useRecentComponents';

interface ComponentsPanelProps {
  onAddComponent: (type: string) => void;
}

const ComponentsPanel: React.FC<ComponentsPanelProps> = ({
  onAddComponent
}) => {
  const { t } = useTranslation();
  const { addToRecent } = useRecentComponents();
  
  // Handler for adding components that also tracks in recent components
  const handleAddComponent = (type: string) => {
    onAddComponent(type);
    addToRecent(type);
  };
  
  return (
    <motion.div 
      className="space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* عنوان محسن */}
      <div className="flex items-center justify-between bg-primary/5 p-3 rounded-lg border border-primary/10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary/15 rounded-md flex items-center justify-center text-primary">
            <PlusCircle size={18} />
          </div>
          <div>
            <h3 className="text-sm font-medium">{t('إضافة مكون')}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">اختر مكوناً لإضافته للصفحة</p>
          </div>
        </div>
        <div className="h-7 w-7 bg-primary/10 text-primary rounded-full flex items-center justify-center">
          <Sparkles size={14} />
        </div>
      </div>
      
      {/* عرض كل المكونات المتاحة مباشرة */}
      <ComponentSelector onAddComponent={handleAddComponent} />
    </motion.div>
  );
};

export default ComponentsPanel; 