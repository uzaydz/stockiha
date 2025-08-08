import React, { useState, useEffect, useRef } from 'react';
import { SlideshowComponent } from '@/types/advanced-description';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Trash2, Edit, ChevronLeft, ChevronRight, Play, Pause, Presentation } from 'lucide-react';

interface SlideshowComponentPreviewProps {
  component: SlideshowComponent;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export const SlideshowComponentPreview: React.FC<SlideshowComponentPreviewProps> = ({
  component,
  onEdit,
  onDelete,
  className
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(component.data.autoPlay);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const images = component.data.images;
  const hasImages = images.length > 0;

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && hasImages && images.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % images.length);
      }, component.data.autoPlayInterval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, hasImages, images.length, component.data.autoPlayInterval]);

  const nextSlide = () => {
    if (hasImages) {
      setCurrentSlide((prev) => 
        component.data.loop 
          ? (prev + 1) % images.length 
          : Math.min(prev + 1, images.length - 1)
      );
    }
  };

  const prevSlide = () => {
    if (hasImages) {
      setCurrentSlide((prev) => 
        component.data.loop 
          ? (prev - 1 + images.length) % images.length 
          : Math.max(prev - 1, 0)
      );
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleImageLoad = (index: number) => {
    setLoadedImages(prev => new Set(prev).add(index));
  };

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 hover:shadow-lg",
      "border-border/50 bg-card/50 backdrop-blur-sm",
      className
    )}>
      {/* Action buttons */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="secondary"
          size="sm"
          onClick={onEdit}
          className="h-8 w-8 p-0 bg-background/90 hover:bg-background"
        >
          <Edit className="h-3 w-3" />
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          className="h-8 w-8 p-0"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Component type badge */}
      <div className="absolute top-2 left-2 z-10">
        <Badge variant="secondary" className="text-xs bg-background/90">
          <Presentation className="w-3 h-3 mr-1" />
          سلايد شو
        </Badge>
      </div>

      <div className="p-4">
        <div 
          className="relative overflow-hidden bg-muted/30 rounded-lg"
          style={{ 
            height: `${component.settings.height}px`,
            borderRadius: `${component.settings.borderRadius}px`
          }}
        >
          {hasImages ? (
            <>
              {/* Main slideshow container */}
              <div className="relative w-full h-full">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className={cn(
                      "absolute inset-0 transition-all duration-500 ease-in-out",
                      index === currentSlide 
                        ? "opacity-100 transform translate-x-0" 
                        : component.settings.transitionEffect === 'slide'
                          ? index < currentSlide 
                            ? "opacity-0 transform translate-x-full"
                            : "opacity-0 transform -translate-x-full"
                          : "opacity-0"
                    )}
                  >
                    {!loadedImages.has(index) && (
                      <div className="absolute inset-0 bg-muted/50 animate-pulse flex items-center justify-center">
                        <Presentation className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    
                    <img
                      src={image.url}
                      alt={image.alt || `شريحة ${index + 1}`}
                      className="w-full h-full object-cover"
                      onLoad={() => handleImageLoad(index)}
                      loading="lazy"
                    />
                    
                    {/* Caption overlay */}
                    {image.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                        <p className="text-white text-sm font-medium">
                          {image.caption}
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {/* Navigation arrows */}
                {component.data.showArrows && images.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 bg-black/20 hover:bg-black/40 text-white border-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={prevSlide}
                      disabled={!component.data.loop && currentSlide === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 bg-black/20 hover:bg-black/40 text-white border-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={nextSlide}
                      disabled={!component.data.loop && currentSlide === images.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {/* Play/Pause button */}
                {images.length > 1 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 left-1/2 transform -translate-x-1/2 h-8 w-8 p-0 bg-black/20 hover:bg-black/40 text-white border-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={togglePlayPause}
                  >
                    {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                )}

                {/* Slide counter */}
                <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                  {currentSlide + 1} / {images.length}
                </div>
              </div>

              {/* Dots navigation */}
              {component.data.showDots && images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all duration-200",
                        index === currentSlide 
                          ? "bg-white scale-125" 
                          : "bg-white/50 hover:bg-white/70"
                      )}
                      onClick={() => goToSlide(index)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <Presentation className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground text-center mb-3">
                لم يتم إضافة صور للسلايد شو
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onEdit}
              >
                إضافة صور
              </Button>
            </div>
          )}
        </div>

        {/* Slideshow info */}
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {images.length} {images.length === 1 ? 'صورة' : 'صور'}
          </span>
          {component.data.autoPlay && images.length > 1 && (
            <span>
              تشغيل تلقائي: {component.data.autoPlayInterval / 1000}ث
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};