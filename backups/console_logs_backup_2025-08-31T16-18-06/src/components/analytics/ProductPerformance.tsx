import React, { useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTheme } from '@/context/ThemeContext';

// تسجيل مكونات الرسم البياني
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Product {
  id: string;
  name: string;
  sales: number;
  profit: number;
  quantity: number;
}

interface ProductPerformanceProps {
  data: {
    topProducts: Product[];
  };
}

// نوع الفرز المستخدم
type SortType = 'sales' | 'profit' | 'quantity';

// @million-ignore
const ProductPerformance: React.FC<ProductPerformanceProps> = ({ data }) => {
  const { theme } = useTheme();
  const [sortBy, setSortBy] = useState<SortType>('sales');
  
  // ترتيب المنتجات حسب النوع المختار
  const sortedProducts = [...data.topProducts].sort((a, b) => b[sortBy] - a[sortBy]);
  
  // ألوان تتناسب مع الوضعين المظلم والفاتح
  const salesColor = theme === 'dark' ? 'rgba(59, 130, 246, 0.8)' : '#3b82f6';
  const profitColor = theme === 'dark' ? 'rgba(52, 211, 153, 0.8)' : '#10b981';
  const quantityColor = theme === 'dark' ? 'rgba(139, 92, 246, 0.8)' : '#8b5cf6';
  
  // بيانات الرسم البياني
  const chartData = {
    labels: sortedProducts.slice(0, 5).map(product => product.name),
    datasets: [
      {
        label: sortBy === 'sales' ? 'المبيعات' : sortBy === 'profit' ? 'الأرباح' : 'الكمية',
        data: sortedProducts.slice(0, 5).map(product => product[sortBy]),
        backgroundColor: sortBy === 'sales' 
          ? salesColor
          : sortBy === 'profit' 
            ? profitColor
            : quantityColor,
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
        callbacks: {
          label: function(context: any) {
            const value = context.raw;
            if (sortBy === 'sales' || sortBy === 'profit') {
              return `${sortBy === 'sales' ? 'المبيعات' : 'الأرباح'}: ${value} دج`;
            } else {
              return `الكمية: ${value} وحدة`;
            }
          }
        }
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          display: false,
        },
        ticks: {
          callback: function(value: any) {
            if (sortBy === 'sales' || sortBy === 'profit') {
              // تنسيق المبالغ المالية
              return value + ' دج';
            }
            // تنسيق الكميات
            return value;
          },
          font: {
            family: 'Tajawal, sans-serif',
          },
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#6b7280',
        },
      },
      y: {
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

  return (
    <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-foreground">
          أداء المنتجات
        </h3>
        <div className="flex bg-muted rounded-md p-1">
          <button
            onClick={() => setSortBy('sales')}
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              sortBy === 'sales' 
                ? 'bg-background text-primary shadow-sm' 
                : 'text-muted-foreground hover:bg-muted/80'
            }`}
          >
            المبيعات
          </button>
          <button
            onClick={() => setSortBy('profit')}
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              sortBy === 'profit' 
                ? 'bg-background text-primary shadow-sm' 
                : 'text-muted-foreground hover:bg-muted/80'
            }`}
          >
            الأرباح
          </button>
          <button
            onClick={() => setSortBy('quantity')}
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              sortBy === 'quantity' 
                ? 'bg-background text-primary shadow-sm' 
                : 'text-muted-foreground hover:bg-muted/80'
            }`}
          >
            الكمية
          </button>
        </div>
      </div>
      
      <div className="h-64">
        <Bar data={chartData} options={options as any} />
      </div>
      
      <div className="mt-6">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">تفاصيل أعلى المنتجات</h4>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  المنتج
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  المبيعات
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  الأرباح
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  الكمية
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {sortedProducts.slice(0, 5).map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-foreground">
                    {product.name}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">
                    {product.sales} دج
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">
                    {product.profit} دج
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">
                    {product.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductPerformance;
