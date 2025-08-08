import React from 'react';
import { FeaturesComponent } from '@/types/advanced-description';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Trash2, Edit, CheckCircle, Zap } from 'lucide-react';

interface FeaturesComponentPreviewProps {
  component: FeaturesComponent;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export const FeaturesComponentPreview: React.FC<FeaturesComponentPreviewProps> = ({
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
          <Zap className="w-3 h-3 mr-1" />
          مميزات
        </Badge>
      </div>
      <div className="p-4 pt-12">
        <h3 className="text-lg font-semibold text-center mb-4">{component.data.title}</h3>
        {component.data.features.length > 0 ? (
          <div className={cn(
            "gap-4",
            component.settings.layout === 'grid' && `grid grid-cols-1 md:grid-cols-${component.settings.columns}`,
            component.settings.layout === 'list' && "space-y-3"
          )}>
            {component.data.features.map((feature) => (
              <div key={feature.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                {component.settings.showIcons && (
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <h4 className="font-medium text-sm">{feature.title}</h4>
                  {feature.description && (
                    <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">لا توجد مميزات مضافة</p>
            <Button variant="outline" size="sm" onClick={onEdit} className="mt-2">
              إضافة مميزات
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};