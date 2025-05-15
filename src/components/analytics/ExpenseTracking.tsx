import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { useTheme } from '@/context/ThemeContext';

// تسجيل مكونات الرسم البياني
ChartJS.register(ArcElement, Tooltip, Legend);

interface ExpenseTrackingProps {
  data: {
    totalSales: number;
    totalProfit: number;
    expenses: {
      total: number;
      categories: Record<string, number>;
    };
  };
}

const ExpenseTracking: React.FC<ExpenseTrackingProps> = ({ data }) => {
  const { theme } = useTheme();
  const { expenses } = data;
  
  // إضافة تتبع للبيانات
  
  
  // إذا كانت المصروفات فارغة، استخدم بيانات توضيحية
  const expenseCategories = Object.keys(expenses.categories);
  const expenseValues = Object.values(expenses.categories);
  
  // استخدام بيانات افتراضية إذا كانت المصروفات فارغة
  if (expenseCategories.length === 0) {
    
    expenses.categories = {
      'الرواتب': 10000,
      'الإيجار': 5000,
      'المشتريات': 7000,
      'التسويق': 3000,
      'أخرى': 2000
    };
    expenses.total = 27000;
  }
  
  // ألوان لفئات المصروفات مناسبة للوضعين المظلم والفاتح
  const categoryColors = theme === 'dark' 
    ? [
        'rgba(244, 63, 94, 0.8)', // rose adjusted for dark
        'rgba(236, 72, 153, 0.8)', // pink adjusted for dark
        'rgba(217, 70, 239, 0.8)', // fuchsia adjusted for dark
        'rgba(168, 85, 247, 0.8)', // purple adjusted for dark
        'rgba(139, 92, 246, 0.8)', // violet adjusted for dark
        'rgba(99, 102, 241, 0.8)', // indigo adjusted for dark
      ]
    : [
        '#f43f5e', // rose-500
        '#ec4899', // pink-500
        '#d946ef', // fuchsia-500
        '#a855f7', // purple-500
        '#8b5cf6', // violet-500
        '#6366f1', // indigo-500
      ];
  
  // إعداد بيانات الرسم البياني
  const chartData = {
    labels: expenseCategories,
    datasets: [
      {
        data: expenseValues,
        backgroundColor: categoryColors.slice(0, expenseCategories.length),
        borderColor: Array(expenseCategories.length).fill(theme === 'dark' ? '#1A1F2C' : '#ffffff'),
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
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
            const label = context.label || '';
            const value = context.raw || 0;
            const percentage = ((value / expenses.total) * 100).toFixed(1);
            return `${label}: ${value} دج (${percentage}%)`;
          }
        }
      },
    },
  };

  // حساب المؤشرات المالية
  const revenueAfterExpenses = data.totalSales - expenses.total;
  const netProfit = data.totalProfit - expenses.total;
  const netProfitMargin = (netProfit / data.totalSales) * 100;
  
  return (
    <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-foreground mb-1">
          تحليل المصروفات
        </h3>
        <p className="text-sm text-muted-foreground">
          توزيع المصروفات حسب الفئات وتأثيرها على الأرباح
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className={`${theme === 'dark' ? 'bg-muted/40' : 'bg-gray-50'} p-3 rounded-lg`}>
          <p className={`text-xs ${theme === 'dark' ? 'text-foreground/80' : 'text-gray-700'} mb-1`}>إجمالي المصروفات</p>
          <p className="text-lg font-bold text-foreground">{expenses.total} دج</p>
        </div>
        
        <div className={`${theme === 'dark' ? 'bg-primary/10' : 'bg-blue-50'} p-3 rounded-lg`}>
          <p className={`text-xs ${theme === 'dark' ? 'text-primary' : 'text-blue-700'} mb-1`}>الإيرادات بعد المصروفات</p>
          <p className={`text-lg font-bold ${theme === 'dark' ? 'text-primary' : 'text-blue-900'}`}>{revenueAfterExpenses} دج</p>
        </div>
        
        <div className={`p-3 rounded-lg ${
          netProfit >= 0 
            ? theme === 'dark' ? 'bg-emerald-900/20' : 'bg-emerald-50'
            : theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50'
        }`}>
          <p className={`text-xs mb-1 ${
            netProfit >= 0 
              ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
              : theme === 'dark' ? 'text-red-400' : 'text-red-700'
          }`}>
            صافي الربح
          </p>
          <p className={`text-lg font-bold ${
            netProfit >= 0 
              ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-900'
              : theme === 'dark' ? 'text-red-400' : 'text-red-900'
          }`}>
            {netProfit} دج ({netProfitMargin.toFixed(1)}%)
          </p>
        </div>
      </div>
      
      <div className="h-56 mb-4">
        <Pie data={chartData} options={options as any} />
      </div>
      
      <div className="mt-6">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">تفاصيل المصروفات</h4>
        
        <div className="space-y-3">
          {expenseCategories.map((category, index) => {
            const amount = expenses.categories[category];
            const percentage = ((amount / expenses.total) * 100).toFixed(1);
            
            return (
              <div key={category} className="flex items-center">
                <span 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: categoryColors[index % categoryColors.length] }}
                ></span>
                <span className="text-sm font-medium text-foreground flex-grow">{category}</span>
                <span className="text-sm text-muted-foreground ml-2">{amount} دج</span>
                <span className="text-xs text-muted-foreground w-16 text-left">{percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ExpenseTracking; 