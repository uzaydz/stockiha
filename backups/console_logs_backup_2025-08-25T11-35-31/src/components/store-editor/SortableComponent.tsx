import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StoreComponent, ComponentType } from '@/types/store-editor';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Settings, EyeIcon, EyeOff, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

// أيقونات للأنواع المختلفة من المكونات
const componentIcons: Record<string, JSX.Element> = {
  hero: <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">🌟 الهيرو</Badge>,
  category_section: <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">📂 قسم الفئات</Badge>,
  product_categories: <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">🏷️ الفئات</Badge>,
  featured_products: <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">⭐ المنتجات المميزة</Badge>,
  testimonials: <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">💬 آراء العملاء</Badge>,
  about: <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">📖 عن المتجر</Badge>,
  countdownoffers: <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">⏰ عروض محدودة</Badge>,
  services: <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">🛠️ الخدمات</Badge>,
  contact: <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">📞 اتصل بنا</Badge>,
  footer: <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">🔗 التذييل</Badge>
};

interface SortableComponentProps {
  component: StoreComponent;
  isActive: boolean;
  onActivate: () => void;
  onToggleActive: () => void;
  onRemove: () => void;
}

// الحصول على عنوان المكون
const getComponentTitle = (component: StoreComponent): string => {
  if (component.settings?.title) {
    return component.settings.title;
  }
  
  switch (component.type) {
    case 'hero':
      return component.settings?.title || 'القسم الرئيسي';
    case 'category_section':
    case 'product_categories':
      return component.settings?.title || 'فئات المنتجات';
    case 'featured_products':
      return component.settings?.title || 'المنتجات المميزة';
    case 'testimonials':
      return component.settings?.title || 'آراء العملاء';
    case 'about':
      return component.settings?.title || 'عن المتجر';
    case 'countdownoffers':
      return component.settings?.title || 'عروض محدودة';
    case 'services':
      return 'الخدمات';
    case 'contact':
      return 'اتصل بنا';
    case 'footer':
      return 'تذييل الصفحة';
    default:
      return component.type;
  }
};

// الحصول على معلومات إضافية عن المكون
const getComponentInfo = (component: StoreComponent): string => {
  switch (component.type) {
    case 'hero':
      return component.settings?.subtitle || 'العنوان الرئيسي للمتجر';
    case 'featured_products':
      const count = component.settings?.limit || component.settings?.count || 4;
      return `عرض ${count} منتجات`;
    case 'testimonials':
      const testimonialsCount = component.settings?.testimonials?.length || 0;
      return `${testimonialsCount} آراء عملاء`;
    case 'footer':
      return 'تذييل الصفحة مع الروابط والمعلومات';
    default:
      return `مكون ${component.type}`;
  }
};

const SortableComponent: React.FC<SortableComponentProps> = ({
  component,
  isActive,
  onActivate,
  onToggleActive,
  onRemove
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: component.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card 
        className={cn(
          "border transition-all duration-200 cursor-pointer hover:shadow-md hover:border-primary/50 group",
          isActive ? "border-primary ring-2 ring-primary/20 shadow-sm" : "border-border",
          !component.isActive && "opacity-60",
          isDragging && "shadow-lg scale-105"
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
              className="p-1.5 mr-3 cursor-grab rounded hover:bg-secondary active:cursor-grabbing opacity-50 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            
            {/* معلومات المكون */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                {componentIcons[component.type] || <Badge variant="outline">📦 مكون</Badge>}
                {!component.isActive && (
                  <Badge variant="secondary" className="text-xs">
                    <EyeOff className="w-3 h-3 mr-1" />
                    مخفي
                  </Badge>
                )}
              </div>
              <p className="text-sm font-medium text-foreground truncate">
                {getComponentTitle(component)}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {getComponentInfo(component)}
              </p>
            </div>

            {/* مؤشر التحرير */}
            <div className="flex items-center gap-2 ml-3">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground flex items-center gap-1">
                <Settings className="w-3 h-3" />
                انقر للتحرير
              </div>
              
              {/* Switch للإظهار/الإخفاء */}
              <Switch
                checked={component.isActive}
                onCheckedChange={onToggleActive}
                onClick={(e) => e.stopPropagation()}
                className="data-[state=checked]:bg-green-500"
              />
              
              {/* زر الحذف */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
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
