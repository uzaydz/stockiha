import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  ShoppingBag, 
  Store, 
  Smartphone, 
  Home, 
  Building, 
  Clock, 
  Truck,
  MapPin,
  ShoppingCart 
} from "lucide-react";
import { formatDate } from "@/lib/utils";

type OrderSourceBadgeProps = {
  source: string;
  deliveryType?: string;
  created_at?: string;
  shipping_option?: string;
};

const OrderSourceBadge = ({ 
  source, 
  deliveryType = "home", 
  created_at,
  shipping_option
}: OrderSourceBadgeProps) => {
  const sourceConfig = {
    web: {
      label: "الموقع",
      icon: Globe,
      className: "text-blue-500 dark:text-blue-400",
      bgClassName: "bg-blue-50 dark:bg-blue-950/30"
    },
    store: {
      label: "المتجر",
      icon: Store,
      className: "text-green-500 dark:text-green-400",
      bgClassName: "bg-green-50 dark:bg-green-950/30"
    },
    app: {
      label: "التطبيق",
      icon: Smartphone,
      className: "text-purple-500 dark:text-purple-400",
      bgClassName: "bg-purple-50 dark:bg-purple-950/30"
    },
    pos: {
      label: "نقطة البيع",
      icon: ShoppingBag,
      className: "text-amber-500 dark:text-amber-400",
      bgClassName: "bg-amber-50 dark:bg-amber-950/30"
    },
    landing: {
      label: "صفحة هبوط",
      icon: ShoppingCart,
      className: "text-indigo-500 dark:text-indigo-400",
      bgClassName: "bg-indigo-50 dark:bg-indigo-950/30"
    },
    landing_page: {
      label: "صفحة هبوط",
      icon: ShoppingCart,
      className: "text-indigo-500 dark:text-indigo-400",
      bgClassName: "bg-indigo-50 dark:bg-indigo-950/30"
    }
  };

  const deliveryConfig = {
    home: {
      label: "توصيل منزلي",
      icon: Home,
      className: "text-rose-500 dark:text-rose-400",
      bgClassName: "bg-rose-50 dark:bg-rose-950/30"
    },
    desk: {
      label: "استلام من المكتب",
      icon: Building,
      className: "text-cyan-500 dark:text-cyan-400",
      bgClassName: "bg-cyan-50 dark:bg-cyan-950/30"
    },
    office: {
      label: "استلام من المكتب",
      icon: Building,
      className: "text-cyan-500 dark:text-cyan-400",
      bgClassName: "bg-cyan-50 dark:bg-cyan-950/30"
    },
    pickup: {
      label: "استلام من المتجر",
      icon: MapPin,
      className: "text-yellow-500 dark:text-yellow-400",
      bgClassName: "bg-yellow-50 dark:bg-yellow-950/30"
    },
    delivery: {
      label: "توصيل",
      icon: Truck,
      className: "text-emerald-500 dark:text-emerald-400",
      bgClassName: "bg-emerald-50 dark:bg-emerald-950/30"
    }
  };

  const sourceInfo = sourceConfig[source as keyof typeof sourceConfig] || {
    label: source || "غير معروف",
    icon: Globe,
    className: "text-muted-foreground",
    bgClassName: "bg-gray-50 dark:bg-gray-800/30"
  };

  // استخدام shipping_option إذا كان متاحًا، وإلا استخدام deliveryType
  const actualDeliveryType = shipping_option || deliveryType;
  
  // التأكد من أن 'desk' و 'office' يظهران كـ 'استلام من المكتب'
  let deliveryTypeForDisplay = actualDeliveryType;
  if (deliveryTypeForDisplay === 'desk' || deliveryTypeForDisplay === 'office') {
    deliveryTypeForDisplay = 'desk'; // توحيد القيمة لاستخدام نفس التكوين
  }
  
  const deliveryInfo = deliveryConfig[deliveryTypeForDisplay as keyof typeof deliveryConfig] || {
    label: "توصيل",
    icon: Truck,
    className: "text-muted-foreground",
    bgClassName: "bg-gray-50 dark:bg-gray-800/30"
  };

  const SourceIcon = sourceInfo.icon;
  const DeliveryIcon = deliveryInfo.icon;

  // تنسيق التاريخ والوقت بالعربي مع أرقام عادية
  const formatArabicDate = (dateString: string): string => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  };
  
  // تنسيق وقت الطلب بالعربي
  const formatArabicTime = (dateString: string): string => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    // تنسيق الساعة بنظام 12 ساعة مع صباحاً/مساءً
    const period = hours >= 12 ? 'م' : 'ص';
    const hour12 = hours % 12 || 12;
    
    return `${hour12}:${minutes < 10 ? '0' + minutes : minutes} ${period}`;
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Badge 
          variant="outline" 
          className={`flex items-center space-x-1 rtl:space-x-reverse px-2 py-0.5 text-xs font-medium rounded-full border-transparent ${sourceInfo.bgClassName}`}
        >
          <SourceIcon className={`h-3 w-3 ml-1 ${sourceInfo.className}`} />
          <span>{sourceInfo.label}</span>
        </Badge>
        
        <Badge 
          variant="outline" 
          className={`flex items-center space-x-1 rtl:space-x-reverse px-2 py-0.5 text-xs font-medium rounded-full border-transparent ${deliveryInfo.bgClassName}`}
        >
          <DeliveryIcon className={`h-3 w-3 ml-1 ${deliveryInfo.className}`} />
          <span>{deliveryInfo.label}</span>
        </Badge>
      </div>
      
      {created_at && (
        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="h-3 w-3 ml-1" />
          <span>
            {formatArabicDate(created_at)} - {formatArabicTime(created_at)}
          </span>
        </div>
      )}
    </div>
  );
};

export default OrderSourceBadge; 