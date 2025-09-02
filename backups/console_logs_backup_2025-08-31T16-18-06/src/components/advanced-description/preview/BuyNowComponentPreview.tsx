import React from 'react';
import { BuyNowComponent } from '@/types/advanced-description';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  ShoppingCart, 
  Edit, 
  Trash2, 
  ChevronUp, 
  ChevronDown
} from 'lucide-react';

interface BuyNowComponentPreviewProps {
  component: BuyNowComponent;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  showActions?: boolean;
  className?: string;
}

export const BuyNowComponentPreview: React.FC<BuyNowComponentPreviewProps> = ({
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
  const { data, settings } = component;

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300",
      "border border-border/50 bg-card/50 backdrop-blur-sm",
      "hover:shadow-md hover:border-primary/30",
      className
    )}>
      {showActions && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">زر أطلب الآن</CardTitle>
              <Badge variant="secondary" className="text-xs">
                قابل للتخصيص
              </Badge>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Move buttons */}
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
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="h-6 w-6 p-0"
              >
                <Edit className="w-3 h-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className={cn("p-4", !showActions && "pt-6")}>
        {/* Title and Description */}
        {data.title && (
          <div className="mb-4 text-center">
            <h3 className="text-lg font-semibold mb-1">{data.title}</h3>
            {data.description && (
              <p className="text-sm text-muted-foreground">{data.description}</p>
            )}
          </div>
        )}

        {/* Button Preview */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <Button
              size={settings.buttonSize}
              className={cn(
                "font-semibold transition-all duration-200",
                settings.fullWidth ? "w-full" : "px-8",
                settings.showIcon && "gap-2"
              )}
              style={{
                backgroundColor: settings.buttonColor,
                color: settings.buttonTextColor,
                borderRadius: `${settings.borderRadius}px`,
              }}
            >
              {settings.showIcon && <ShoppingCart className="w-4 h-4" />}
              {data.buttonText}
            </Button>
          </div>

          {/* Settings Summary */}
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: settings.buttonColor }}></div>
              <span>اللون: {settings.buttonColor}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>الحجم: {settings.buttonSize}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>العرض: {settings.fullWidth ? 'كامل' : 'محدود'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>الأيقونة: {settings.showIcon ? 'نعم' : 'لا'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
