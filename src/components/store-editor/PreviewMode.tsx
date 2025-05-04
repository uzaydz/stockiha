import React from 'react';
import ComponentPreview from './ComponentPreview';
import { StoreComponent } from '@/types/store-editor';

interface PreviewModeProps {
  components: StoreComponent[];
}

const PreviewMode: React.FC<PreviewModeProps> = ({ components }) => {
  const activeComponents = components.filter(comp => comp.isActive);
  
  return (
    <div className="bg-background border rounded-lg p-4 mb-8">
      <h2 className="text-xl font-bold mb-4">معاينة المتجر</h2>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {activeComponents.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>لا توجد مكونات نشطة للمعاينة. الرجاء إضافة وتفعيل مكونات.</p>
          </div>
        ) : (
          activeComponents.map((component) => (
            <ComponentPreview key={component.id} component={component} />
          ))
        )}
      </div>
    </div>
  );
};

export default PreviewMode; 