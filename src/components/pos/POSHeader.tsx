import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Wrench, 
  Settings2, 
  CreditCard, 
  RotateCcw, 
  Calculator as CalculatorIcon, 
  RefreshCw,
  Receipt
} from 'lucide-react';

interface POSHeaderProps {
  isReturnMode: boolean;
  returnItemsCount: number;
  isRepairServicesEnabled: boolean;
  isPOSDataLoading: boolean;
  onQuickReturnOpen: () => void;
  onCalculatorOpen: () => void;
  onToggleReturnMode: () => void;
  onPOSSettingsOpen: () => void;
  onRepairDialogOpen: () => void;
  onRefreshData: () => Promise<void>;
  onQuickExpenseOpen: () => void;
}

const POSHeader: React.FC<POSHeaderProps> = ({
  isReturnMode,
  returnItemsCount,
  isRepairServicesEnabled,
  isPOSDataLoading,
  onQuickReturnOpen,
  onCalculatorOpen,
  onToggleReturnMode,
  onPOSSettingsOpen,
  onRepairDialogOpen,
  onRefreshData,
  onQuickExpenseOpen
}) => {
  return (
    <>
      {/* شريط تنبيه وضع الإرجاع */}
      {isReturnMode && (
        <div className="bg-orange-500/10 dark:bg-orange-500/20 border border-orange-200 dark:border-orange-800 p-3 md:p-4 mb-3 md:mb-4 rounded-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="bg-orange-500/20 dark:bg-orange-500/30 p-1.5 md:p-2 rounded-full">
                <RotateCcw className="h-4 w-4 md:h-5 md:w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="text-sm md:text-lg font-bold text-orange-800 dark:text-orange-200">وضع الإرجاع المباشر</h3>
                <p className="hidden sm:block text-orange-700 dark:text-orange-300 text-xs md:text-sm">يمكنك مسح المنتجات لإضافتها إلى سلة الإرجاع وإرجاعها للمخزون</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="bg-orange-500/20 dark:bg-orange-500/30 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium text-orange-800 dark:text-orange-200">
                {returnItemsCount} عنصر
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onToggleReturnMode}
                className="border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-xs md:text-sm h-7 md:h-8"
              >
                العودة للبيع
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* شريط الأدوات الرئيسي */}
      <div className="flex justify-between items-center mb-3 md:mb-4">
        {/* مساحة فارغة بدلاً من أزرار خدمات التصليح */}
        <div></div>
        
        <div className="flex flex-wrap gap-1.5 md:gap-2">
          {/* تم إزالة زر الإرجاع السريع */}
          {/* <Button 
            size="sm"
            variant="outline"
            onClick={onQuickReturnOpen}
            title="إرجاع سريع (Ctrl+R)"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            إرجاع سريع
          </Button> */}

          <Button 
            size="sm"
            variant="outline"
            onClick={onCalculatorOpen}
            title="آلة حاسبة (Ctrl+=)"
            className="h-8 md:h-9 text-xs md:text-sm px-2 md:px-3"
          >
            <CalculatorIcon className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden sm:inline">آلة حاسبة</span>
          </Button>

          <Button 
            size="sm"
            variant="outline"
            onClick={onQuickExpenseOpen}
            title="مصروف سريع (Ctrl+E)"
            className="h-8 md:h-9 text-xs md:text-sm px-2 md:px-3"
          >
            <Receipt className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden sm:inline">مصروف سريع</span>
          </Button>
          
          {/* زر التبديل لوضع الإرجاع */}
          <Button 
            size="sm"
            variant={isReturnMode ? "default" : "outline"}
            onClick={onToggleReturnMode}
            className={cn(
              "h-8 md:h-9 text-xs md:text-sm px-2 md:px-3",
              isReturnMode 
                ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500" 
                : "border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20"
            )}
          >
            <RotateCcw className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden sm:inline">{isReturnMode ? 'العودة للبيع' : 'وضع الإرجاع'}</span>
            <span className="sm:hidden">{isReturnMode ? 'بيع' : 'إرجاع'}</span>
          </Button>
          
          <Button 
            size="sm"
            variant="outline"
            onClick={onPOSSettingsOpen}
            title="الإعدادات (Ctrl+S)"
            className="h-8 md:h-9 text-xs md:text-sm px-2 md:px-3"
          >
            <Settings2 className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden sm:inline">الإعدادات</span>
          </Button>

          {/* زر خدمة تصليح جديدة */}
          {isRepairServicesEnabled && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRepairDialogOpen}
              title="خدمة تصليح جديدة"
              className="h-8 md:h-9 text-xs md:text-sm px-2 md:px-3"
            >
              <Wrench className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
              <span className="hidden sm:inline">خدمة تصليح</span>
            </Button>
          )}
          
          {/* زر التحديث السريع */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshData}
            disabled={isPOSDataLoading}
            className="h-8 md:h-9 px-2 md:px-3 flex items-center gap-1 md:gap-2 text-xs md:text-sm"
            title="تحديث المخزون والمنتجات (Ctrl+F5)"
          >
            <RefreshCw className={`h-3.5 w-3.5 md:h-4 md:w-4 ${isPOSDataLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </Button>
        </div>
      </div>
    </>
  );
};

export default POSHeader;
