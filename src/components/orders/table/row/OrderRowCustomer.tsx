import React, { memo } from "react";
import { TableCell } from "@/components/ui/table";
import { User, Phone } from "lucide-react";

interface OrderRowCustomerProps {
  customerName: string;
  customerContact?: string;
  showContact?: boolean;
}

const OrderRowCustomer: React.FC<OrderRowCustomerProps> = ({
  customerName,
  customerContact,
  showContact = false,
}) => {
  if (showContact && customerContact) {
    const isEmail = customerContact.includes('@');

    return (
      <TableCell className="w-[200px] min-w-[200px] py-3 px-4 select-text align-middle">
        <div className="flex items-center gap-2">
          {isEmail ? (
            <>
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-50 dark:bg-blue-900/20 flex-shrink-0">
                <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs text-foreground/80 select-text truncate" title={customerContact}>
                {customerContact}
              </span>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-green-50 dark:bg-green-900/20 flex-shrink-0">
                <Phone className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-xs text-foreground/80 font-mono select-text" dir="ltr" title={customerContact}>
                {customerContact}
              </span>
            </>
          )}
        </div>
      </TableCell>
    );
  }

  return (
    <TableCell className="w-[180px] min-w-[180px] py-3 px-4 select-text align-middle">
      <div className="font-medium text-xs text-foreground/90 select-text truncate" title={customerName}>
        {customerName}
      </div>
    </TableCell>
  );
};

export default memo(OrderRowCustomer);
