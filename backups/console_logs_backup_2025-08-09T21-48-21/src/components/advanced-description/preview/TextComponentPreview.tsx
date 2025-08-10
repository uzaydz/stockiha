import React from 'react';
import { TextComponent } from '@/types/advanced-description';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Trash2, Edit, Type } from 'lucide-react';

interface TextComponentPreviewProps {
  component: TextComponent;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export const TextComponentPreview: React.FC<TextComponentPreviewProps> = ({
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
          <Type className="w-3 h-3 mr-1" />
          نص
        </Badge>
      </div>
      <div className="p-4 pt-12">
        {component.data.title && (
          <h3 className="text-lg font-semibold mb-3">{component.data.title}</h3>
        )}
        <div 
          className={cn(
            "prose prose-sm max-w-none",
            component.settings.alignment === 'center' && "text-center",
            component.settings.alignment === 'left' && "text-left",
            component.settings.alignment === 'right' && "text-right"
          )}
          style={{
            fontSize: component.settings.fontSize === 'sm' ? '14px' : 
                     component.settings.fontSize === 'lg' ? '18px' : 
                     component.settings.fontSize === 'xl' ? '20px' : '16px',
            backgroundColor: component.settings.backgroundColor,
            color: component.settings.textColor,
            padding: `${component.settings.padding}px`,
            borderRadius: `${component.settings.borderRadius}px`
          }}
        >
          {component.data.content ? (
            <div dangerouslySetInnerHTML={{ __html: component.data.content }} />
          ) : (
            <p className="text-muted-foreground text-center">لا يوجد محتوى نصي</p>
          )}
        </div>
      </div>
    </Card>
  );
};
