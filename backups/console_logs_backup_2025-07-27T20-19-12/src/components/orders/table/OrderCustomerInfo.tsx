import { memo } from "react";
import { User, Phone, Mail } from "lucide-react";
import { Order } from "./OrderTableTypes";
import { getProvinceName } from "@/utils/addressHelpers";
import { useMunicipalityResolver } from "./useMunicipalityResolver";

interface OrderCustomerInfoProps {
  order: Order;
}

const OrderCustomerInfo = memo(({ order }: OrderCustomerInfoProps) => {
  const customerName = order.customer?.name || order.form_data?.fullName || "غير محدد";
  const customerPhone = order.customer?.phone || order.form_data?.phone || "غير محدد";
  const customerEmail = order.customer?.email || order.form_data?.email || null;

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <User className="h-4 w-4" />
        معلومات العميل
      </h4>
      
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <div>
            <p className="text-sm font-medium text-foreground">{customerName}</p>
            <p className="text-xs text-muted-foreground">اسم العميل</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Phone className="h-4 w-4 text-green-500" />
          <div>
            <p className="text-sm font-medium text-foreground" dir="ltr">{customerPhone}</p>
            <p className="text-xs text-muted-foreground">رقم الهاتف</p>
          </div>
        </div>
        
        {customerEmail && (
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-purple-500" />
            <div>
              <p className="text-sm font-medium text-foreground" dir="ltr">{customerEmail}</p>
              <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
});

OrderCustomerInfo.displayName = "OrderCustomerInfo";

export default OrderCustomerInfo; 