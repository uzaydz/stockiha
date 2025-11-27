import { memo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Hash,
  User,
  Phone,
  DollarSign,
  Package,
  UserCheck,
  PhoneCall,
  Truck,
  MapPin,
  Wallet,
  MoreHorizontal,
  MapPinned
} from "lucide-react";

interface OrdersTableHeaderProps {
  visibleColumns: string[];
  allSelected: boolean;
  filteredOrdersLength: number;
  onSelectAll: (selected: boolean) => void;
}

const OrdersTableHeader = memo(({
  visibleColumns,
  allSelected,
  filteredOrdersLength,
  onSelectAll,
}: OrdersTableHeaderProps) => {
  return (
  <TableHeader className="sticky top-0 z-20 bg-card/95 backdrop-blur-lg border-b border-border/40 shadow-sm">
      <TableRow className="hover:bg-transparent">
        {visibleColumns.includes("checkbox") && (
          <TableHead className="w-[50px] min-w-[50px] py-3.5 px-3 text-center">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onSelectAll}
              disabled={filteredOrdersLength === 0}
              aria-label="تحديد كل الطلبات"
              className="border-2 border-border"
            />
          </TableHead>
        )}

        {visibleColumns.includes("expand") && (
          <TableHead className="w-[45px] min-w-[45px] py-3.5 px-2"></TableHead>
        )}

        {visibleColumns.includes("id") && (
          <TableHead className="w-[140px] min-w-[140px] font-semibold text-foreground/90 py-3.5 px-4 text-sm">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span>رقم الطلب</span>
            </div>
          </TableHead>
        )}

        {visibleColumns.includes("customer_name") && (
          <TableHead className="w-[180px] min-w-[180px] font-semibold text-foreground/90 py-3.5 px-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>اسم العميل</span>
            </div>
          </TableHead>
        )}

        {visibleColumns.includes("customer_contact") && (
          <TableHead className="w-[200px] min-w-[200px] font-semibold text-foreground/90 py-3.5 px-4 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>بيانات الاتصال</span>
            </div>
          </TableHead>
        )}

        {visibleColumns.includes("total") && (
          <TableHead className="w-[140px] min-w-[140px] font-semibold text-foreground/90 py-3.5 px-4 text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>المبلغ</span>
            </div>
          </TableHead>
        )}

        {visibleColumns.includes("status") && (
          <TableHead className="w-[160px] min-w-[160px] font-semibold text-foreground/90 py-3.5 px-4 text-sm">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>الحالة</span>
            </div>
          </TableHead>
        )}

        {visibleColumns.includes("assignee") && (
          <TableHead className="w-[150px] min-w-[150px] font-semibold text-foreground/90 py-3.5 px-4 text-sm">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <span>الموظف</span>
            </div>
          </TableHead>
        )}

        {visibleColumns.includes("call_confirmation") && (
          <TableHead className="w-[170px] min-w-[170px] font-semibold text-foreground/90 py-3.5 px-4 text-sm">
            <div className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-muted-foreground" />
              <span>التأكيد</span>
            </div>
          </TableHead>
        )}

        {visibleColumns.includes("shipping_provider") && (
          <TableHead className="w-[200px] min-w-[200px] font-semibold text-foreground/90 py-3.5 px-4 text-sm">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span>الشحن</span>
            </div>
          </TableHead>
        )}

        {visibleColumns.includes("tracking") && (
          <TableHead className="w-[160px] min-w-[160px] font-semibold text-foreground/90 py-3.5 px-4 text-sm">
            <div className="flex items-center gap-2">
              <MapPinned className="h-4 w-4 text-muted-foreground" />
              <span>التتبع</span>
            </div>
          </TableHead>
        )}

        {visibleColumns.includes("delivery_type") && (
          <TableHead className="w-[140px] min-w-[140px] font-semibold text-foreground/90 py-3.5 px-4 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>التوصيل</span>
            </div>
          </TableHead>
        )}

        {visibleColumns.includes("financial") && (
          <TableHead className="w-[160px] min-w-[160px] font-semibold text-foreground/90 py-3.5 px-4 text-sm">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span>المالية</span>
            </div>
          </TableHead>
        )}

        {visibleColumns.includes("actions") && (
          <TableHead className="w-[80px] min-w-[80px] text-center font-semibold py-3.5 px-3 text-foreground/90 text-sm">
            <div className="flex items-center justify-center gap-2">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </div>
          </TableHead>
        )}
      </TableRow>
    </TableHeader>
  );
});

OrdersTableHeader.displayName = "OrdersTableHeader";

export default OrdersTableHeader;
