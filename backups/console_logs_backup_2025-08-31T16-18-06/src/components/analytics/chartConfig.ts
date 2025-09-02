import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler
} from 'chart.js';
import { formatCurrency } from './utils';

// تسجيل مكونات Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler
);

// ألوان متناسقة للمخططات مع دعم الدارك مود
export const chartColors = {
  primary: {
    background: 'rgba(16, 185, 129, 0.8)',
    border: 'rgba(16, 185, 129, 1)',
    gradient: ['rgba(16, 185, 129, 0.9)', 'rgba(16, 185, 129, 0.1)']
  },
  secondary: {
    background: 'rgba(59, 130, 246, 0.8)',
    border: 'rgba(59, 130, 246, 1)',
    gradient: ['rgba(59, 130, 246, 0.9)', 'rgba(59, 130, 246, 0.1)']
  },
  warning: {
    background: 'rgba(245, 158, 11, 0.8)',
    border: 'rgba(245, 158, 11, 1)',
    gradient: ['rgba(245, 158, 11, 0.9)', 'rgba(245, 158, 11, 0.1)']
  },
  danger: {
    background: 'rgba(239, 68, 68, 0.8)',
    border: 'rgba(239, 68, 68, 1)',
    gradient: ['rgba(239, 68, 68, 0.9)', 'rgba(239, 68, 68, 0.1)']
  },
  success: {
    background: 'rgba(34, 197, 94, 0.8)',
    border: 'rgba(34, 197, 94, 1)',
    gradient: ['rgba(34, 197, 94, 0.9)', 'rgba(34, 197, 94, 0.1)']
  },
  purple: {
    background: 'rgba(139, 92, 246, 0.8)',
    border: 'rgba(139, 92, 246, 1)',
    gradient: ['rgba(139, 92, 246, 0.9)', 'rgba(139, 92, 246, 0.1)']
  },
  teal: {
    background: 'rgba(6, 182, 212, 0.8)',
    border: 'rgba(6, 182, 212, 1)',
    gradient: ['rgba(6, 182, 212, 0.9)', 'rgba(6, 182, 212, 0.1)']
  },
  orange: {
    background: 'rgba(249, 115, 22, 0.8)',
    border: 'rgba(249, 115, 22, 1)',
    gradient: ['rgba(249, 115, 22, 0.9)', 'rgba(249, 115, 22, 0.1)']
  }
};

// مصفوفة ألوان للمخططات المتعددة
export const colorPalette = [
  chartColors.primary,
  chartColors.secondary,
  chartColors.warning,
  chartColors.success,
  chartColors.purple,
  chartColors.teal,
  chartColors.orange,
  chartColors.danger
];

// إعدادات افتراضية للمخططات مع دعم الدارك مود
export const getDefaultChartOptions = (isDarkMode: boolean = false) => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: {
      top: 20,
      bottom: 20,
      left: 10,
      right: 10
    }
  },
  plugins: {
    legend: {
      position: 'bottom' as const,
      rtl: true,
      textDirection: 'rtl' as const,
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 20,
        font: {
          family: 'Tajawal, Arial, sans-serif',
          size: 12,
          weight: 'normal' as const
        },
        color: isDarkMode ? '#D1D5DB' : '#374151',
        generateLabels: (chart: any) => {
          const original = ChartJS.defaults.plugins.legend.labels.generateLabels;
          const labels = original.call(chart, chart);
          
          // تخصيص تسميات Legend للعربية
          labels.forEach((label: any) => {
            label.textAlign = 'right';
            label.fontColor = isDarkMode ? '#D1D5DB' : '#374151';
          });
          
          return labels;
        }
      }
    },
    tooltip: {
      rtl: true,
      textDirection: 'rtl' as const,
      backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      titleColor: isDarkMode ? '#F9FAFB' : '#1F2937',
      bodyColor: isDarkMode ? '#E5E7EB' : '#374151',
      borderColor: isDarkMode ? '#374151' : '#E5E7EB',
      borderWidth: 1,
      cornerRadius: 12,
      displayColors: true,
      padding: 16,
      titleFont: {
        family: 'Tajawal, Arial, sans-serif',
        size: 14,
        weight: 'bold' as const
      },
      bodyFont: {
        family: 'Tajawal, Arial, sans-serif',
        size: 12,
        weight: 'normal' as const
      },
      callbacks: {
        title: (tooltipItems: any[]) => {
          return tooltipItems[0].label;
        },
        label: (context: any) => {
          const label = context.dataset.label || '';
          const value = formatCurrency(context.parsed.y || context.parsed);
          return `${label}: ${value}`;
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        display: true,
        color: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.5)',
        lineWidth: 1
      },
      ticks: {
        font: {
          family: 'Tajawal, Arial, sans-serif',
          size: 11,
          weight: 'normal' as const
        },
        color: isDarkMode ? '#9CA3AF' : '#6B7280',
        maxRotation: 45,
        minRotation: 0
      },
      title: {
        display: false
      }
    },
    y: {
      grid: {
        display: true,
        color: isDarkMode ? 'rgba(75, 85, 99, 0.2)' : 'rgba(229, 231, 235, 0.3)',
        lineWidth: 1
      },
      ticks: {
        font: {
          family: 'Tajawal, Arial, sans-serif',
          size: 11,
          weight: 'normal' as const
        },
        color: isDarkMode ? '#9CA3AF' : '#6B7280',
        callback: function(value: any) {
          // تنسيق الأرقام الكبيرة
          if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'م';
          }
          if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'ك';
          }
          return value.toLocaleString('ar-DZ');
        }
      },
      title: {
        display: false
      }
    }
  },
  animation: {
    duration: 1500,
    easing: 'easeInOutQuart' as const
  },
  interaction: {
    intersect: false,
    mode: 'index' as const
  }
});

// إعدادات خاصة للرسم الدائري مع دعم الدارك مود
export const getPieChartOptions = (isDarkMode: boolean = false) => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20
    }
  },
  plugins: {
    legend: {
      position: 'bottom' as const,
      rtl: true,
      textDirection: 'rtl' as const,
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 15,
        font: {
          family: 'Tajawal, Arial, sans-serif',
          size: 12,
          weight: 'normal' as const
        },
        color: isDarkMode ? '#D1D5DB' : '#374151',
        generateLabels: (chart: any) => {
          const data = chart.data;
          if (data.labels.length && data.datasets.length) {
            const dataset = data.datasets[0];
            const total = dataset.data.reduce((sum: number, value: number) => sum + value, 0);
            
            return data.labels.map((label: string, index: number) => {
              const value = dataset.data[index];
              const percentage = ((value / total) * 100).toFixed(1);
              
              return {
                text: `${label} (${percentage}%)`,
                fillStyle: dataset.backgroundColor[index],
                strokeStyle: dataset.borderColor[index],
                lineWidth: dataset.borderWidth,
                hidden: false,
                index: index,
                fontColor: isDarkMode ? '#D1D5DB' : '#374151'
              };
            });
          }
          return [];
        }
      }
    },
    tooltip: {
      rtl: true,
      textDirection: 'rtl' as const,
      backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      titleColor: isDarkMode ? '#F9FAFB' : '#1F2937',
      bodyColor: isDarkMode ? '#E5E7EB' : '#374151',
      borderColor: isDarkMode ? '#374151' : '#E5E7EB',
      borderWidth: 1,
      cornerRadius: 12,
      displayColors: true,
      padding: 16,
      titleFont: {
        family: 'Tajawal, Arial, sans-serif',
        size: 14,
        weight: 'bold' as const
      },
      bodyFont: {
        family: 'Tajawal, Arial, sans-serif',
        size: 12,
        weight: 'normal' as const
      },
      callbacks: {
        title: (tooltipItems: any[]) => {
          return tooltipItems[0].label;
        },
        label: (context: any) => {
          const label = context.label || '';
          const value = formatCurrency(context.parsed);
          const dataset = context.dataset;
          const total = dataset.data.reduce((sum: number, val: number) => sum + val, 0);
          const percentage = ((context.parsed / total) * 100).toFixed(1);
          
          return [
            `${label}`,
            `القيمة: ${value}`,
            `النسبة: ${percentage}%`
          ];
        }
      }
    }
  },
  animation: {
    animateRotate: true,
    animateScale: true,
    duration: 2000,
    easing: 'easeInOutQuart' as const
  },
  elements: {
    arc: {
      borderWidth: 3,
      borderColor: isDarkMode ? '#111827' : '#ffffff',
      hoverBorderWidth: 4
    }
  }
});

// دالة لإنشاء تدرج لوني
export const createGradient = (ctx: CanvasRenderingContext2D, colors: string[]) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  return gradient;
};

// دالة لإنشاء تدرج دائري للرسم الدائري
export const createRadialGradient = (ctx: CanvasRenderingContext2D, colors: string[]) => {
  const gradient = ctx.createRadialGradient(150, 150, 0, 150, 150, 150);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  return gradient;
};
