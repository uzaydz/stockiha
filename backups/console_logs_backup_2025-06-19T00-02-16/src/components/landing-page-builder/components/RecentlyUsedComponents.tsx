import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RecentlyUsedComponentsProps {
  recentComponents: string[];
  onAddComponent: (type: string) => void;
}

const RecentlyUsedComponents: React.FC<RecentlyUsedComponentsProps> = ({ 
  recentComponents,
  onAddComponent
}) => {
  const { t } = useTranslation();
  
  if (recentComponents.length === 0) {
    return null;
  }
  
  // كل نوع مكون يحصل على لون مختلف
  const getComponentColor = (type: string): string => {
    switch (type) {
      case 'hero':
        return 'text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300';
      case 'form':
        return 'text-amber-600 border-amber-200 hover:bg-amber-50 hover:border-amber-300';
      case 'features':
        return 'text-green-600 border-green-200 hover:bg-green-50 hover:border-green-300';
      case 'testimonials':
        return 'text-purple-600 border-purple-200 hover:bg-purple-50 hover:border-purple-300';
      case 'text':
        return 'text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300';
      case 'image':
        return 'text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300';
      default:
        return 'text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300';
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mb-2"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-medium text-muted-foreground">{t('المستخدمة مؤخرًا')}</h3>
      </div>
      
      <ScrollArea className="pb-1">
        <div className="flex flex-wrap gap-1.5 pb-1">
          {recentComponents.map((componentType) => (
            <Button
              key={componentType}
              variant="outline"
              size="sm"
              className={cn(
                "h-7 px-2 text-xs whitespace-nowrap border-dashed",
                getComponentColor(componentType)
              )}
              onClick={() => onAddComponent(componentType)}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t(componentType)}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </motion.div>
  );
};

export default RecentlyUsedComponents;
