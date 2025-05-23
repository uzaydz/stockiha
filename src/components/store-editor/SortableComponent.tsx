import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StoreComponent, ComponentType } from '@/types/store-editor';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, PencilIcon, EyeIcon, EyeOff, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

// أيقونات للأنواع المختلفة من المكونات
const componentIcons: Record<string, JSX.Element> = {
  hero: <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">الهيرو</Badge>,
  category_section: <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">قسم الفئات</Badge>,
  product_categories: <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">الفئات</Badge>,
  featured_products: <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">المنتجات المميزة</Badge>,
  testimonials: <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">آراء العملاء</Badge>,
  about: <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">عن المتجر</Badge>,
  countdownoffers: <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">عروض محدودة</Badge>,
  services: <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">الخدمات</Badge>,
  contact: <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">اتصل بنا</Badge>
};

interface SortableComponentProps {
  component: StoreComponent;
  isActive: boolean;
  onActivate: () => void;
  onToggleActive: () => void;
  onRemove: () => void;
}

const SortableComponent: React.FC<SortableComponentProps> = ({
  component,
  isActive,
  onActivate,
  onToggleActive,
  onRemove,
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
  const getComponentTitle = (component: StoreComponent) => {
    const titles: Record<string, string> = {
      hero: "قسم الهيرو",
      category_section: "قسم الفئات",
      product_categories: "فئات المنتجات",
      featured_products: "المنتجات المميزة",
      testimonials: "آراء العملاء",
      about: "عن المتجر",
      countdownoffers: "عروض محدودة",
      services: "الخدمات",
      contact: "اتصل بنا"
    };

    return titles[component.type] || `مكون ${component.type}`;
  };

  // وظيفة لعرض معلومات إضافية عن المكون
  const getComponentInfo = (component: StoreComponent) => {
    if (!component || !component.settings) {
      return "معلومات غير متوفرة";
    }
    
    switch (component.type) {
      case 'hero':
        return component.settings.title || 'بدون عنوان';
      case 'category_section':
      case 'product_categories':
        return `${component.settings.title || 'فئات المنتجات'} (${component.settings.displayCount || component.settings.maxCategories || 0} فئة)`;
      case 'featured_products':
        return `${component.settings.title || 'المنتجات المميزة'} (${component.settings.displayCount || 0} منتج)`;
      case 'testimonials':
        return `${component.settings.title || 'آراء العملاء'} (${component.settings.displayCount || 0} رأي)`;
      case 'about':
        return component.settings.title || 'عن المتجر';
      case 'countdownoffers':
        return component.settings.title || 'عروض محدودة';
      case 'services':
        return component.settings.title || 'الخدمات';
      case 'contact':
        return component.settings.title || 'اتصل بنا';
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

export default SortableComponent; 