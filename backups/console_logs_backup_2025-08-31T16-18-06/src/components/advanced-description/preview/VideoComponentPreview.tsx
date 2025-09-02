import React from 'react';
import { VideoComponent } from '@/types/advanced-description';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Trash2, Edit, Video } from 'lucide-react';

interface VideoComponentPreviewProps {
  component: VideoComponent;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export const VideoComponentPreview: React.FC<VideoComponentPreviewProps> = ({
  component,
  onEdit,
  onDelete,
  className
}) => {
  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 hover:shadow-lg",
      "border-border/50 bg-card/50 backdrop-blur-sm",
      className
    )}>
      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="secondary" size="sm" onClick={onEdit} className="h-8 w-8 p-0 bg-background/90 hover:bg-background">
          <Edit className="h-3 w-3" />
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete} className="h-8 w-8 p-0">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <div className="absolute top-2 left-2 z-10">
        <Badge variant="secondary" className="text-xs bg-background/90">
          <Video className="w-3 h-3 mr-1" />
          فيديو
        </Badge>
      </div>
      <div className="p-4 pt-12">
        {component.data.url ? (
          <div className="space-y-3">
            {component.data.title && (
              <h3 className="text-lg font-semibold">{component.data.title}</h3>
            )}
            <div 
              className="relative bg-black rounded-lg overflow-hidden"
              style={{ borderRadius: `${component.settings.borderRadius}px` }}
            >
              <video
                src={component.data.url}
                poster={component.data.thumbnail}
                controls={component.settings.controls}
                autoPlay={component.data.autoPlay}
                loop={component.data.loop}
                muted={component.data.muted}
                className="w-full h-auto"
                style={{
                  aspectRatio: component.settings.aspectRatio.replace(':', '/')
                }}
              />
            </div>
            {component.data.description && (
              <p className="text-sm text-muted-foreground">
                {component.data.description}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">لم يتم تحديد فيديو</p>
            <Button variant="outline" size="sm" onClick={onEdit} className="mt-2">
              إضافة فيديو
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
