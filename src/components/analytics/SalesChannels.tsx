import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useTheme } from '@/context/ThemeContext';

// تسجيل مكونات الرسم البياني
ChartJS.register(ArcElement, Tooltip, Legend);

interface SalesChannelsProps {
  data: {
    salesByChannel: {
      pos: number;
      online: number;
    };
  };
}

const SalesChannels: React.FC<SalesChannelsProps> = ({ data }) => {
  const { theme } = useTheme();
  const { pos, online } = data.salesByChannel;
  const total = pos + online;
  
  // حساب النسب المئوية
  const posPercentage = ((pos / total) * 100).toFixed(1);
  const onlinePercentage = ((online / total) * 100).toFixed(1);

  // ألوان تتناسب مع الوضعين المظلم والفاتح
  const posColor = '#3b82f6'; // blue-500
  const onlineColor = '#8b5cf6'; // purple-500
  
  // بيانات الرسم البياني
  const chartData = {
    labels: ['نقطة البيع', 'المتجر الإلكتروني'],
    datasets: [
      {
        data: [pos, online],
        backgroundColor: [
          posColor, 
          onlineColor, 
        ],
        borderColor: [
          theme === 'dark' ? '#1A1F2C' : '#ffffff',
          theme === 'dark' ? '#1A1F2C' : '#ffffff',
        ],
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        align: 'center' as const,
        labels: {
          padding: 20,
          boxWidth: 12,
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(75, 85, 99, 0.8)', // Adjusted for dark/light mode
          font: {
            family: 'Tajawal, sans-serif',
            size: 13,
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
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} دج (${percentage}%)`;
          }
        }
      },
    },
  };

  return (
    <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-foreground mb-1">
          تحليل قنوات المبيعات
        </h3>
        <p className="text-sm text-muted-foreground">
          مقارنة المبيعات بين نقطة البيع والمتجر الإلكتروني
        </p>
      </div>
      
      <div className="h-64 relative">
        <Doughnut data={chartData} options={options as any} />
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-3xl font-bold text-foreground">
            {total} دج
          </span>
          <span className="text-sm text-muted-foreground">إجمالي المبيعات</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="text-center">
          <div className="flex justify-center items-center mb-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
            <span className="text-sm font-medium text-foreground">نقطة البيع</span>
          </div>
          <p className="text-lg font-bold text-foreground">{pos} دج</p>
          <p className="text-sm text-muted-foreground">{posPercentage}%</p>
        </div>
        
        <div className="text-center">
          <div className="flex justify-center items-center mb-2">
            <span className="w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
            <span className="text-sm font-medium text-foreground">المتجر الإلكتروني</span>
          </div>
          <p className="text-lg font-bold text-foreground">{online} دج</p>
          <p className="text-sm text-muted-foreground">{onlinePercentage}%</p>
        </div>
      </div>
    </div>
  );
};

export default SalesChannels; 