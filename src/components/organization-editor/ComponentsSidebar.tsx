import React, { KeyboardEvent } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, ArrowDown, ArrowUp, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ComponentsSidebarProps } from './types';

const ComponentsSidebar: React.FC<ComponentsSidebarProps> = ({
  components,
  selectedComponentId,
  onSelect,
  onToggleVisibility,
  onMove,
  onSaveLayout,
  hasUnsavedChanges,
  hasLayoutChanges,
  isSavingLayout,
  isMobile,
  isTablet,
  isDesktop
}) => {
  const handleRowKeyDown = (componentId: string) => (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(componentId);
    }
  };

  return (
    <aside className={cn(
      "w-full space-y-4",
      isDesktop && "lg:w-80 lg:space-y-6"
    )}>
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-sm sm:text-base">قائمة المكوّنات</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            اختر المكوّن لعرض خصائصه أو قم بإعادة ترتيب ظهور المكوّنات في الواجهة.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className={cn(
            "h-[250px]",
            isMobile && "h-[300px]",
            isTablet && "h-[350px]",
            isDesktop && "h-[420px]"
          )}>
            <div className="space-y-2 p-3 sm:p-4">
              {components.map((component, index) => {
                const isSelected = component.id === selectedComponentId;
                const isFirst = index === 0;
                const isLast = index === components.length - 1;
                const handleSelect = () => onSelect(component.id);

                return (
                  <div
                    key={component.id}
                    role="button"
                    tabIndex={0}
                    onClick={handleSelect}
                    onKeyDown={handleRowKeyDown(component.id)}
                    className={cn(
                      'w-full rounded-lg border px-3 py-3 text-right transition-colors sm:px-4 sm:py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-transparent bg-muted/60 hover:bg-muted'
                    )}
                  >
                    <div className={cn(
                      "space-y-2",
                      !component.isActive && "opacity-70"
                    )}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium sm:text-sm truncate">
                              {component.name}
                            </span>
                            <div
                              className="flex items-center gap-2 flex-shrink-0"
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground sm:text-xs">
                                {component.isActive ? (
                                  <>
                                    <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                    ظاهر
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                    مخفي
                                  </>
                                )}
                              </span>
                              <Switch
                                checked={component.isActive}
                                onCheckedChange={(value) => onToggleVisibility(component.id, value)}
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground sm:text-xs line-clamp-2">
                            {component.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground sm:text-xs">
                          <span>الترتيب</span>
                          <Badge variant="secondary" className="px-2 py-0 text-[10px] sm:text-xs">
                            #{component.orderIndex + 1}
                          </Badge>
                        </div>
                        <div
                          className="flex items-center gap-1"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={() => onMove(component.id, 'up')}
                            disabled={isFirst}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={() => onMove(component.id, 'down')}
                            disabled={isLast}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 border-t bg-muted/40 px-3 py-4 sm:px-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
            {hasLayoutChanges ? (
              <>
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span>توجد تغييرات في ترتيب/ظهور المكوّنات لم يتم حفظها بعد</span>
              </>
            ) : (
              <span>ترتيب المكوّنات الحالي محفوظ.</span>
            )}
          </div>
          <Button
            type="button"
            onClick={onSaveLayout}
            disabled={!hasLayoutChanges || isSavingLayout}
            className="w-full text-xs sm:text-sm"
          >
            {isSavingLayout ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جارٍ حفظ ترتيب المكوّنات...
              </>
            ) : (
              'حفظ ترتيب وظهور المكوّنات'
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Performance Info Card - مخفي على الهاتف */}
      <Card className="border-border/60 bg-muted/30 hidden sm:block">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs sm:text-sm">أداء مثالي</CardTitle>
          <CardDescription className="text-[10px] sm:text-xs">
            تعتمد هذه الصفحة على حالات محلية ومكوّنات محسّنة بـ React.memo مع إمكانية الحفظ في قاعدة البيانات.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-[9px] text-muted-foreground sm:text-xs">
          <p>التغييرات محلية وسريعة مع إشعارات فورية.</p>
          <p>يمكن حفظ التعديلات في قاعدة البيانات مع مؤشرات الحالة.</p>
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="w-3 h-3" />
              <span className="text-xs">لديك تغييرات غير محفوظة</span>
            </div>
          )}
          {hasLayoutChanges && (
            <div className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="w-3 h-3" />
              <span className="text-xs">ترتيب المكوّنات لم يتم حفظه بعد</span>
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  );
};

export default React.memo(ComponentsSidebar);
