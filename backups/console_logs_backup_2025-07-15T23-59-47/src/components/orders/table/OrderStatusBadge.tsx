import { CheckCircle2, Clock, Package, Send, XCircle, PackageCheck } from "lucide-react";
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
      label: "تم الإرسال",
      icon: Send,
      color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-700/30",
      iconColor: "text-purple-500 dark:text-purple-400",
    },
    delivered: {
      label: "تم الاستلام",
      icon: PackageCheck,
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
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
      <Icon className={`h-3 w-3 ${config.iconColor}`} />
      {config.label}
    </div>
  );
};

export default OrderStatusBadge;
