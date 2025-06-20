import { CheckCircle2, Clock, Package, Truck, XCircle } from "lucide-react";
import { OrderStatusBadgeProps } from "./OrderTableTypes";

const OrderStatusBadge = ({ status }: OrderStatusBadgeProps) => {
  const statusConfig = {
    pending: {
      label: "معلق",
      icon: Clock,
      color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/30",
      iconColor: "text-amber-500 dark:text-amber-400",
    },
    processing: {
      label: "قيد المعالجة",
      icon: Package,
      color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700/30",
      iconColor: "text-blue-500 dark:text-blue-400",
    },
    shipped: {
      label: "تم الشحن",
      icon: Truck,
      color: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700/30",
      iconColor: "text-indigo-500 dark:text-indigo-400",
    },
    delivered: {
      label: "تم التسليم",
      icon: CheckCircle2,
      color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700/30",
      iconColor: "text-green-500 dark:text-green-400",
    },
    cancelled: {
      label: "ملغي",
      icon: XCircle,
      color: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-700/30",
      iconColor: "text-rose-500 dark:text-rose-400",
    }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status,
    icon: Clock,
    color: "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700/30",
    iconColor: "text-gray-500 dark:text-gray-400",
  };

  const Icon = config.icon;

  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border ${config.color}`}
    >
      <Icon className={`h-3.5 w-3.5 ${config.iconColor}`} />
      <span className="text-xs font-medium">{config.label}</span>
    </div>
  );
};

export default OrderStatusBadge;
