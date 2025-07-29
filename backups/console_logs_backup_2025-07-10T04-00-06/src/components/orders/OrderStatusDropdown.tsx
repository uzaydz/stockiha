import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Package, Truck, XCircle, ChevronDown, Loader2 } from "lucide-react";

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
  
  // تكوين الحالات
  const statusConfig = {
    pending: {
      label: "معلق",
      icon: Clock,
      color: "bg-amber-100 text-amber-700 border-amber-200",
      iconColor: "text-amber-500",
    },
    processing: {
      label: "قيد المعالجة",
      icon: Package,
      color: "bg-blue-100 text-blue-700 border-blue-200",
      iconColor: "text-blue-500",
    },
    shipped: {
      label: "تم الشحن",
      icon: Truck,
      color: "bg-indigo-100 text-indigo-700 border-indigo-200",
      iconColor: "text-indigo-500",
    },
    delivered: {
      label: "تم التسليم",
      icon: CheckCircle2,
      color: "bg-green-100 text-green-700 border-green-200",
      iconColor: "text-green-500",
    },
    cancelled: {
      label: "ملغي",
      icon: XCircle,
      color: "bg-rose-100 text-rose-700 border-rose-200",
      iconColor: "text-rose-500",
    }
  };
  
  // الحالات المتاحة للتغيير (مسار تقدم الطلب)
  const statusFlow = ['pending', 'processing', 'shipped', 'delivered'];
  
  // استبعاد الحالة الحالية وإضافة حالة الإلغاء إذا كان مسموحًا
  const availableStatuses = statusFlow
    .filter(status => {
      // السماح فقط بالحالة التالية في المسار أو أي حالة سابقة
      const currentIndex = statusFlow.indexOf(currentStatus);
      const statusIndex = statusFlow.indexOf(status);
      
      return (
        status !== currentStatus && 
        (statusIndex === currentIndex + 1 || statusIndex < currentIndex)
      );
    })
    .concat(canCancel && currentStatus !== 'cancelled' && currentStatus !== 'delivered' ? ['cancelled'] : []);
  
  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(orderId, newStatus);
    } catch (error) {
    } finally {
      setIsUpdating(false);
    }
  };
  
  // الحصول على تكوين الحالة الحالية
  const currentConfig = statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig.pending;
  const CurrentIcon = currentConfig.icon;
  
  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={isUpdating || availableStatuses.length === 0}
          className={`h-7 px-2.5 py-0.5 ${currentConfig.color} border hover:opacity-90 transition-all rounded-full`}
        >
          {isUpdating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" />
          ) : (
            <CurrentIcon className={`h-3.5 w-3.5 ${currentConfig.iconColor} ml-1.5`} />
          )}
          <span className="text-xs font-medium">{currentConfig.label}</span>
          {availableStatuses.length > 0 && (
            <ChevronDown className="h-3.5 w-3.5 ml-0.5 opacity-70" />
          )}
        </Button>
      </DropdownMenuTrigger>
      
      {availableStatuses.length > 0 && (
        <DropdownMenuContent
          align="end"
          alignOffset={0} 
          className="min-w-[130px] p-1 rounded-lg border shadow-lg"
        >
          {availableStatuses.map((status) => {
            const config = statusConfig[status as keyof typeof statusConfig];
            const StatusIcon = config.icon;
            
            return (
              <DropdownMenuItem 
                key={status}
                onClick={() => handleStatusChange(status)}
                disabled={isUpdating}
                className={`
                  cursor-pointer my-0.5 flex items-center gap-1.5 p-1.5 rounded-md
                  text-xs font-medium ${status === 'cancelled' ? 'text-rose-600 hover:bg-rose-50' : 'hover:bg-muted'}
                `}
              >
                <StatusIcon className={`h-3.5 w-3.5 ${config.iconColor}`} />
                <span>{config.label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
};

export default OrderStatusDropdown;
