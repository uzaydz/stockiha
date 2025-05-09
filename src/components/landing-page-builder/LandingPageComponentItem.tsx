import React from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Trash2, Pencil, Image, Settings, Layers, MessageSquare, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LandingPageComponent {
  id: string;
  type: string;
  isActive: boolean;
  settings: Record<string, any>;
}

interface LandingPageComponentItemProps {
  component: LandingPageComponent;
  isActive: boolean;
  onActivate: () => void;
  onToggleActive: () => void;
  onRemove: () => void;
  overlay?: boolean;
}

/**
 * مكون عرض العنصر في قائمة المكونات
 */
const LandingPageComponentItem: React.FC<LandingPageComponentItemProps> = ({ 
  component, 
  isActive, 
  onActivate, 
  onToggleActive, 
  onRemove, 
  overlay = false 
}) => {
  const { t } = useTranslation();
  
  return (
    <div 
      className={cn(
        "flex items-center justify-between p-3 mb-2 bg-card rounded-lg border transition-colors cursor-pointer",
        isActive && !overlay ? "border-primary ring-1 ring-primary/20" : "border-border",
        overlay ? "opacity-75 border-dashed" : ""
      )}
      onClick={onActivate}
    >
      <div className="flex items-center gap-3">
        {getComponentIcon(component.type)}
        <div>
          <div className="font-medium">
            {getComponentTypeLabel(component.type)}
          </div>
          <div className="text-xs text-muted-foreground">
            {getComponentPreview(component)}
          </div>
        </div>
      </div>
      
      {!overlay && (
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive();
            }}
            title={component.isActive ? t('إخفاء') : t('إظهار')}
          >
            {component.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-destructive/70 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title={t('حذف')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * الحصول على أيقونة المكون حسب نوعه
 */
const getComponentIcon = (type: string) => {
  switch (type) {
    case 'hero':
      return <Layers className="h-5 w-5 text-primary" />;
    case 'form':
      return <Settings className="h-5 w-5 text-primary" />;
    case 'text':
      return <MessageSquare className="h-5 w-5 text-primary" />;
    case 'image':
      return <Image className="h-5 w-5 text-primary" />;
    case 'features':
      return <LayoutGrid className="h-5 w-5 text-primary" />;
    case 'testimonial':
      return <MessageSquare className="h-5 w-5 text-primary" />;
    default:
      return <Layers className="h-5 w-5 text-primary" />;
  }
};

/**
 * الحصول على اسم نوع المكون
 */
const getComponentTypeLabel = (type: string): string => {
  switch (type) {
    case 'hero':
      return 'قسم هيرو';
    case 'form':
      return 'نموذج تواصل';
    case 'text':
      return 'نص';
    case 'image':
      return 'صورة';
    case 'features':
      return 'مميزات';
    case 'testimonial':
      return 'آراء العملاء';
    default:
      return type;
  }
};

/**
 * الحصول على نص معاينة المكون بناءً على إعداداته
 */
const getComponentPreview = (component: LandingPageComponent): string => {
  switch (component.type) {
    case 'hero':
      return `عنوان: ${component.settings.title || 'بدون عنوان'}`;
    case 'form':
      return component.settings.title || 'نموذج بدون عنوان';
    case 'text':
      return component.settings.content
        ? component.settings.content.replace(/<[^>]*>/g, '').substring(0, 40) + '...'
        : 'نص فارغ';
    case 'image':
      return component.settings.caption || (component.settings.altText || 'صورة بدون عنوان');
    case 'features':
      return `${component.settings.title || 'مميزات'} (${component.settings.features?.length || 0} عناصر)`;
    case 'testimonial':
      return `${component.settings.title || 'آراء'} (${component.settings.items?.length || 0} آراء)`;
    default:
      return 'مكون بدون محتوى';
  }
};

export default LandingPageComponentItem;
export { getComponentTypeLabel, getComponentPreview, getComponentIcon }; 
 
 