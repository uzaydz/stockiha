import React from 'react';
import { SpecificationsComponent } from '@/types/advanced-description';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Trash2, Edit, List } from 'lucide-react';

interface SpecificationsComponentPreviewProps {
  component: SpecificationsComponent;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export const SpecificationsComponentPreview: React.FC<SpecificationsComponentPreviewProps> = ({
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
          <List className="w-3 h-3 mr-1" />
          مواصفات
        </Badge>
      </div>
      <div className="p-4 pt-12">
        <h3 className="text-lg font-semibold text-center mb-4">{component.data.title}</h3>
        {component.data.specifications.length > 0 ? (
          <div className="space-y-2">
            {component.data.specifications.map((spec) => (
              <div key={spec.id} className="flex justify-between items-center py-2 px-3 rounded bg-muted/30">
                <span className="text-sm font-medium">{spec.label}</span>
                <span className="text-sm text-muted-foreground">{spec.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <List className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">لا توجد مواصفات مضافة</p>
            <Button variant="outline" size="sm" onClick={onEdit} className="mt-2">
              إضافة مواصفات
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};