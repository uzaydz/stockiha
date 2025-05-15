import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableComponent from './SortableComponent';
import ComponentSelector from './ComponentSelector';
import ComponentEditor from './ComponentEditor';
import { StoreComponent, ComponentType } from '@/types/store-editor';

interface ComponentsPanelProps {
  components: StoreComponent[];
  activeComponent: StoreComponent | null;
  onActivateComponent: (component: StoreComponent) => void;
  onToggleComponentActive: (id: string) => void;
  onRemoveComponent: (id: string) => void;
  onAddComponent: (type: ComponentType) => void;
  onUpdateSettings: (id: string, settings: any) => void;
  onDragEnd: (event: DragEndEvent) => void;
}

const ComponentsPanel: React.FC<ComponentsPanelProps> = ({
  components,
  activeComponent,
  onActivateComponent,
  onToggleComponentActive,
  onRemoveComponent,
  onAddComponent,
  onUpdateSettings,
  onDragEnd
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4">مكونات المتجر</h2>
            <p className="text-muted-foreground mb-6">
              اسحب العناصر لإعادة ترتيبها. انقر على عنصر لتعديل خصائصه.
            </p>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={components.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {components.length === 0 ? (
                    <div className="text-center p-8 border border-dashed rounded-lg">
                      <p>لا توجد مكونات. أضف مكوناً باستخدام القائمة.</p>
                    </div>
                  ) : (
                    components.map((component) => (
                      <SortableComponent
                        key={component.id}
                        component={component}
                        isActive={activeComponent?.id === component.id}
                        onActivate={() => onActivateComponent(component)}
                        onToggleActive={() => onToggleComponentActive(component.id)}
                        onRemove={() => onRemoveComponent(component.id)}
                      />
                    ))
                  )}
                </div>
              </SortableContext>
            </DndContext>

            <div className="mt-6">
              <ComponentSelector onAddComponent={onAddComponent} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4">محرر المكون</h2>
            {activeComponent ? (
              <ComponentEditor
                component={activeComponent}
                onUpdate={(settings) => {
                  
                  onUpdateSettings(activeComponent.id, settings);
                }}
              />
            ) : (
              <div className="text-center p-8 border border-dashed rounded-lg">
                <p>اختر مكوناً من القائمة على اليمين لتعديله</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ComponentsPanel; 