import { useState } from "react";
import { Clock, Package, Truck, Home, XCircle } from "lucide-react";
import './OrderStatusDropdown.css';

type OrderStatusDropdownProps = {
  currentStatus: string;
  orderId: string;
  onUpdateStatus: (orderId: string, newStatus: string) => Promise<void>;
  canCancel?: boolean;
};

const OrderStatusDropdown = ({
  currentStatus,
  orderId,
  onUpdateStatus,
  canCancel = true
}: OrderStatusDropdownProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  
  // تكوين الحالات المحسن - أبسط وأصغر
  const statusConfig = {
    pending: {
      label: "معلق",
      icon: Clock,
      color: "bg-amber-100 text-amber-800 border-amber-200",
      bgColor: "#fef3c7",
      textColor: "#92400e"
    },
    processing: {
      label: "قيد المعالجة",
      icon: Package,
      color: "bg-blue-100 text-blue-800 border-blue-200",
      bgColor: "#dbeafe",
      textColor: "#1d4ed8"
    },
    shipped: {
      label: "تم الإرسال",
      icon: Truck,
      color: "bg-purple-100 text-purple-800 border-purple-200",
      bgColor: "#e9d5ff",
      textColor: "#6b21a8"
    },
    delivered: {
      label: "تم الاستلام",
      icon: Home,
      color: "bg-green-100 text-green-800 border-green-200",
      bgColor: "#d1fae5",
      textColor: "#065f46"
    },
    cancelled: {
      label: "ملغي",
      icon: XCircle,
      color: "bg-red-100 text-red-800 border-red-200",
      bgColor: "#fee2e2",
      textColor: "#991b1b"
    }
  };
  
  // جميع الحالات المتاحة
  const allStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  
  // الحالات المتاحة للتغيير - جميع الحالات ما عدا الحالة الحالية
  const availableStatuses = allStatuses.filter(status => status !== currentStatus);

  const handleStatusChange = async (newStatus: string) => {
    requestAnimationFrame(async () => {
      setIsUpdating(true);
      try {
        await onUpdateStatus(orderId, newStatus);
      } catch (error) {
      } finally {
        setIsUpdating(false);
      }
    });
  };

  const currentConfig = statusConfig[currentStatus as keyof typeof statusConfig] || {
    label: currentStatus,
    icon: Clock,
    color: "bg-gray-100 text-gray-800 border-gray-200",
    bgColor: "#f3f4f6",
    textColor: "#374151"
  };

  return (
    <div className="order-status-dropdown-compact relative inline-block">
      <select
        value={currentStatus}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={isUpdating}
        className={`h-7 px-2 py-1 pr-6 text-xs font-medium border rounded-md cursor-pointer appearance-none focus:outline-none focus:ring-1 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ${currentConfig.color} hover:shadow-sm`}
        style={{
          minWidth: 100,
          contain: 'paint',
          willChange: 'auto',
          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 4px center',
          backgroundSize: '10px'
        }}
      >
        {/* الخيار الحالي */}
        <option value={currentStatus} disabled>
          {currentConfig.label}
        </option>

        {/* الخيارات المتاحة */}
        {availableStatuses.map((status) => {
          const config = statusConfig[status as keyof typeof statusConfig];
          return (
            <option
              key={status}
              value={status}
              style={{
                color: config.textColor,
                backgroundColor: config.bgColor,
                padding: '4px 8px'
              }}
            >
              {config.label}
            </option>
          );
        })}
      </select>
      
      {/* مؤشر التحميل الصغير */}
      {isUpdating && (
        <div className="absolute -top-1 -right-1">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
        </div>
      )}
    </div>
  );
};

export default OrderStatusDropdown;
