import React from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, Eye, EyeOff, Copy, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { LandingPage } from '../types';

interface LayersPanelProps {
  page: LandingPage;
  activeComponentId: string | null;
  onActivateComponent: (id: string) => void;
  onToggleComponentActive: (id: string) => void;
  onDuplicateComponent: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  onMoveComponentUp: (id: string) => void;
  onMoveComponentDown: (id: string) => void;
}

const LayersPanel: React.FC<LayersPanelProps> = ({
  page,
  activeComponentId,
  onActivateComponent,
  onToggleComponentActive,
  onDuplicateComponent,
  onDeleteComponent,
  onMoveComponentUp,
  onMoveComponentDown,
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{page.components.length} {t('مكون')}</span>
      </div>
      
      <AnimatePresence initial={false}>
        {page.components.length === 0 ? (
          <div className="text-center py-8">
            <Layers size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">{t('لا توجد مكونات')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {page.components.map((component, index) => {
              const isActive = component.id === activeComponentId;
              
              return (
                <motion.div
                  key={component.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className={cn(
                    "border rounded-lg p-3",
                    isActive ? "border-primary/50 bg-primary/5" : "border-border",
                    !component.isActive && "opacity-60"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div 
                      className="flex items-center gap-2 flex-1 cursor-pointer"
                      onClick={() => onActivateComponent(component.id)}
                    >
                      <div className={cn(
                        "h-6 w-6 rounded-md flex items-center justify-center",
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <span className="text-xs font-medium">{index + 1}</span>
                      </div>
                      <span className={cn(
                        "font-medium text-sm",
                        isActive && "text-primary"
                      )}>
                        {t(component.type)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onToggleComponentActive(component.id)}
                        title={component.isActive ? t('إخفاء') : t('إظهار')}
                      >
                        {component.isActive ? (
                          <Eye size={14} />
                        ) : (
                          <EyeOff size={14} />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-1 border-t">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => onMoveComponentUp(component.id)}
                        disabled={index === 0}
                        title={t('تحريك لأعلى')}
                      >
                        <ChevronUp size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => onMoveComponentDown(component.id)}
                        disabled={index === page.components.length - 1}
                        title={t('تحريك لأسفل')}
                      >
                        <ChevronDown size={14} />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-blue-500"
                        onClick={() => onDuplicateComponent(component.id)}
                        title={t('نسخ')}
                      >
                        <Copy size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => onDeleteComponent(component.id)}
                        title={t('حذف')}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LayersPanel; 