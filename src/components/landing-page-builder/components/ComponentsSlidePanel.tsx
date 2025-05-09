import React from 'react';
import { useTranslation } from 'react-i18next';
import { PlusSquare, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import SlidePanel from './SlidePanel';
import ComponentSelector from '../ComponentSelector';
import RecentlyUsedComponents from './RecentlyUsedComponents';
import { useRecentComponents } from '../hooks/useRecentComponents';

interface ComponentsSlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAddComponent: (type: string) => void;
}

const ComponentsSlidePanel: React.FC<ComponentsSlidePanelProps> = ({
  isOpen,
  onClose,
  onAddComponent
}) => {
  const { t } = useTranslation();
  const { recentComponents, addToRecent } = useRecentComponents();
  
  // Handler for adding components that also tracks in recent components
  const handleAddComponent = (type: string) => {
    onAddComponent(type);
    addToRecent(type);
    // Optionally close the panel after selection
    // onClose();
  };
  
  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={t('المكونات المتاحة')}
      icon={<PlusSquare className="text-primary" size={20} />}
      width={340}
    >
      <div className="space-y-6">
        {/* Recommended Components */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles size={16} className="text-amber-500" />
            <h3 className="font-medium text-sm">{t('موصى بها')}</h3>
          </div>
          
          <div className={cn(
            "grid gap-2",
            "grid-cols-2"
          )}>
            {['hero', 'form', 'features', 'testimonials'].map(type => (
              <motion.div
                key={type}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "rounded-lg p-3 cursor-pointer border flex flex-col items-center justify-center text-center h-[100px]",
                  "bg-gradient-to-br",
                  type === 'hero' && "from-blue-50 to-blue-100 border-blue-200 hover:border-blue-300",
                  type === 'form' && "from-amber-50 to-amber-100 border-amber-200 hover:border-amber-300",
                  type === 'features' && "from-green-50 to-green-100 border-green-200 hover:border-green-300",
                  type === 'testimonials' && "from-purple-50 to-purple-100 border-purple-200 hover:border-purple-300",
                )}
                onClick={() => handleAddComponent(type)}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full mb-2 flex items-center justify-center",
                  type === 'hero' && "bg-blue-100 text-blue-600",
                  type === 'form' && "bg-amber-100 text-amber-600",
                  type === 'features' && "bg-green-100 text-green-600",
                  type === 'testimonials' && "bg-purple-100 text-purple-600",
                )}>
                  <PlusSquare size={20} />
                </div>
                <span className="font-medium text-sm">{t(type)}</span>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Separator */}
        <Separator />
        
        {/* Recently Used Components */}
        <RecentlyUsedComponents 
          recentComponents={recentComponents} 
          onAddComponent={handleAddComponent} 
        />
        
        {/* All Available Components */}
        <ComponentSelector onAddComponent={handleAddComponent} />
      </div>
    </SlidePanel>
  );
};

export default ComponentsSlidePanel; 