import React from 'react';
import { AdvancedDescriptionComponent } from '@/types/advanced-description';
import { ImageComponentPreview } from './ImageComponentPreview';
import { SlideshowComponentPreview } from './SlideshowComponentPreview';
import { ReviewsComponentPreview } from './ReviewsComponentPreview';
import { TextComponentPreview } from './TextComponentPreview';
import { FeaturesComponentPreview } from './FeaturesComponentPreview';
import { SpecificationsComponentPreview } from './SpecificationsComponentPreview';
import { GifComponentPreview } from './GifComponentPreview';
import { VideoComponentPreview } from './VideoComponentPreview';
import { BeforeAfterComponentPreview } from './BeforeAfterComponentPreview';
import { GalleryComponentPreview } from './GalleryComponentPreview';
import { PriceComponentPreview } from './PriceComponentPreview';
import { QuantityComponentPreview } from './QuantityComponentPreview';
import { BuyNowComponentPreview } from './BuyNowComponentPreview';

interface ComponentRendererProps {
  component: AdvancedDescriptionComponent;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  showActions?: boolean;
  className?: string;
}

export const ComponentRenderer: React.FC<ComponentRendererProps> = ({
  component,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  showActions = true,
  className
}) => {
  switch (component.type) {
    case 'image':
      return (
        <ImageComponentPreview
          component={component}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          showActions={showActions}
          className={className}
        />
      );
    
    case 'slideshow':
      return (
        <SlideshowComponentPreview
          component={component}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          showActions={showActions}
          className={className}
        />
      );
    
    case 'reviews':
      return (
        <ReviewsComponentPreview
          component={component}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          showActions={showActions}
          className={className}
        />
      );
    
    case 'text':
      return (
        <TextComponentPreview
          component={component}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          showActions={showActions}
          className={className}
        />
      );
    
    case 'features':
      return (
        <FeaturesComponentPreview
          component={component}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          showActions={showActions}
          className={className}
        />
      );
    
    case 'specifications':
      return (
        <SpecificationsComponentPreview
          component={component}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          showActions={showActions}
          className={className}
        />
      );
    
    case 'gif':
      return (
        <GifComponentPreview
          component={component}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          showActions={showActions}
          className={className}
        />
      );
    
    case 'video':
      return (
        <VideoComponentPreview
          component={component}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          showActions={showActions}
          className={className}
        />
      );
    
    case 'before-after':
      return (
        <BeforeAfterComponentPreview
          component={component}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          showActions={showActions}
          className={className}
        />
      );
    
    case 'gallery':
      return (
        <GalleryComponentPreview
          component={component}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          showActions={showActions}
          className={className}
        />
      );
    
    case 'price':
      return (
        <PriceComponentPreview
          component={component}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          showActions={showActions}
          className={className}
        />
      );
    
        case 'quantity':
        return (
          <QuantityComponentPreview
            component={component as any}
            onEdit={onEdit}
            onDelete={onDelete}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            showActions={showActions}
            className={className}
          />
        );
      
      case 'buy-now':
        return (
          <BuyNowComponentPreview
            component={component as any}
            onEdit={onEdit}
            onDelete={onDelete}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            showActions={showActions}
            className={className}
          />
        );
      
      default:
        return null;
  }
};
