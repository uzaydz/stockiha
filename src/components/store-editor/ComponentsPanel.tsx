import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableComponent from './SortableComponent';
import ComponentSelector from './ComponentSelector';
import ComponentEditorModal from './ComponentEditorModal';
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
  onSave?: () => Promise<void>;
}

const ComponentsPanel: React.FC<ComponentsPanelProps> = ({
  components,
  activeComponent,
  onActivateComponent,
  onToggleComponentActive,
  onRemoveComponent,
  onAddComponent,
  onUpdateSettings,
  onDragEnd,
  onSave
}) => {
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<StoreComponent | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleComponentClick = (component: StoreComponent) => {
    setSelectedComponent(component);
    setEditorModalOpen(true);
    onActivateComponent(component);
  };

  const handleModalClose = () => {
    setEditorModalOpen(false);
    setSelectedComponent(null);
  };

  const handleUpdateSettings = (settings: any) => {
    if (selectedComponent) {
      onUpdateSettings(selectedComponent.id, settings);
      // تحديث المكون المحدد مع الإعدادات الجديدة
      setSelectedComponent({
        ...selectedComponent,
        settings
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-bold mb-4">مكونات المتجر</h2>
          <p className="text-muted-foreground mb-6">
            اسحب العناصر لإعادة ترتيبها. انقر على عنصر لتعديل خصائصه في نافذة منبثقة.
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
                    <p>لا توجد مكونات. أضف مكوناً باستخدام القائمة أدناه.</p>
                  </div>
                ) : (
                  components.map((component) => (
                    <SortableComponent
                      key={component.id}
                      component={component}
                      isActive={activeComponent?.id === component.id}
                      onActivate={() => handleComponentClick(component)}
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

      {/* Modal للمحرر */}
      {selectedComponent && (
        <ComponentEditorModal
          component={selectedComponent}
          isOpen={editorModalOpen}
          onClose={handleModalClose}
          onUpdate={handleUpdateSettings}
          onToggleActive={onToggleComponentActive}
          onDelete={onRemoveComponent}
          onSave={onSave}
        />
      )}
    </div>
  );
};

export default ComponentsPanel;
