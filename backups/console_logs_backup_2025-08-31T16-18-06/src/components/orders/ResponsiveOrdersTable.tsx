import React, { memo } from "react";
import { cn } from "@/lib/utils";

import OrdersTable from "./table/OrdersTable";
import { type ExtendedOrdersTableProps } from "./table/OrderTableTypes";

// استيراد ملف CSS المخصص لتحسين الأداء
import "./orders-performance.css";

interface ResponsiveOrdersTableProps extends ExtendedOrdersTableProps {
  // تم إزالة forceViewMode و defaultMobileViewMode لأنهما لم يعودا مطلوبين
}

const ResponsiveOrdersTable = memo(({
  ...props
}: ResponsiveOrdersTableProps) => {
  return (
    <div className="relative">
      {/* عرض الجدول فقط */}
      <div className={cn("transition-none")}>
        <OrdersTable {...props} />
      </div>
    </div>
  );
});

ResponsiveOrdersTable.displayName = "ResponsiveOrdersTable";

export default ResponsiveOrdersTable;
