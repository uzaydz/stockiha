import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTheme } from '@/context/ThemeContext';

// تسجيل مكونات الرسم البياني
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface CategoryAnalysisProps {
  data: {
    topCategories: Array<{
      id: string;
      name: string;
      sales: number;
      profit: number;
    }>;
  };
}

const CategoryAnalysis: React.FC<CategoryAnalysisProps> = ({ data }) => {
  const { theme } = useTheme();
  
  // بيانات الرسم البياني
  const categoryNames = data.topCategories.map(category => category.name);
  const salesData = data.topCategories.map(category => category.sales);
  const profitData = data.topCategories.map(category => category.profit);

  // ألوان تتناسب مع الوضعين المظلم والفاتح
  const salesColor = theme === 'dark' ? 'rgba(59, 130, 246, 0.8)' : '#3b82f6';
  const profitColor = theme === 'dark' ? 'rgba(52, 211, 153, 0.8)' : '#10b981';

  const chartData = {
    labels: categoryNames,
    datasets: [
      {
        label: 'المبيعات',
        data: salesData,
        backgroundColor: salesColor,
        borderRadius: 4,
      },
      {
        label: 'الأرباح',
        data: profitData,
        backgroundColor: profitColor,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          padding: 15,
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : '#4b5563',
          font: {
            family: 'Tajawal, sans-serif',
            size: 12,
          }
        },
      },
      tooltip: {
        backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(0, 0, 0, 0.8)',
        titleColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : '#ffffff',
        bodyColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : '#ffffff',
        titleFont: {
          size: 14,
          family: 'Tajawal, sans-serif',
        },
        bodyFont: {
          size: 13,
          family: 'Tajawal, sans-serif',
        },
        padding: 12,
        cornerRadius: 6,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.raw || 0;
            return `${label}: ${value} دج`;
          }
        }
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        stacked: false,
        grid: {
          display: false,
        },
        ticks: {
          callback: function(value: any) {
            return value + ' دج';
          },
          font: {
            family: 'Tajawal, sans-serif',
          },
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#6b7280',
        },
      },
      y: {
        stacked: false,
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: 'Tajawal, sans-serif',
          },
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#4b5563',
        },
      },
    },
  };

  // حساب المؤشرات المالية
  const totalCategorySales = data.topCategories.reduce((sum, category) => sum + category.sales, 0);
  const totalCategoryProfit = data.topCategories.reduce((sum, category) => sum + category.profit, 0);
  const avgProfitMargin = (totalCategoryProfit / totalCategorySales) * 100;

  return (
    <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-foreground mb-1">
          تحليل فئات المنتجات
        </h3>
        <p className="text-sm text-muted-foreground">
          مقارنة مبيعات وأرباح الفئات الرئيسية
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className={`${theme === 'dark' ? 'bg-muted/40' : 'bg-gray-50'} rounded-lg p-3`}>
          <p className={`text-xs ${theme === 'dark' ? 'text-foreground/80' : 'text-gray-700'} mb-1`}>عدد الفئات</p>
          <p className="text-lg font-bold text-foreground">{data.topCategories.length}</p>
        </div>
        
        <div className={`${theme === 'dark' ? 'bg-primary/10' : 'bg-blue-50'} rounded-lg p-3`}>
          <p className={`text-xs ${theme === 'dark' ? 'text-primary' : 'text-blue-700'} mb-1`}>إجمالي المبيعات</p>
          <p className={`text-lg font-bold ${theme === 'dark' ? 'text-primary' : 'text-blue-900'}`}>{totalCategorySales} دج</p>
        </div>
        
        <div className={`${theme === 'dark' ? 'bg-emerald-900/20' : 'bg-emerald-50'} rounded-lg p-3`}>
          <p className={`text-xs ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'} mb-1`}>متوسط هامش الربح</p>
          <p className={`text-lg font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-900'}`}>{avgProfitMargin.toFixed(1)}%</p>
        </div>
      </div>
      
      <div className="h-64 mb-4">
        <Bar data={chartData} options={options as any} />
      </div>
      
      <div className="mt-6">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">تفاصيل الفئات</h4>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  الفئة
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  المبيعات
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  الأرباح
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  هامش الربح
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {data.topCategories.map((category) => {
                const profitMargin = (category.profit / category.sales) * 100;
                
                return (
                  <tr key={category.id}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-foreground">
                      {category.name}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">
                      {category.sales} دج
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">
                      {category.profit} دج
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">
                      {profitMargin.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CategoryAnalysis;