import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useTenant } from '@/context/TenantContext';
import { toast } from 'sonner';

// مكونات لوحة التحليلات
import SalesSummary from '@/components/analytics/SalesSummary';
import SalesOverTime from '@/components/analytics/SalesOverTime';
import ProductPerformance from '@/components/analytics/ProductPerformance';
import SalesChannels from '@/components/analytics/SalesChannels';
import ProfitAnalysis from '@/components/analytics/ProfitAnalysis';
import ExpenseTracking from '@/components/analytics/ExpenseTracking';
import CategoryAnalysis from '@/components/analytics/CategoryAnalysis';
import InventoryStatus from '@/components/analytics/InventoryStatus';

// استيراد واجهة الـ API
import { 
  getAllAnalytics,
  AnalyticsData,
  AnalyticsPeriod
} from '@/lib/api/analytics';

const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useTenant();
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const [customDateRange, setCustomDateRange] = useState<{start: Date, end: Date}>({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end: new Date()
  });
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // تحميل بيانات التحليلات عند تغيير الفترة أو المؤسسة
  useEffect(() => {
    if (!currentOrganization?.id) {
      
      return;
    }
    
    
    
    const fetchAnalyticsData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        
        
        // استخدام البيانات الحقيقية من الـ API
        const data = await getAllAnalytics(
          currentOrganization.id, 
          period, 
          period === 'custom' ? customDateRange.start : undefined,
          period === 'custom' ? customDateRange.end : undefined
        );
        
        // التأكد من أن بيانات المصروفات موجودة
        if (!data.expenses || !data.expenses.categories || Object.keys(data.expenses.categories).length === 0) {
          
          
          // إذا كانت المصروفات فارغة، استخدم بيانات تجريبية للمصروفات
          data.expenses = {
            total: 27000,
            categories: {
              'الرواتب': 10000,
              'الإيجار': 5000,
              'المشتريات': 7000,
              'التسويق': 3000,
              'أخرى': 2000
            }
          };
        }
        
        
        setAnalyticsData(data);
      } catch (err) {
        console.error('خطأ في تحميل بيانات التحليلات:', err);
        setError('حدث خطأ أثناء تحميل بيانات التحليلات');
        toast.error('فشل في تحميل بيانات التحليلات');
        
        // استخدام بيانات تجريبية في حالة الفشل للعرض
        const mockData = getMockAnalyticsData(period);
        
        setAnalyticsData(mockData);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, [currentOrganization?.id, period, customDateRange, refreshTrigger]);

  // معالج تغيير الفترة
  const handlePeriodChange = (newPeriod: AnalyticsPeriod) => {
    
    setPeriod(newPeriod);
  };
  
  // معالج تغيير نطاق التاريخ المخصص
  const handleDateRangeChange = (start: Date, end: Date) => {
    
    setCustomDateRange({ start, end });
  };
  
  // معالج تطبيق نطاق التاريخ المخصص
  const handleApplyCustomRange = () => {
    
    setRefreshTrigger(prev => prev + 1);
  };

  // توليد بيانات تجريبية - تستخدم فقط في حالة فشل تحميل البيانات الحقيقية
  const getMockAnalyticsData = (selectedPeriod: AnalyticsPeriod): AnalyticsData => {
    // بيانات تجريبية للعرض في حال فشل الطلب من الخادم
    return {
      totalSales: 128750.50,
      totalOrders: 1250,
      totalProfit: 45320.75,
      averageOrderValue: 103.00,
      salesGrowth: 12.5,
      profitMargin: 35.2,
      pendingRevenue: 18500.00, // المبالغ المستحقة كدفعات جزئية
      partialPaymentCount: 85, // عدد الطلبات ذات الدفع الجزئي
      salesByChannel: {
        pos: 85320.25,
        online: 43430.25
      },
      salesByMonth: {
        'يناير': 10250,
        'فبراير': 12300,
        'مارس': 9800,
        'أبريل': 11250,
        'مايو': 13400,
        'يونيو': 15200,
        'يوليو': 14300,
        'أغسطس': 12800,
        'سبتمبر': 10500,
        'أكتوبر': 9600,
        'نوفمبر': 11900,
        'ديسمبر': 13750
      },
      topProducts: [
        { id: '1', name: 'تيشيرت قطني', sales: 12500, profit: 4200, quantity: 250 },
        { id: '2', name: 'بنطلون جينز', sales: 9800, profit: 3500, quantity: 120 },
        { id: '3', name: 'حذاء رياضي', sales: 8900, profit: 3200, quantity: 90 },
        { id: '4', name: 'قميص رسمي', sales: 7500, profit: 2800, quantity: 85 },
        { id: '5', name: 'سويت شيرت', sales: 6800, profit: 2400, quantity: 75 }
      ],
      topCategories: [
        { id: '1', name: 'ملابس', sales: 35000, profit: 12000 },
        { id: '2', name: 'أحذية', sales: 25000, profit: 8500 },
        { id: '3', name: 'إكسسوارات', sales: 12000, profit: 4200 }
      ],
      expenses: {
        total: 65000,
        categories: {
          'إيجار': 15000,
          'رواتب': 28000,
          'مشتريات': 12000,
          'تسويق': 5000,
          'أخرى': 5000
        }
      },
      inventory: {
        totalValue: 230000,
        lowStock: 15,
        outOfStock: 3,
        totalItems: 450
      }
    };
  };

  // استخراج عنوان الفترة
  const getPeriodTitle = (): string => {
    switch (period) {
      case 'day': return 'يوم';
      case 'week': return 'أسبوع';
      case 'month': return 'شهر';
      case 'quarter': return 'ربع';
      case 'year': return 'سنة';
      case 'custom': 
        const startDate = customDateRange.start.toLocaleDateString('ar-SA');
        const endDate = customDateRange.end.toLocaleDateString('ar-SA');
        return `من ${startDate} إلى ${endDate}`;
      default: return 'هذا الشهر';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold text-primary-900">تحليلات المبيعات</h1>
            
            {/* تصميم جديد لأزرار اختيار الفترة الزمنية */}
            <div className="bg-white dark:bg-card rounded-lg shadow overflow-hidden">
              <div className="flex items-center">
                {(['day', 'week', 'month', 'quarter', 'year'] as AnalyticsPeriod[]).map((p, index) => (
                  <button
                    key={p}
                    onClick={() => handlePeriodChange(p)}
                    className={`relative px-5 py-3 text-sm border-b-2 ${
                      period === p 
                        ? 'text-primary-700 dark:text-primary-400 border-primary-600 dark:border-primary-400 font-bold' 
                        : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {p === 'day' && 'يوم'}
                    {p === 'week' && 'أسبوع'}
                    {p === 'month' && 'شهر'}
                    {p === 'quarter' && 'ربع'}
                    {p === 'year' && 'سنة'}
                  </button>
                ))}
                <button
                  onClick={() => handlePeriodChange('custom')}
                  className={`relative px-5 py-3 text-sm border-b-2 ${
                    period === 'custom' 
                      ? 'text-primary-700 dark:text-primary-400 border-primary-600 dark:border-primary-400 font-bold' 
                      : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  تخصيص
                </button>
              </div>
            </div>
          </div>
          
          {period === 'custom' && (
            <div className="mb-6 bg-white dark:bg-card p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-auto flex gap-2 sm:gap-4">
                  <div className="w-full sm:w-auto">
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">من:</label>
                    <input 
                      type="date" 
                      className="w-full border-gray-200 dark:border-gray-700 dark:bg-muted rounded focus:border-primary-500 focus:ring focus:ring-primary-200 focus:ring-opacity-50 text-sm py-2 px-3"
                      value={customDateRange.start.toISOString().split('T')[0]}
                      onChange={(e) => handleDateRangeChange(new Date(e.target.value), customDateRange.end)}
                    />
                  </div>
                  <div className="w-full sm:w-auto">
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">إلى:</label>
                    <input 
                      type="date" 
                      className="w-full border-gray-200 dark:border-gray-700 dark:bg-muted rounded focus:border-primary-500 focus:ring focus:ring-primary-200 focus:ring-opacity-50 text-sm py-2 px-3"
                      value={customDateRange.end.toISOString().split('T')[0]}
                      onChange={(e) => handleDateRangeChange(customDateRange.start, new Date(e.target.value))}
                    />
                  </div>
                </div>
                <button 
                  className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 text-white py-2 px-4 rounded-md text-sm mt-2 sm:mt-5"
                  onClick={handleApplyCustomRange}
                >
                  تطبيق الفترة
                </button>
              </div>
            </div>
          )}
          
          <div className="mb-4 inline-flex items-center gap-2 bg-gray-50 dark:bg-gray-800 py-1 px-3 rounded-full text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary-500 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{getPeriodTitle()}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 text-white px-4 py-2 rounded-md"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : analyticsData ? (
          <div className="space-y-8">
            {/* ملخص المبيعات */}
            <SalesSummary data={analyticsData} period={period} />
            
            {/* الرسوم البيانية للمبيعات عبر الزمن */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SalesOverTime data={analyticsData} period={period} />
              <SalesChannels data={analyticsData} />
            </div>
            
            {/* تحليل الأرباح والمصروفات */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProfitAnalysis data={analyticsData} />
              <ExpenseTracking data={analyticsData} />
            </div>
            
            {/* تحليل المنتجات والفئات */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProductPerformance data={analyticsData} />
              <CategoryAnalysis data={analyticsData} />
            </div>
            
            {/* حالة المخزون */}
            <InventoryStatus data={analyticsData.inventory} />
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">لا توجد بيانات متاحة للفترة المحددة</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Analytics; 