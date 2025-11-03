import { memo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  <TableHeader className="sticky top-0 z-15 bg-gradient-to-r from-muted/40 to-muted/20 border-b border-border/50" style={{ contain: 'layout paint', contentVisibility: 'auto' as any }}>
      <TableRow className="hover:bg-transparent">
        {visibleColumns.includes("checkbox") && (
          <TableHead className="w-12 py-4 px-4">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onSelectAll}
              disabled={filteredOrdersLength === 0}
              aria-label="تحديد كل الطلبات"
              className="border-border/50"
            />
          </TableHead>
        )}
        
        {visibleColumns.includes("expand") && (
          <TableHead className="w-10 py-4"></TableHead>
        )}
        
        {visibleColumns.includes("id") && (
          <TableHead className="font-semibold text-foreground py-4 px-4 text-sm">رقم الطلب</TableHead>
        )}
        
        {visibleColumns.includes("customer_name") && (
          <TableHead className="font-semibold text-foreground py-4 px-4 text-sm">اسم العميل</TableHead>
        )}
        
        {visibleColumns.includes("customer_contact") && (
          <TableHead className="font-semibold text-foreground py-4 px-4 text-sm">بيانات الاتصال</TableHead>
        )}
        
        {visibleColumns.includes("total") && (
          <TableHead className="font-semibold text-foreground py-4 px-4 text-sm">إجمالي الطلب</TableHead>
        )}
        
        {visibleColumns.includes("status") && (
          <TableHead className="font-semibold text-foreground py-4 px-4 text-sm">حالة الطلب</TableHead>
        )}

        {/* عمود فريق التأكيد تم حذفه */}

        {visibleColumns.includes("assignee") && (
          <TableHead className="font-semibold text-foreground py-4 px-4 text-sm">الموظف المعين</TableHead>
        )}
        
        {visibleColumns.includes("call_confirmation") && (
          <TableHead className="font-semibold text-foreground py-4 px-4 text-sm">تأكيد المكالمة</TableHead>
        )}
        
        {visibleColumns.includes("shipping_provider") && (
          <TableHead className="font-semibold text-foreground py-4 px-4 text-sm">مزود الشحن</TableHead>
        )}
        
        {visibleColumns.includes("delivery_type") && (
          <TableHead className="font-semibold text-foreground py-4 px-4 text-sm">نوع التوصيل</TableHead>
        )}
        
        {visibleColumns.includes("financial") && (
          <TableHead className="font-semibold text-foreground py-4 px-4 text-sm">المبالغ المالية</TableHead>
        )}
        
        {visibleColumns.includes("actions") && (
          <TableHead className="text-right font-semibold w-16 py-4 px-4 text-foreground text-sm">الإجراءات</TableHead>
        )}
      </TableRow>
    </TableHeader>
  );
});

OrdersTableHeader.displayName = "OrdersTableHeader";

export default OrdersTableHeader;
