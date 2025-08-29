import React, { useState, useRef, useEffect } from 'react';
import { BeforeAfterComponent } from '@/types/advanced-description';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Trash2, Edit, ArrowLeftRight, ChevronUp, ChevronDown } from 'lucide-react';

interface BeforeAfterComponentPreviewProps {
  component: BeforeAfterComponent;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  showActions?: boolean;
  className?: string;
}

export const BeforeAfterComponentPreview: React.FC<BeforeAfterComponentPreviewProps> = ({
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
  // State for slider position
  const [sliderPosition, setSliderPosition] = useState(50);
  const isDragging = useRef(false);

  // Handle mouse/touch events
  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging.current) return;
    
    e.preventDefault();
    
    const slider = e.currentTarget as HTMLDivElement;
    const rect = slider.getBoundingClientRect();
    
    const clientX = 'touches' in e 
      ? e.touches[0].clientX 
      : (e as React.MouseEvent).clientX;
    
    const position = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setSliderPosition(position);
  };

  // Add event listeners
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDragging.current = false;
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchend', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, []);
      return (
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-lg",
        "border-border/50 bg-card/50 backdrop-blur-sm",
        className
      )}>
      {showActions && (
        <>
          <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex flex-col gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                className="h-4 w-4 p-0"
              >
                <ChevronUp className="w-2.5 h-2.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                className="h-4 w-4 p-0"
              >
                <ChevronDown className="w-2.5 h-2.5" />
              </Button>
            </div>
            <Button variant="secondary" size="sm" onClick={onEdit} className="h-8 w-8 p-0 bg-background/90 hover:bg-background">
              <Edit className="h-3 w-3" />
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete} className="h-8 w-8 p-0">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div className="absolute top-2 left-2 z-10">
            <Badge variant="secondary" className="text-xs bg-background/90">
              <ArrowLeftRight className="w-3 h-3 mr-1" />
              قبل وبعد
            </Badge>
          </div>
        </>
      )}
      <div className={cn("p-4", !showActions && "pt-6")}>
        {component.data.title && (
          <h3 className="text-lg font-semibold text-center mb-3">{component.data.title}</h3>
        )}
        {component.data.beforeImage && component.data.afterImage ? (
          <div className="space-y-4">
            {/* Interactive Slider */}
            <div className="max-w-2xl mx-auto">
              <div 
                className="relative w-full overflow-hidden rounded-xl shadow-lg cursor-ew-resize"
                style={{ height: '300px' }}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onMouseMove={handleMouseMove}
                onTouchStart={handleMouseDown}
                onTouchEnd={handleMouseUp}
                onTouchCancel={handleMouseUp}
                onTouchMove={handleMouseMove}
              >
                {/* Before Image (Background) */}
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-all"
                  style={{ 
                    backgroundImage: `url(${component.data.beforeImage})`,
                    backgroundSize: 'cover',
                    filter: 'contrast(1.05)'
                  }}
                />
                
                {/* After Image (Overlay with clip-path) */}
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform"
                  style={{ 
                    backgroundImage: `url(${component.data.afterImage})`,
                    backgroundSize: 'cover',
                    clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
                    filter: 'contrast(1.05)'
                  }}
                />
                
                {/* Slider Handle */}
                <div 
                  className="absolute top-0 bottom-0 cursor-ew-resize z-10"
                  style={{ 
                    left: `${sliderPosition}%`,
                    transform: 'translateX(-50%)',
                    width: '40px',
                    touchAction: 'none' 
                  }}
                >
                  <div 
                    className="absolute top-0 bottom-0 left-1/2 w-1 bg-white shadow-lg"
                    style={{ transform: 'translateX(-50%)' }}
                  />
                  <div 
                    className="absolute top-1/2 left-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center"
                    style={{ transform: 'translate(-50%, -50%)' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 5L3 10L8 15" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 5L21 10L16 15" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                
                {/* Labels */}
                {component.settings?.showLabels !== false && (
                  <>
                    <div className="absolute top-5 left-5 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md backdrop-blur-sm">
                      {component.data.beforeLabel || 'قبل'}
                    </div>
                    <div className="absolute top-5 right-5 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md backdrop-blur-sm">
                      {component.data.afterLabel || 'بعد'}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {component.data.description && (
              <p className="text-sm text-muted-foreground text-center">
                {component.data.description}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <ArrowLeftRight className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">لم يتم تحديد صور المقارنة</p>
            <Button variant="outline" size="sm" onClick={onEdit} className="mt-2">
              إضافة صور
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
