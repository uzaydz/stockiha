import React from 'react';
import { AdvancedDescription } from '@/types/advanced-description';
import { PureComponentRenderer } from './preview/PureComponentRenderer';
import { AdvancedDescriptionProvider } from './context/AdvancedDescriptionContext';
import { cn } from '@/lib/utils';

interface AdvancedDescriptionRendererProps {
  description: AdvancedDescription;
  className?: string;
  product?: any; // بيانات المنتج الكاملة لمعرض الصور
}

export const AdvancedDescriptionRenderer: React.FC<AdvancedDescriptionRendererProps> = ({
  description,
  className,
  product
}) => {
  if (!description || !description.components || description.components.length === 0) {
    return null;
  }

  // Sort components by order
  const sortedComponents = [...description.components].sort((a, b) => a.order - b.order);

  return (
    <AdvancedDescriptionProvider>
      <div 
        className={cn(
          "advanced-description-container",
          className
        )}
        style={{
          padding: `${description.settings?.padding || 20}px`,
          maxWidth: description.settings?.maxWidth || 800,
          margin: description.settings?.centerContent ? '0 auto' : undefined,
        }}
      >
        <div className="space-y-6">
          {sortedComponents.map((component) => (
            <div key={component.id} className="component-wrapper">
              <PureComponentRenderer 
                component={component}
                className="w-full"
                product={component.type === 'gallery' || component.type === 'price' || component.type === 'quantity' || component.type === 'buy-now' ? product : undefined}
              />
            </div>
          ))}
        </div>
      </div>
    </AdvancedDescriptionProvider>
  );
};