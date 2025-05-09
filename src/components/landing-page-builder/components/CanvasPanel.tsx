import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus,
  Layers,
  ArrowDown
} from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  DndContext, 
  closestCenter,
  DragOverlay,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import SortableItem from './SortableItem';
import ComponentDragPreview from './ComponentDragPreview';
import EmptyCanvasPlaceholder from '../EmptyCanvasPlaceholder';
import { LandingPage, LandingPageComponent } from '../types';

interface CanvasPanelProps {
  page: LandingPage;
  activeComponentId: string | null;
  hoveredComponentId: string | null;
  draggedComponent: LandingPageComponent | null;
  sensors: any;
  modifiers: any[];
  dropAnimation: any;
  onActivateComponent: (id: string) => void;
  onToggleComponentActive: (id: string) => void;
  onDuplicateComponent: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  onMoveComponentUp: (id: string) => void;
  onMoveComponentDown: (id: string) => void;
  onHoverComponent: (id: string | null) => void;
  onDragStart: (event: any) => void;
  onDragEnd: (event: any) => void;
  onDragCancel: (event: any) => void;
}

const CanvasPanel: React.FC<CanvasPanelProps> = ({
  page,
  activeComponentId,
  hoveredComponentId,
  draggedComponent,
  sensors,
  modifiers,
  dropAnimation,
  onActivateComponent,
  onToggleComponentActive,
  onDuplicateComponent,
  onDeleteComponent,
  onMoveComponentUp,
  onMoveComponentDown,
  onHoverComponent,
  onDragStart,
  onDragEnd,
  onDragCancel
}) => {
  const { t } = useTranslation();
  const componentIds = page.components.map(component => component.id);
  
  return (
    <motion.div 
      className="h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="h-full overflow-hidden">
        <div className="p-4 border-b bg-muted/40 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-primary" />
            <h2 className="font-semibold text-lg">{t('محتوى الصفحة')}</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground px-2 py-1 rounded-md bg-muted flex items-center gap-1">
              <Layers size={14} className="text-primary/70" />
              {page.components.length} {t('مكون')}
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => document.getElementById('component-selector')?.focus()}
                    className="shadow-sm"
                  >
                    <Plus size={16} className="mr-1" />
                    {t('إضافة')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t('إضافة مكون جديد')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <ScrollArea className="h-[calc(100%-60px)]">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
            modifiers={modifiers}
            measuring={{
              droppable: {
                strategy: MeasuringStrategy.Always
              }
            }}
          >
            <SortableContext
              items={componentIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="px-4 py-4 min-h-[400px]">
                {page.components.length === 0 ? (
                  <EmptyCanvasPlaceholder onAddClick={() => document.getElementById('component-selector')?.focus()} />
                ) : (
                  <div className="space-y-3 rounded-lg overflow-hidden">
                    <AnimatePresence mode="popLayout">
                      {page.components.map((component, index) => (
                        <SortableItem
                          key={component.id}
                          id={component.id}
                          component={component}
                          isActive={component.id === activeComponentId}
                          isHovered={component.id === hoveredComponentId}
                          index={index}
                          totalItems={page.components.length}
                          onActivate={onActivateComponent}
                          onToggleActive={onToggleComponentActive}
                          onDuplicate={onDuplicateComponent}
                          onDelete={onDeleteComponent}
                          onMoveUp={onMoveComponentUp}
                          onMoveDown={onMoveComponentDown}
                          onHover={onHoverComponent}
                        />
                      ))}
                    </AnimatePresence>
                    
                    {/* مؤشر لإضافة مكون جديد في نهاية القائمة */}
                    <div 
                      className="add-component-zone flex items-center justify-center cursor-pointer"
                      onClick={() => document.getElementById('component-selector')?.focus()}
                    >
                      <AnimatePresence>
                        {page.components.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            whileHover={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center"
                          >
                            <ArrowDown size={16} className="mb-1 text-primary" />
                            <span className="text-xs text-muted-foreground">{t('إضافة مكون هنا')}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            </SortableContext>
            
            <DragOverlay dropAnimation={dropAnimation}>
              {draggedComponent && <ComponentDragPreview component={draggedComponent} />}
            </DragOverlay>
          </DndContext>
        </ScrollArea>
      </Card>
    </motion.div>
  );
};

export default CanvasPanel; 