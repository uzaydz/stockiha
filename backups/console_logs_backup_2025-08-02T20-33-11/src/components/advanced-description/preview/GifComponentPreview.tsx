import React from 'react';
import { GifComponent } from '@/types/advanced-description';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Trash2, Edit, Image } from 'lucide-react';

interface GifComponentPreviewProps {
  component: GifComponent;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export const GifComponentPreview: React.FC<GifComponentPreviewProps> = ({
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
          <Image className="w-3 h-3 mr-1" />
          GIF
        </Badge>
      </div>
      <div className="p-4 pt-12">
        {component.data.url ? (
          <div className={cn(
            "relative",
            component.settings.alignment === 'center' && "text-center",
            component.settings.alignment === 'left' && "text-left",
            component.settings.alignment === 'right' && "text-right"
          )}>
            <img
              src={component.data.url}
              alt={component.data.alt || 'GIF'}
              className="max-w-full h-auto rounded-lg"
              style={{
                maxWidth: `${component.settings.maxWidth}px`,
                borderRadius: `${component.settings.borderRadius}px`
              }}
            />
            {component.data.caption && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                {component.data.caption}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Image className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">لم يتم تحديد GIF</p>
            <Button variant="outline" size="sm" onClick={onEdit} className="mt-2">
              إضافة GIF
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};