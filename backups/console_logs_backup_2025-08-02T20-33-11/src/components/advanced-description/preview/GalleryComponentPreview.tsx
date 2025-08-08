import React from 'react';
import { GalleryComponent } from '@/types/advanced-description';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  ImageIcon, 
  Edit, 
  Trash2, 
  ChevronUp, 
  ChevronDown,
  ExternalLink,
  Info
} from 'lucide-react';

interface GalleryComponentPreviewProps {
  component: GalleryComponent;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  showActions?: boolean;
  className?: string;
}

export const GalleryComponentPreview: React.FC<GalleryComponentPreviewProps> = ({
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
              <ImageIcon className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">معرض صور المنتج</CardTitle>
              <Badge variant="secondary" className="text-xs">
                احترافي
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
        {component.data.title && (
          <div className="mb-4 text-center">
            <h3 className="text-lg font-semibold mb-1">{component.data.title}</h3>
            {component.data.description && (
              <p className="text-sm text-muted-foreground">{component.data.description}</p>
            )}
          </div>
        )}

        {/* Preview Placeholder */}
        <div className="space-y-4">
          {/* Gallery Preview */}
          <div className="relative bg-gradient-to-br from-muted/30 to-muted/50 rounded-lg border border-border/30 aspect-[4/3] flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <ImageIcon className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">معرض الصور الاحترافي</p>
                <p className="text-xs text-muted-foreground px-4">
                  سيظهر معرض الصور المتقدم مع جميع ميزات التفاعل والزوم
                </p>
              </div>
            </div>
          </div>

          {/* Info Message */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  معاينة في صفحة الشراء
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  سيتم عرض معرض الصور الاحترافي الكامل في صفحة شراء المنتج مع جميع الميزات:
                  الزوم، التنقل بالأسهم، الصور المصغرة، والمؤثرات البصرية.
                </p>
                <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                  <ExternalLink className="w-3 h-3" />
                  <span>يمكنك مشاهدة المعرض في صفحة المنتج</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};