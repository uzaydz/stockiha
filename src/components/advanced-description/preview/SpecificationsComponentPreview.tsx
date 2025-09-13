import React, { useMemo } from 'react';
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
  // تحديد البيانات للعرض حسب نوع التخطيط
  const displayData = useMemo(() => {
    const layoutType = component.data?.layoutType || 'simple';
    
    if (layoutType === 'categorized' && component.data?.categories && component.data.categories.length > 0) {
      // استخدام الفئات المحددة
      return component.data.categories.reduce((acc: Record<string, any[]>, category: any) => {
        if (category.specifications && category.specifications.length > 0) {
          acc[category.name] = category.specifications.map((spec: any) => ({
            id: spec.id || Math.random().toString(),
            name: spec.name,
            value: spec.value,
            unit: spec.unit,
            description: spec.description
          }));
        }
        return acc;
      }, {});
    } else if (component.data?.specifications && component.data.specifications.length > 0) {
      // استخدام المواصفات البسيطة
      if (component.settings?.showCategories) {
        // تجميع حسب الفئة
        return component.data.specifications.reduce((acc: Record<string, any[]>, spec: any) => {
          const categoryName = (spec.category || '').trim() || 'عام';
          if (!acc[categoryName]) acc[categoryName] = [];
          acc[categoryName].push(spec);
          return acc;
        }, {});
      } else {
        // عرض بسيط بدون فئات
        return { '': component.data.specifications };
      }
    }
    
    return {};
  }, [component.data.specifications, component.data.categories, component.data.layoutType, component.settings?.showCategories]);

  const hasData = Object.keys(displayData).length > 0;
  const isTable = component.settings?.layout === 'table' || component.data?.layoutType === 'table';

  // تطبيق الإعدادات على الأنماط
  const containerStyles: React.CSSProperties = {
    backgroundColor: component.settings?.backgroundColor !== 'transparent' ? 
      (component.settings?.backgroundColor === 'background' ? 'hsl(var(--background))' :
       component.settings?.backgroundColor === 'muted' ? 'hsl(var(--muted))' :
       component.settings?.backgroundColor === 'primary/5' ? 'hsl(var(--primary) / 0.05)' :
       component.settings?.backgroundColor === 'secondary/5' ? 'hsl(var(--secondary) / 0.05)' :
       component.settings?.backgroundColor === 'accent/5' ? 'hsl(var(--accent) / 0.05)' :
       component.settings?.backgroundColor) : undefined,
    padding: component.settings?.padding ? `${component.settings.padding}px` : undefined,
    borderRadius: component.settings?.borderRadius === 'none' ? '0' :
                 component.settings?.borderRadius === 'sm' ? '0.125rem' :
                 component.settings?.borderRadius === 'md' ? '0.375rem' :
                 component.settings?.borderRadius === 'lg' ? '0.5rem' :
                 component.settings?.borderRadius === 'xl' ? '0.75rem' :
                 component.settings?.borderRadius === 'full' ? '9999px' : undefined
  };

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:scale-[1.01]",
      "border-border/30 bg-gradient-to-br from-background/95 via-background/90 to-muted/10 backdrop-blur-md",
      component.settings?.borderStyle === 'none' ? 'border-none' : 
      component.settings?.borderStyle === 'separated' ? 'border-none' : '',
      "rounded-xl shadow-sm",
      className
    )} style={containerStyles}>
      {/* خلفية تدرجية متحركة */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-secondary/3 opacity-0 group-hover:opacity-100 transition-all duration-700" />
      
      {/* نقاط زخرفية */}
      <div className="absolute top-3 right-16 w-2 h-2 bg-primary/20 rounded-full animate-pulse" />
      <div className="absolute top-5 right-20 w-1 h-1 bg-secondary/30 rounded-full animate-pulse delay-300" />
      
      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
        <Button variant="secondary" size="sm" onClick={onEdit} className="h-8 w-8 p-0 bg-background/90 hover:bg-background shadow-sm backdrop-blur-sm">
          <Edit className="h-3 w-3" />
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete} className="h-8 w-8 p-0 shadow-sm">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <div className="absolute top-2 left-2 z-10">
        <Badge variant="secondary" className="text-xs bg-gradient-to-r from-background/95 to-background/90 backdrop-blur-sm border border-border/30 shadow-sm">
          <List className="w-3 h-3 mr-1" />
          مواصفات
        </Badge>
      </div>
      <div className="relative p-6 pt-14">
        {/* العنوان والعنوان الفرعي */}
        <div className="text-center mb-6 space-y-3">
          <div className="relative inline-block">
            <h3 className="text-xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
              {component.data?.title || 'المواصفات التقنية'}
            </h3>
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-primary/60 to-secondary/60 rounded-full" />
          </div>
          {component.data?.subtitle && (
            <p className="text-sm text-muted-foreground/80 font-medium max-w-md mx-auto leading-relaxed">
              {component.data.subtitle}
            </p>
          )}
        </div>

        {hasData ? (
          <div className="space-y-4">
            {Object.entries(displayData).map(([categoryName, items]) => (
              <div key={categoryName} className="space-y-3">
                {/* عنوان الفئة */}
                {categoryName && component.settings?.showCategories && component.data?.layoutType === 'categorized' && (
                  <div className="text-sm font-semibold text-foreground/80 border-b border-border/30 pb-1">
                    {categoryName}
                  </div>
                )}

                {/* المواصفات */}
                {isTable ? (
                  <div className="overflow-hidden rounded-md border border-border/40">
                    <div className={cn(
                      component.settings?.borderStyle === 'separated' ? 'divide-y divide-border/40' : ''
                    )}>
                      {items.map((spec: any, idx: number) => (
                        <div
                          key={spec.id || idx}
                          className={cn(
                            'grid grid-cols-2 gap-3 p-3',
                            component.settings?.alternatingColors && idx % 2 === 1 ? 'bg-muted/30' : 'bg-background/50'
                          )}
                        >
                          <div className="text-sm font-medium">{spec.name}</div>
                          <div className="text-sm text-muted-foreground text-left">
                            {spec.value}
                            {component.settings?.showUnits && spec.unit && (
                              <span className="text-xs text-muted-foreground/70 mr-1">
                                {spec.unit}
                              </span>
                            )}
                          </div>
                          {component.settings?.showDescriptions && spec.description && (
                            <div className="col-span-2 text-xs text-muted-foreground/80 pt-1 border-t border-border/20">
                              {spec.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map((spec: any, idx: number) => (
                      <div
                        key={spec.id || idx}
                        className={cn(
                          'rounded-lg border border-border/40 px-3 py-2',
                          component.settings?.alternatingColors && idx % 2 === 1 ? 'bg-muted/30' : 'bg-muted/20'
                        )}
                      >
                        <div className="text-xs text-muted-foreground mb-1">{spec.name}</div>
                        <div className="text-sm font-medium">
                          {spec.value}
                          {component.settings?.showUnits && spec.unit && (
                            <span className="text-xs text-muted-foreground/70 mr-1">
                              {spec.unit}
                            </span>
                          )}
                        </div>
                        {component.settings?.showDescriptions && spec.description && (
                          <div className="text-xs text-muted-foreground/80 mt-1 pt-1 border-t border-border/20">
                            {spec.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 space-y-6">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl rotate-3 group-hover:rotate-6 transition-transform duration-300" />
              <div className="relative w-full h-full bg-gradient-to-br from-background to-muted/50 rounded-3xl flex items-center justify-center text-3xl shadow-inner">
                📋
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">لا توجد مواصفات مضافة</p>
              <p className="text-xs text-muted-foreground/60">انقر لإضافة المواصفات</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onEdit} 
              className="bg-gradient-to-r from-primary/5 to-secondary/5 border-border/40 hover:from-primary/10 hover:to-secondary/10 transition-all duration-300 shadow-sm"
            >
              <List className="w-4 h-4 mr-2" />
              إضافة مواصفات
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
