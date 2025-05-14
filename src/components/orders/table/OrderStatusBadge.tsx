import { CheckCircle2, Clock, Package, Truck, XCircle } from "lucide-react";
import { OrderStatusBadgeProps } from "./OrderTableTypes";

const OrderStatusBadge = ({ status }: OrderStatusBadgeProps) => {
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

  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status,
    icon: Clock,
    color: "bg-gray-100 text-gray-700 border-gray-200",
    iconColor: "text-gray-500",
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