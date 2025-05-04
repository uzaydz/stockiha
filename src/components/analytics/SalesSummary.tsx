import React, { useEffect } from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/20/solid';
import { useTheme } from '@/context/ThemeContext';

interface SalesSummaryProps {
  data: {
    totalSales: number;
    totalOrders: number;
    totalProfit: number;
    averageOrderValue: number;
    salesGrowth: number;
    profitMargin: number;
    pendingRevenue: number; // المبلغ المتبقي كدين (الدفعات الجزئية)
    partialPaymentCount: number; // عدد الطلبات ذات الدفع الجزئي
    salesByChannel: {
      pos: number;
      online: number;
    };
  };
  period: string;
}

// مكون البطاقة الإحصائية
const StatCard = ({ title, value, subtitle, change, prefix = 'دج' }: { 
  title: string, 
  value: number | string, 
  subtitle?: string,
  change?: number,
  prefix?: string
}) => {
  const { theme } = useTheme();
  const isPositive = typeof change === 'number' ? change >= 0 : undefined;
  
  return (
    <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-muted-foreground text-sm font-medium mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-foreground">
            {typeof value === 'number' ? `${value} ${prefix}` : value}
          </h3>
          {subtitle && <p className="text-muted-foreground text-xs mt-1">{subtitle}</p>}
        </div>
        
        {typeof change === 'number' && (
          <div className={`flex items-center text-sm font-medium ${isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            {isPositive ? (
              <ArrowUpIcon className="w-4 h-4 ml-1" />
            ) : (
              <ArrowDownIcon className="w-4 h-4 ml-1" />
            )}
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

const SalesSummary: React.FC<SalesSummaryProps> = ({ data, period }) => {
  const { theme } = useTheme();
  
  useEffect(() => {
    console.log('SalesSummary - البيانات المستلمة:', {
      data,
      period
    });
  }, [data, period]);

  // تحويل فترة التحليل إلى نص عربي
  const getPeriodText = () => {
    switch (period) {
      case 'day': return 'يوم';
      case 'week': return 'أسبوع';
      case 'month': return 'شهر';
      case 'quarter': return 'ربع';
      case 'year': return 'سنة';
      case 'custom': return 'تخصيص';
      default: return 'هذا الشهر';
    }
  };

  // حساب نسبة المبيعات عبر القنوات
  const posPercentage = (data.salesByChannel.pos / (data.salesByChannel.pos + data.salesByChannel.online)) * 100;
  const onlinePercentage = (data.salesByChannel.online / (data.salesByChannel.pos + data.salesByChannel.online)) * 100;

  return (
    <div className="mb-8">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-foreground">ملخص المبيعات <span className="text-muted-foreground font-normal">({getPeriodText()})</span></h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* إجمالي المبيعات */}
        <StatCard 
          title="إجمالي المبيعات" 
          value={data.totalSales.toFixed(2)} 
          change={data.salesGrowth} 
        />
        
        {/* إجمالي الأرباح */}
        <StatCard 
          title="إجمالي الأرباح" 
          value={data.totalProfit.toFixed(2)}
          subtitle={`هامش ربح ${data.profitMargin.toFixed(1)}%`}
        />
        
        {/* عدد الطلبات */}
        <StatCard 
          title="عدد الطلبات" 
          value={data.totalOrders} 
          prefix=""
        />
        
        {/* متوسط قيمة الطلب */}
        <StatCard 
          title="متوسط قيمة الطلب" 
          value={data.averageOrderValue.toFixed(2)} 
        />
      </div>
      
      {/* إضافة صف جديد لديون الدفعات الجزئية في حال وجودها */}
      {data.pendingRevenue > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* الديون (الدفعات الجزئية) */}
          <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
            <p className="text-muted-foreground text-sm font-medium mb-2">المبالغ المستحقة (الدفعات الجزئية)</p>
            <div className="flex items-end justify-between">
              <h3 className="text-2xl font-bold text-foreground">{data.pendingRevenue.toFixed(2)} دج</h3>
              <span className="text-muted-foreground text-sm">{data.partialPaymentCount} طلب بدفع جزئي</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              هذه المبالغ مستحقة من طلبات بدفع جزئي، وتعتبر جزءًا من الإيرادات المتوقعة
            </div>
          </div>
          
          {/* توزيع المبيعات (مستلم/مستحق) */}
          <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
            <p className="text-muted-foreground text-sm font-medium mb-2">توزيع المبيعات</p>
            <div className="flex items-end justify-between">
              <h3 className="text-2xl font-bold text-foreground">توزيع الإيرادات</h3>
            </div>
            <div className={`w-full ${theme === 'dark' ? 'bg-muted' : 'bg-gray-200'} rounded-full h-2 mt-2`}>
              <div 
                className="bg-primary h-2 rounded-full" 
                style={{ width: `${(data.totalSales - data.pendingRevenue) / data.totalSales * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span>مستلم: {(data.totalSales - data.pendingRevenue).toFixed(2)} دج</span>
              <span>مستحق: {data.pendingRevenue.toFixed(2)} دج</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* مبيعات نقطة البيع */}
        <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
          <p className="text-muted-foreground text-sm font-medium mb-2">مبيعات نقطة البيع (POS)</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold text-foreground">{data.salesByChannel.pos} دج</h3>
            <span className="text-muted-foreground text-sm">{posPercentage.toFixed(1)}% من المبيعات</span>
          </div>
          <div className={`w-full ${theme === 'dark' ? 'bg-muted' : 'bg-gray-200'} rounded-full h-2 mt-2`}>
            <div 
              className="bg-primary h-2 rounded-full" 
              style={{ width: `${posPercentage}%` }}
            ></div>
          </div>
        </div>
        
        {/* مبيعات المتجر الإلكتروني */}
        <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
          <p className="text-muted-foreground text-sm font-medium mb-2">مبيعات المتجر الإلكتروني</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold text-foreground">{data.salesByChannel.online} دج</h3>
            <span className="text-muted-foreground text-sm">{onlinePercentage.toFixed(1)}% من المبيعات</span>
          </div>
          <div className={`w-full ${theme === 'dark' ? 'bg-muted' : 'bg-gray-200'} rounded-full h-2 mt-2`}>
            <div 
              className={`${theme === 'dark' ? 'bg-purple-500' : 'bg-purple-600'} h-2 rounded-full`} 
              style={{ width: `${onlinePercentage}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesSummary; 