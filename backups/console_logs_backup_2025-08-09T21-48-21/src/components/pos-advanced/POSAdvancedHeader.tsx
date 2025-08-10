import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
  Zap,
  Receipt
} from 'lucide-react';

interface POSAdvancedHeaderProps {
  isReturnMode: boolean;
  returnItemsCount: number;
  isRepairServicesEnabled: boolean;
  isPOSDataLoading: boolean;
  onCalculatorOpen: () => void;
  onToggleReturnMode: () => void;
  onPOSSettingsOpen: () => void;
  onRepairDialogOpen?: () => void; // ✅ إضافة نافذة التصليح
  onQuickExpenseOpen: () => void; // ✅ إضافة نافذة المصروف السريع
  onRefreshData: () => Promise<void>;
  executionTime?: number;
  dataTimestamp?: Date | string | null;
}

const POSAdvancedHeader: React.FC<POSAdvancedHeaderProps> = ({
  isReturnMode,
  returnItemsCount,
  isRepairServicesEnabled,
  isPOSDataLoading,
  onCalculatorOpen,
  onToggleReturnMode,
  onPOSSettingsOpen,
  onRepairDialogOpen, // ✅ إضافة نافذة التصليح
  onQuickExpenseOpen, // ✅ إضافة نافذة المصروف السريع
  onRefreshData,
  executionTime,
  dataTimestamp
}) => {
  // تنسيق وقت آخر تحديث
  const formatLastUpdate = (date?: Date | string | null) => {
    if (!date) return '';
    
    // تحويل النص إلى كائن Date إذا لزم الأمر
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // التحقق من صحة التاريخ
    if (isNaN(dateObj.getTime())) return '';
    
    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    return dateObj.toLocaleString('ar-DZ');
  };

  return (
    <div className={cn(
      "bg-background border-b px-6 py-4 shadow-sm",
      isReturnMode && "bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 backdrop-blur-sm"
    )}>
      
      <div className="relative flex items-center justify-between">
        {/* الجانب الأيمن - العنوان والمؤشرات */}
        <div className="flex items-center gap-4">
          {/* عنوان وحالة POS */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg ring-1 shadow-sm",
              isReturnMode 
                ? "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-200 ring-amber-200/50 dark:ring-amber-700/50" 
                : "bg-primary/10 text-primary ring-primary/20"
            )}>
              {isReturnMode ? (
                <RotateCcw className="h-5 w-5" />
              ) : (
                <Zap className="h-5 w-5" />
              )}
            </div>
            
            <div>
              <h1 className={cn(
                "text-xl font-bold",
                isReturnMode 
                  ? "text-amber-900 dark:text-amber-50" 
                  : "text-foreground"
              )}>
                {isReturnMode ? (
                  'نقطة البيع - وضع الإرجاع'
                ) : (
                  'نقطة البيع المتقدمة'
                )}
              </h1>
              
              {/* مؤشرات الأداء والحالة */}
              <div className="flex items-center gap-2 mt-1">
                {/* حالة الاتصال */}
                <Badge variant="outline" className={cn(
                  "text-xs shadow-sm",
                  isReturnMode 
                    ? "border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-200 bg-amber-50/50 dark:bg-amber-950/30" 
                    : ""
                )}>
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1 shadow-sm" />
                  متصل
                </Badge>
                
                {/* وقت التنفيذ */}
                {executionTime && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="secondary" className={cn(
                          "text-xs shadow-sm",
                          isReturnMode 
                            ? "bg-amber-100/60 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-200/50 dark:border-amber-700/50" 
                            : ""
                        )}>
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
                        <Badge variant="outline" className={cn(
                          "text-xs text-muted-foreground shadow-sm",
                          isReturnMode 
                            ? "border-amber-200/60 dark:border-amber-700/60 text-amber-600 dark:text-amber-300 bg-amber-50/30 dark:bg-amber-950/20" 
                            : ""
                        )}>
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
                
                {/* عداد عناصر الإرجاع المحسن */}
                {isReturnMode && returnItemsCount > 0 && (
                  <Badge className="bg-amber-600 dark:bg-amber-500 text-white text-sm shadow-lg dark:shadow-amber-900/30">
                    {returnItemsCount} عنصر للإرجاع
                  </Badge>
                )}
                
                {/* رسالة تنبيه وضع الإرجاع المحسنة */}
                {isReturnMode && (
                  <Badge variant="outline" className="border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-200 text-xs shadow-sm bg-amber-50/30 dark:bg-amber-950/20">
                    وضع الإرجاع نشط
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
                    "h-9 px-3 shadow-sm transition-all duration-200",
                    isPOSDataLoading && "bg-muted",
                    isReturnMode && "border-amber-200 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md"
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

          <Separator orientation="vertical" className={cn(
            "h-6",
            isReturnMode && "bg-amber-200 dark:bg-amber-700"
          )} />

          {/* زر وضع الإرجاع البسيط */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isReturnMode ? "default" : "outline"}
                  size="sm"
                  onClick={onToggleReturnMode}
                  className={cn(
                    "h-9 px-4 shadow-sm transition-all duration-200",
                    isReturnMode 
                      ? "bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white shadow-lg dark:shadow-amber-900/30" 
                      : "border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:shadow-md"
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

          {/* زر الآلة الحاسبة */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCalculatorOpen}
                  className={cn(
                    "h-9 px-3 shadow-sm transition-all duration-200",
                    isReturnMode && "border-amber-200 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md"
                  )}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  حاسبة
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                الآلة الحاسبة (Ctrl+Alt+C)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* زر المصروف السريع */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onQuickExpenseOpen}
                  className={cn(
                    "h-9 px-3 shadow-sm transition-all duration-200",
                    isReturnMode && "border-amber-200 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md"
                  )}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  مصروف سريع
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                إضافة مصروف سريع (Ctrl+E)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* زر خدمة التصليح */}
          {isRepairServicesEnabled && onRepairDialogOpen && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRepairDialogOpen}
                    className={cn(
                      "h-9 px-3 shadow-sm transition-all duration-200",
                      isReturnMode && "border-amber-200 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md"
                    )}
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    تصليح
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  خدمة التصليح
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* زر إعدادات POS */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPOSSettingsOpen}
                  className={cn(
                    "h-9 px-3 shadow-sm transition-all duration-200",
                    isReturnMode && "border-amber-200 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md"
                  )}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  إعدادات
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                إعدادات POS (Ctrl+,)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};

export default POSAdvancedHeader;
