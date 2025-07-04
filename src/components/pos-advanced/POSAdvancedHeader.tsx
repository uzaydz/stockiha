import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  RefreshCw,
  RotateCcw,
  Calculator,
  Settings,
  Wrench,
  Clock,
  Activity,
  ChevronDown,
  Zap
} from 'lucide-react';

interface POSAdvancedHeaderProps {
  isReturnMode: boolean;
  returnItemsCount: number;
  isRepairServicesEnabled: boolean;
  isPOSDataLoading: boolean;
  onQuickReturnOpen: () => void;
  onCalculatorOpen: () => void;
  onToggleReturnMode: () => void;
  onPOSSettingsOpen: () => void;
  onRefreshData: () => Promise<void>;
  executionTime?: number;
  dataTimestamp?: Date;
}

const POSAdvancedHeader: React.FC<POSAdvancedHeaderProps> = ({
  isReturnMode,
  returnItemsCount,
  isRepairServicesEnabled,
  isPOSDataLoading,
  onQuickReturnOpen,
  onCalculatorOpen,
  onToggleReturnMode,
  onPOSSettingsOpen,
  onRefreshData,
  executionTime,
  dataTimestamp
}) => {
  // تنسيق وقت آخر تحديث
  const formatLastUpdate = (date?: Date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    return date.toLocaleString('ar-DZ');
  };

  return (
    <div className={cn(
      "bg-background border-b transition-all duration-300 px-6 py-4",
      isReturnMode && "bg-orange-50/30 border-orange-200"
    )}>
      <div className="flex items-center justify-between">
        {/* الجانب الأيمن - العنوان والمؤشرات */}
        <div className="flex items-center gap-4">
          {/* عنوان وحالة POS */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg transition-colors",
              isReturnMode 
                ? "bg-orange-500/10 text-orange-600" 
                : "bg-primary/10 text-primary"
            )}>
              {isReturnMode ? (
                <RotateCcw className="h-5 w-5" />
              ) : (
                <Zap className="h-5 w-5" />
              )}
            </div>
            
            <div>
              <h1 className={cn(
                "text-xl font-bold transition-colors",
                isReturnMode && "text-orange-800"
              )}>
                {isReturnMode ? 'نقطة البيع - وضع الإرجاع' : 'نقطة البيع المتقدمة'}
              </h1>
              
              {/* مؤشرات الأداء والحالة */}
              <div className="flex items-center gap-2 mt-1">
                {/* حالة الاتصال */}
                <Badge variant="outline" className="text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                  متصل
                </Badge>
                
                {/* وقت التنفيذ */}
                {executionTime && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="secondary" className="text-xs">
                          <Activity className="h-3 w-3 mr-1" />
                          {executionTime}ms
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        وقت تحميل البيانات من قاعدة البيانات
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {/* آخر تحديث */}
                {dataTimestamp && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatLastUpdate(dataTimestamp)}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        آخر تحديث للبيانات
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {/* عداد عناصر الإرجاع */}
                {isReturnMode && returnItemsCount > 0 && (
                  <Badge className="bg-orange-500 text-white text-xs">
                    {returnItemsCount} عنصر للإرجاع
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* الجانب الأيسر - أزرار التحكم */}
        <div className="flex items-center gap-2">
          {/* زر التحديث السريع */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefreshData}
                  disabled={isPOSDataLoading}
                  className={cn(
                    "h-9 px-3 transition-all duration-200",
                    isPOSDataLoading && "bg-muted"
                  )}
                >
                  <RefreshCw className={cn(
                    "h-4 w-4 mr-2",
                    isPOSDataLoading && "animate-spin"
                  )} />
                  {isPOSDataLoading ? 'جاري التحديث...' : 'تحديث البيانات'}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                تحديث جميع البيانات (Ctrl+F5)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-6" />

          {/* زر وضع الإرجاع */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isReturnMode ? "default" : "outline"}
                  size="sm"
                  onClick={onToggleReturnMode}
                  className={cn(
                    "h-9 px-3 transition-all duration-200",
                    isReturnMode && "bg-orange-500 hover:bg-orange-600 text-white"
                  )}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {isReturnMode ? 'إيقاف الإرجاع' : 'وضع الإرجاع'}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                تفعيل/إلغاء وضع إرجاع المنتجات (Ctrl+R)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* زر الإرجاع السريع */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onQuickReturnOpen}
                  className="h-9 px-3"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  إرجاع سريع
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                إرجاع منتجات باستخدام رقم الطلبية (Ctrl+Shift+R)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-6" />

          {/* أدوات إضافية */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3">
                الأدوات
                <ChevronDown className="h-4 w-4 mr-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onCalculatorOpen}>
                <Calculator className="h-4 w-4 ml-2" />
                الآلة الحاسبة
                <span className="mr-auto text-xs text-muted-foreground">
                  Ctrl+Alt+C
                </span>
              </DropdownMenuItem>
              
              {isRepairServicesEnabled && (
                <>
                  <DropdownMenuItem>
                    <Wrench className="h-4 w-4 ml-2" />
                    خدمة التصليح
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              
              <DropdownMenuItem onClick={onPOSSettingsOpen}>
                <Settings className="h-4 w-4 ml-2" />
                إعدادات POS
                <span className="mr-auto text-xs text-muted-foreground">
                  Ctrl+,
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default POSAdvancedHeader; 