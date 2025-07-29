import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ChevronDown, 
  Clock, 
  Package, 
  Truck, 
  CheckCircle2, 
  XCircle,
  Send,
  PackageCheck
} from "lucide-react";
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
  
  // تكوين الحالات - تم إضافة "تم الإرسال" و "تم الاستلام"
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
      label: "تم الإرسال",
      icon: Send,
      color: "bg-purple-100 text-purple-700 border-purple-200",
      iconColor: "text-purple-500",
    },
    delivered: {
      label: "تم الاستلام",
      icon: PackageCheck,
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
  
  // جميع الحالات المتاحة (إزالة القيود السابقة)
  const allStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  
  // الحالات المتاحة للتغيير - جميع الحالات ما عدا الحالة الحالية
  const availableStatuses = allStatuses.filter(status => status !== currentStatus);

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(orderId, newStatus);
    } catch (error) {
    } finally {
      setIsUpdating(false);
    }
  };

  const currentConfig = statusConfig[currentStatus as keyof typeof statusConfig] || {
    label: currentStatus,
    icon: Clock,
    color: "bg-gray-100 text-gray-700 border-gray-200",
    iconColor: "text-gray-500",
  };

  const CurrentIcon = currentConfig.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isUpdating}
          className={`h-8 gap-2 text-xs font-medium transition-colors ${currentConfig.color} hover:opacity-80`}
        >
          <CurrentIcon className={`h-3 w-3 ${currentConfig.iconColor}`} />
          {currentConfig.label}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        {availableStatuses.map((status) => {
          const config = statusConfig[status as keyof typeof statusConfig];
          const Icon = config.icon;
          
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => handleStatusChange(status)}
              className="gap-2 cursor-pointer"
            >
              <Icon className={`h-4 w-4 ${config.iconColor}`} />
              {config.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default OrderStatusDropdown;
