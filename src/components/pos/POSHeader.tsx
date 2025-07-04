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
        <div className="bg-orange-500/10 dark:bg-orange-500/20 border border-orange-200 dark:border-orange-800 p-4 mb-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500/20 dark:bg-orange-500/30 p-2 rounded-full">
                <RotateCcw className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-orange-800 dark:text-orange-200">وضع الإرجاع المباشر</h3>
                <p className="text-orange-700 dark:text-orange-300 text-sm">يمكنك مسح المنتجات لإضافتها إلى سلة الإرجاع وإرجاعها للمخزون</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-orange-500/20 dark:bg-orange-500/30 px-3 py-1 rounded-full text-sm font-medium text-orange-800 dark:text-orange-200">
                {returnItemsCount} عنصر في سلة الإرجاع
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onToggleReturnMode}
                className="border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20"
              >
                العودة للبيع
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* شريط الأدوات الرئيسي */}
      <div className="flex justify-between items-center mb-4">
        {/* أزرار خدمات التصليح - تظهر فقط إذا كان التطبيق مفعّل */}
        {isRepairServicesEnabled && (
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              asChild
            >
              <Link to="/repair-services">
                <Wrench className="h-4 w-4 mr-2" />
                خدمات التصليح
              </Link>
            </Button>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            size="sm"
            variant="outline"
            onClick={onQuickReturnOpen}
            title="إرجاع سريع (Ctrl+R)"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            إرجاع سريع
          </Button>

          <Button 
            size="sm"
            variant="outline"
            onClick={onCalculatorOpen}
            title="آلة حاسبة (Ctrl+=)"
          >
            <CalculatorIcon className="h-4 w-4 mr-2" />
            آلة حاسبة
          </Button>

          <Button 
            size="sm"
            variant="outline"
            onClick={onQuickExpenseOpen}
            title="مصروف سريع (Ctrl+E)"
          >
            <Receipt className="h-4 w-4 mr-2" />
            مصروف سريع
          </Button>
          
          {/* زر التبديل لوضع الإرجاع */}
          <Button 
            size="sm"
            variant={isReturnMode ? "default" : "outline"}
            onClick={onToggleReturnMode}
            className={cn(
              isReturnMode 
                ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500" 
                : "border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20"
            )}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {isReturnMode ? 'العودة للبيع' : 'وضع الإرجاع'}
          </Button>
          
          <Button 
            size="sm"
            variant="outline"
            onClick={onPOSSettingsOpen}
            title="الإعدادات (Ctrl+S)"
          >
            <Settings2 className="h-4 w-4 mr-2" />
            الإعدادات
          </Button>

          {/* زر خدمة تصليح جديدة - يظهر فقط إذا كان تطبيق التصليح مفعّل */}
          {isRepairServicesEnabled && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRepairDialogOpen}
            >
              <Wrench className="h-4 w-4 mr-2" />
              خدمة تصليح جديدة
            </Button>
          )}
          
          {/* زر التحديث السريع */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshData}
            disabled={isPOSDataLoading}
            className="h-8 px-3 flex items-center gap-2"
            title="تحديث المخزون والمنتجات (Ctrl+F5)"
          >
            <RefreshCw className={`h-4 w-4 ${isPOSDataLoading ? 'animate-spin' : ''}`} />
            <span className="text-sm">تحديث</span>
          </Button>
        </div>
      </div>
    </>
  );
};

export default POSHeader;
