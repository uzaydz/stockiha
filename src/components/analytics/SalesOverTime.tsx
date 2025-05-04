import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useTheme } from '@/context/ThemeContext';

// تسجيل مكونات الرسم البياني
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement
);

interface SalesOverTimeProps {
  data: {
    salesByMonth: Record<string, number>;
  };
  period: string;
}

const SalesOverTime: React.FC<SalesOverTimeProps> = ({ data, period }) => {
  const { theme } = useTheme();
  
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

  // بيانات الرسم البياني
  const labels = Object.keys(data.salesByMonth);
  const salesData = Object.values(data.salesByMonth);

  // ألوان الرسم البياني
  const lineColor = theme === 'dark' ? 'rgba(59, 130, 246, 0.8)' : '#3b82f6';
  const areaColor = theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)';
  const pointColor = theme === 'dark' ? 'rgba(59, 130, 246, 0.8)' : '#3b82f6';

  const chartData = {
    labels,
    datasets: [
      {
        label: 'المبيعات',
        data: salesData,
        borderColor: lineColor,
        backgroundColor: areaColor,
        pointBackgroundColor: pointColor,
        pointBorderColor: theme === 'dark' ? '#1A1F2C' : '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
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
        caretSize: 6,
        callbacks: {
          label: function(context: any) {
            return `المبيعات: ${context.parsed.y} دج`;
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

  return (
    <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-foreground mb-1">
          تحليل المبيعات عبر الزمن
        </h3>
        <p className="text-sm text-muted-foreground">
          تطور المبيعات خلال {getPeriodText()}
        </p>
      </div>
      <div className="h-80">
        <Line data={chartData} options={options as any} />
      </div>
    </div>
  );
};

export default SalesOverTime; 