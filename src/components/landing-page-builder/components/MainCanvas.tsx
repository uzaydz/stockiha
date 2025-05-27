import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Plus, Layers, PlusCircle, Settings, FileText } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';

interface MainCanvasProps {
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
  onOpenComponentsPanel: () => void;
}

const MainCanvas: React.FC<MainCanvasProps> = ({
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
  onDragCancel,
  onOpenComponentsPanel
}) => {
  const { t } = useTranslation();
  const componentIds = page.components.map(component => component.id);
  
  return (
    <motion.div 
      className="h-full w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full overflow-hidden shadow-sm rounded-md border-primary/10">
        {/* الشريط العلوي */}
        <div className="h-12 border-b bg-background flex justify-between items-center px-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-primary/10 rounded-md flex items-center justify-center text-primary">
              <FileText size={14} />
            </div>
            <div>
              <h2 className="font-medium text-sm leading-tight">{page.name || t('صفحة هبوط جديدة')}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 h-6 border-primary/15 text-xs">
              <Layers size={12} className="text-primary" />
              <span>{page.components.length}</span>
            </Badge>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={onOpenComponentsPanel}
                    className="h-6 gap-1 px-2"
                  >
                    <PlusCircle size={12} />
                    <span className="text-xs">{t('إضافة مكون')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t('إضافة مكون جديد إلى الصفحة')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* منطقة المحتوى مع التمرير */}
        <ScrollArea className="h-[calc(100%-48px)] bg-accent/5">
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
              {/* ظلال عند التمرير */}
              <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-accent/10 to-transparent pointer-events-none z-10" />
              
              {/* منطقة المكونات */}
              <div className="mx-auto px-6 py-6 min-h-full max-w-4xl">
                {page.components.length === 0 ? (
                  <EmptyCanvasPlaceholder onAddClick={onOpenComponentsPanel} />
                ) : (
                  <div className="space-y-3">
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
                    
                    {/* زر إضافة مكون جديد في النهاية */}
                    <motion.div 
                      className="flex justify-center mt-6 mb-12"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Button 
                        variant="outline" 
                        className="border-dashed px-4 py-4 h-auto flex flex-col gap-1.5 hover:bg-primary/5"
                        onClick={onOpenComponentsPanel}
                      >
                        <Plus size={16} className="text-primary" />
                        <span className="text-xs">{t('إضافة مكون جديد')}</span>
                      </Button>
                    </motion.div>
                  </div>
                )}
              </div>
              
              {/* ظلال عند التمرير */}
              <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-accent/10 to-transparent pointer-events-none z-10" />
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

export default MainCanvas;
