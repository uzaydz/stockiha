import React from 'react';
import { Package, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface ColorDetailsFormProps {
  form: UseFormReturn<any>;
  useVariantPrices: boolean;
  useSizes: boolean;
  className?: string;
}

const ColorDetailsForm: React.FC<ColorDetailsFormProps> = ({
  form,
  useVariantPrices,
  useSizes,
  className = '',
}) => {
  const currentQuantity = form.watch('quantity') || 0;
  const currentPrice = form.watch('price') || 0;
  const currentPurchasePrice = form.watch('purchase_price') || 0;
  const hasSizes = form.watch('has_sizes') || false;

  // حساب الربح المتوقع
  const expectedProfit = currentPrice && currentPurchasePrice 
    ? (currentPrice - currentPurchasePrice) * currentQuantity
    : 0;

  const profitMargin = currentPrice && currentPurchasePrice && currentPrice > 0
    ? ((currentPrice - currentPurchasePrice) / currentPrice * 100).toFixed(1)
    : '0';

  return (
    <div className={`space-y-6 ${className}`}>
      {/* العنوان */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/20 rounded-lg">
          <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          التفاصيل المالية والكمية
        </h3>
        <div className="h-px bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700 flex-1" />
      </div>

      {/* الحقول الأساسية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* الكمية */}
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Package className="h-4 w-4" />
                الكمية المتوفرة
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    type="number" 
                    min="0" 
                    {...field} 
                    className="h-12 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all duration-200"
                    disabled={useSizes && hasSizes}
                    placeholder="0"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <span className="text-sm text-slate-500 dark:text-slate-400">قطعة</span>
                  </div>
                  {useSizes && hasSizes && (
                    <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">محسوب من المقاسات</span>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* سعر البيع */}
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                سعر البيع
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01"
                    disabled={!useVariantPrices}
                    {...field} 
                    className="h-12 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus:border-green-500 focus:ring-green-500/20 transition-all duration-200 pl-12"
                    placeholder="0.00"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">دج</span>
                  </div>
                  {!useVariantPrices && (
                    <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">سعر ثابت</span>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* سعر الشراء */}
        <FormField
          control={form.control}
          name="purchase_price"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                سعر الشراء
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01"
                    disabled={!useVariantPrices}
                    {...field} 
                    className="h-12 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 pl-12"
                    placeholder="0.00"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">دج</span>
                  </div>
                  {!useVariantPrices && (
                    <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">سعر ثابت</span>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* معلومات الربحية */}
      {useVariantPrices && currentPrice > 0 && currentPurchasePrice > 0 && (
        <Card className="border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              تحليل الربحية
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* هامش الربح */}
              <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {profitMargin}%
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  هامش الربح
                </div>
              </div>
              
              {/* الربح للقطعة الواحدة */}
              <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {(currentPrice - currentPurchasePrice).toLocaleString()}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  ربح القطعة (دج)
                </div>
              </div>
              
              {/* إجمالي الربح المتوقع */}
              <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                  {expectedProfit.toLocaleString()}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  إجمالي الربح (دج)
                </div>
              </div>
            </div>

            {/* شريط تقدم الربحية */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
                <span>منخفض</span>
                <span>متوسط</span>
                <span>عالي</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 transition-all duration-500"
                  style={{ width: `${Math.min(parseFloat(profitMargin), 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ColorDetailsForm;
