import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTheme } from '@/context/ThemeContext';

// تسجيل مكونات الرسم البياني
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ProfitAnalysisProps {
  data: {
    totalSales: number;
    totalProfit: number;
    profitMargin: number;
    pendingRevenue: number; // المبلغ المتبقي كدين (الدفعات الجزئية)
    salesByMonth: Record<string, number>;
  };
}

const ProfitAnalysis: React.FC<ProfitAnalysisProps> = ({ data }) => {
  const { theme } = useTheme();
  const months = Object.keys(data.salesByMonth);
  
  // حساب الأرباح التقديرية لكل شهر باستخدام هامش الربح
  const estimatedProfitByMonth = months.reduce((acc, month) => {
    acc[month] = data.salesByMonth[month] * (data.profitMargin / 100);
    return acc;
  }, {} as Record<string, number>);
  
  // ألوان تتناسب مع الوضعين المظلم والفاتح
  const salesColor = theme === 'dark'
    ? 'rgba(59, 130, 246, 0.8)' // ضبط لون المبيعات في الدارك مود
    : 'rgba(59, 130, 246, 0.7)'; // blue-500 with transparency
  
  const profitColor = theme === 'dark'
    ? 'rgba(52, 211, 153, 0.8)' // ضبط لون الأرباح في الدارك مود
    : 'rgba(16, 185, 129, 0.7)'; // emerald-500 with transparency
    
  const pendingColor = theme === 'dark'
    ? 'rgba(245, 158, 11, 0.8)' // ضبط لون المبالغ المستحقة في الدارك مود
    : 'rgba(245, 158, 11, 0.7)'; // amber-500 with transparency
  
  // حساب الإيرادات الفعلية (بعد خصم الديون)
  const actualRevenue = data.totalSales - data.pendingRevenue;
  
  // بيانات الرسم البياني
  const chartData = {
    labels: months,
    datasets: [
      {
        label: 'المبيعات',
        data: months.map(month => data.salesByMonth[month]),
        backgroundColor: salesColor,
        borderRadius: 4,
      },
      {
        label: 'الأرباح',
        data: months.map(month => estimatedProfitByMonth[month]),
        backgroundColor: profitColor,
        borderRadius: 4,
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: 'Tajawal, sans-serif',
          },
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#6b7280',
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          borderDash: [2, 4],
          color: theme === 'dark' ? 'rgba(75, 85, 99, 0.2)' : '#e5e7eb',
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
    },
  };

  // حساب نسبة الأرباح
  const profitPercentage = (data.totalProfit / actualRevenue) * 100;
  // حساب نسبة التكلفة
  const costPercentage = 100 - profitPercentage;
  // حساب نسبة الديون من إجمالي المبيعات
  const pendingPercentage = (data.pendingRevenue / data.totalSales) * 100;
  // حساب نسبة المبالغ المستلمة من إجمالي المبيعات
  const receivedPercentage = 100 - pendingPercentage;

  return (
    <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-foreground mb-1">
          تحليل الأرباح
        </h3>
        <p className="text-sm text-muted-foreground">
          مقارنة المبيعات والأرباح عبر الزمن
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className={`${theme === 'dark' ? 'bg-primary/10' : 'bg-blue-50'} p-4 rounded-lg`}>
          <p className={`text-sm ${theme === 'dark' ? 'text-primary' : 'text-blue-700'} mb-1`}>إجمالي المبيعات</p>
          <p className={`text-xl font-bold ${theme === 'dark' ? 'text-primary' : 'text-blue-900'}`}>{data.totalSales.toFixed(2)} دج</p>
        </div>
        
        <div className={`${theme === 'dark' ? 'bg-amber-900/20' : 'bg-amber-50'} p-4 rounded-lg`}>
          <p className={`text-sm ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'} mb-1`}>المبالغ المستحقة</p>
          <p className={`text-xl font-bold ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>{data.pendingRevenue.toFixed(2)} دج</p>
        </div>
        
        <div className={`${theme === 'dark' ? 'bg-emerald-900/20' : 'bg-emerald-50'} p-4 rounded-lg`}>
          <p className={`text-sm ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'} mb-1`}>إجمالي الأرباح</p>
          <p className={`text-xl font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-900'}`}>{data.totalProfit.toFixed(2)} دج</p>
        </div>
        
        <div className={`${theme === 'dark' ? 'bg-muted/40' : 'bg-gray-50'} p-4 rounded-lg`}>
          <p className={`text-sm ${theme === 'dark' ? 'text-foreground/80' : 'text-gray-700'} mb-1`}>هامش الربح</p>
          <p className="text-xl font-bold text-foreground">{data.profitMargin.toFixed(1)}%</p>
        </div>
      </div>
      
      <div className="h-64 mb-6">
        <Bar data={chartData} options={options as any} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">توزيع التكاليف والأرباح</h4>
          <div className={`w-full ${theme === 'dark' ? 'bg-muted' : 'bg-gray-200'} rounded-full h-4 mb-1`}>
            <div 
              className={`${theme === 'dark' ? 'bg-emerald-600' : 'bg-emerald-500'} h-4 rounded-l-full`} 
              style={{ width: `${profitPercentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>الأرباح ({profitPercentage.toFixed(1)}%)</span>
            <span>التكلفة ({costPercentage.toFixed(1)}%)</span>
          </div>
        </div>
        
        {data.pendingRevenue > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">توزيع المبيعات (مستلم/مستحق)</h4>
            <div className={`w-full ${theme === 'dark' ? 'bg-muted' : 'bg-gray-200'} rounded-full h-4 mb-1`}>
              <div 
                className={`${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} h-4 rounded-l-full`} 
                style={{ width: `${receivedPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>مستلم ({receivedPercentage.toFixed(1)}%)</span>
              <span>مستحق ({pendingPercentage.toFixed(1)}%)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfitAnalysis;
