import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { GripVertical, PencilIcon, Trash2, EyeIcon, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface LandingPageComponent {
  id: string;
  type: string;
  isActive: boolean;
  settings: Record<string, any>;
}

// أيقونات للأنواع المختلفة من المكونات
const componentIcons: Record<string, JSX.Element> = {
  hero: <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">هيرو</Badge>,
  form: <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">نموذج</Badge>,
  text: <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">نص</Badge>,
  image: <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">صورة</Badge>,
  features: <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">مميزات</Badge>,
  testimonial: <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">آراء العملاء</Badge>,
};

interface SortableLandingPageItemProps {
  component: LandingPageComponent;
  isActive: boolean;
  onActivate: () => void;
  onToggleActive: () => void;
  onRemove: () => void;
  overlay?: boolean;
}

const SortableLandingPageItem: React.FC<SortableLandingPageItemProps> = ({
  component,
  isActive,
  onActivate,
  onToggleActive,
  onRemove,
  overlay = false,
}) => {
  // استخدام سورتابل هوك من مكتبة dnd-kit
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: component.id });

  // أنماط للعنصر القابل للسحب
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  // وظيفة لاستخراج عنوان المكون بناءً على نوعه
  const getComponentTitle = (component: LandingPageComponent) => {
    const titles: Record<string, string> = {
      hero: "قسم الهيرو",
      form: "نموذج",
      text: "نص",
      image: "صورة",
      features: "مميزات",
      testimonial: "آراء العملاء",
    };

    return titles[component.type] || `مكون ${component.type}`;
  };

  // وظيفة لعرض معلومات إضافية عن المكون
  const getComponentInfo = (component: LandingPageComponent) => {
    if (!component || !component.settings) {
      return "معلومات غير متوفرة";
    }
    
    switch (component.type) {
      case 'hero':
        return component.settings.title || 'بدون عنوان';
      case 'form':
        return `${component.settings.title || 'نموذج'} ${component.settings.productId ? '✓' : '✗'}`;
      case 'text':
        const text = component.settings.content?.replace(/<[^>]*>?/gm, '') || '';
        return text.length > 30 ? text.substring(0, 30) + '...' : text || 'بدون محتوى';
      case 'image':
        return component.settings.altText || 'بدون وصف';
      case 'features':
        return `${component.settings.title || 'المميزات'} (${component.settings.features?.length || 0})`;
      case 'testimonial':
        return `${component.settings.items?.length || 0} رأي`;
      default:
        return 'معلومات غير متوفرة';
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card 
        className={cn(
          "border transition-all duration-200",
          isActive ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-primary/40",
          !component.isActive && "opacity-60"
        )}
        onClick={(e) => {
          e.preventDefault();
          onActivate();
        }}
      >
        <CardContent className="p-0">
          <div className="flex items-center px-4 py-3">
            {/* مقبض السحب */}
            <div
              {...listeners}
              className="p-1.5 mr-2 cursor-grab rounded hover:bg-secondary active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            
            {/* معلومات المكون */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {componentIcons[component.type] || <Badge>مكون</Badge>}
                <span className="font-medium text-sm">{getComponentTitle(component)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {getComponentInfo(component)}
              </p>
            </div>
            
            {/* أزرار الإجراءات */}
            <div className="flex items-center gap-1.5">
              {/* زر التفعيل/التعطيل */}
              <div className="flex items-center mr-3" onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={component.isActive}
                  onCheckedChange={onToggleActive}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              
              {/* زر التعديل */}
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-7 w-7 rounded-full",
                  isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                )}
                onClick={onActivate}
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </Button>
              
              {/* زر الحذف */}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SortableLandingPageItem;
