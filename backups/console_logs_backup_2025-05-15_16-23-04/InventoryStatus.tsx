import React, { useEffect } from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/20/solid';
import { useTheme } from '@/context/ThemeContext';

interface InventoryStatusProps {
  data: {
    totalValue: number;
    lowStock: number;
    outOfStock: number;
    totalItems: number;
  };
}

const InventoryStatus: React.FC<InventoryStatusProps> = ({ data }) => {
  const { theme } = useTheme();
  const { totalValue, lowStock, outOfStock, totalItems } = data;
  
  useEffect(() => {
    console.log('InventoryStatus - بيانات المخزون المستلمة:', {
      totalValue,
      lowStock,
      outOfStock,
      totalItems
    });
  }, [totalValue, lowStock, outOfStock, totalItems]);

  // حساب النسب المئوية
  const inStockPercentage = (totalItems - lowStock - outOfStock) / totalItems * 100;
  const lowStockPercentage = lowStock / totalItems * 100;
  const outOfStockPercentage = outOfStock / totalItems * 100;

  return (
    <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-foreground mb-1">
          حالة المخزون
        </h3>
        <p className="text-sm text-muted-foreground">
          نظرة عامة على حالة المخزون والمنتجات
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className={`${theme === 'dark' ? 'bg-muted/40' : 'bg-gray-50'} p-4 rounded-lg`}>
          <p className={`text-sm ${theme === 'dark' ? 'text-foreground/80' : 'text-gray-700'} mb-1`}>إجمالي قيمة المخزون</p>
          <p className="text-xl font-bold text-foreground">{totalValue} دج</p>
        </div>
        
        <div className={`${theme === 'dark' ? 'bg-primary/10' : 'bg-blue-50'} p-4 rounded-lg`}>
          <p className={`text-sm ${theme === 'dark' ? 'text-primary' : 'text-blue-700'} mb-1`}>إجمالي المنتجات</p>
          <p className={`text-xl font-bold ${theme === 'dark' ? 'text-primary' : 'text-blue-900'}`}>{totalItems}</p>
        </div>
        
        <div className={`${theme === 'dark' ? 'bg-amber-900/10' : 'bg-amber-50'} p-4 rounded-lg`}>
          <p className={`text-sm ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'} mb-1`}>منتجات مخزون منخفض</p>
          <p className={`text-xl font-bold ${theme === 'dark' ? 'text-amber-400' : 'text-amber-900'}`}>{lowStock}</p>
        </div>
        
        <div className={`${theme === 'dark' ? 'bg-red-900/10' : 'bg-red-50'} p-4 rounded-lg`}>
          <p className={`text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-700'} mb-1`}>منتجات غير متوفرة</p>
          <p className={`text-xl font-bold ${theme === 'dark' ? 'text-red-400' : 'text-red-900'}`}>{outOfStock}</p>
        </div>
      </div>
      
      <div className="mb-6">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">توزيع حالة المخزون</h4>
        
        <div className={`w-full h-4 ${theme === 'dark' ? 'bg-muted' : 'bg-gray-200'} rounded-full overflow-hidden mb-4`}>
          <div className="flex h-full">
            <div 
              className={`${theme === 'dark' ? 'bg-green-600' : 'bg-green-500'} h-full`} 
              style={{ width: `${inStockPercentage}%` }}
            ></div>
            <div 
              className={`${theme === 'dark' ? 'bg-amber-500/90' : 'bg-amber-500'} h-full`} 
              style={{ width: `${lowStockPercentage}%` }}
            ></div>
            <div 
              className={`${theme === 'dark' ? 'bg-red-500/90' : 'bg-red-500'} h-full`} 
              style={{ width: `${outOfStockPercentage}%` }}
            ></div>
          </div>
        </div>
        
        <div className="flex justify-between text-sm text-muted-foreground">
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full ${theme === 'dark' ? 'bg-green-600' : 'bg-green-500'} mr-2`}></span>
            <span>متوفر ({(inStockPercentage).toFixed(1)}%)</span>
          </div>
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full ${theme === 'dark' ? 'bg-amber-500/90' : 'bg-amber-500'} mr-2`}></span>
            <span>مخزون منخفض ({(lowStockPercentage).toFixed(1)}%)</span>
          </div>
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full ${theme === 'dark' ? 'bg-red-500/90' : 'bg-red-500'} mr-2`}></span>
            <span>غير متوفر ({(outOfStockPercentage).toFixed(1)}%)</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">إجراءات موصى بها</h4>
          <div className="space-y-3">
            {lowStock > 0 && (
              <div className={`${theme === 'dark' ? 'bg-amber-900/10' : 'bg-amber-50'} p-3 rounded-lg border-r-4 border-amber-500`}>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-amber-400' : 'text-amber-800'}`}>
                  يجب إعادة طلب {lowStock} منتج ذو مخزون منخفض
                </p>
              </div>
            )}
            
            {outOfStock > 0 && (
              <div className={`${theme === 'dark' ? 'bg-red-900/10' : 'bg-red-50'} p-3 rounded-lg border-r-4 border-red-500`}>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-red-400' : 'text-red-800'}`}>
                  هناك {outOfStock} منتج غير متوفر في المخزون
                </p>
              </div>
            )}
            
            <div className={`${theme === 'dark' ? 'bg-primary/10' : 'bg-blue-50'} p-3 rounded-lg border-r-4 ${theme === 'dark' ? 'border-primary' : 'border-blue-500'}`}>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-primary' : 'text-blue-800'}`}>
                قم بمراجعة طلبات المشتريات القادمة
              </p>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">مؤشرات أداء المخزون</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">متوسط قيمة المنتج</span>
              <span className="text-sm font-medium text-foreground">
                {(totalValue / totalItems).toFixed(2)} دج
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">مؤشر نفاد المخزون</span>
              <div className={`flex items-center ${outOfStockPercentage > 5 ? theme === 'dark' ? 'text-red-400' : 'text-red-600' : theme === 'dark' ? 'text-emerald-400' : 'text-green-600'}`}>
                <span className="text-sm font-medium">
                  {outOfStockPercentage.toFixed(1)}%
                </span>
                {outOfStockPercentage > 5 ? (
                  <ArrowUpIcon className="w-4 h-4 ml-1" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4 ml-1" />
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">مؤشر المخزون المنخفض</span>
              <div className={`flex items-center ${lowStockPercentage > 10 ? theme === 'dark' ? 'text-amber-400' : 'text-amber-600' : theme === 'dark' ? 'text-emerald-400' : 'text-green-600'}`}>
                <span className="text-sm font-medium">
                  {lowStockPercentage.toFixed(1)}%
                </span>
                {lowStockPercentage > 10 ? (
                  <ArrowUpIcon className="w-4 h-4 ml-1" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4 ml-1" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryStatus; 