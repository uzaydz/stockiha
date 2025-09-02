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
      <TableCell className="py-4 px-4 select-text" style={{ contain: 'layout', minWidth: '180px', minHeight: '32px' }}>
        <div className="flex items-center gap-2">
          {isEmail ? (
            <>
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/20">
                <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm text-foreground select-text" title={customerContact}>
                {customerContact}
              </span>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/20">
                <Phone className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm text-foreground font-mono select-text" dir="ltr" title={customerContact}>
                {customerContact}
              </span>
            </>
          )}
        </div>
      </TableCell>
    );
  }

  return (
    <TableCell className="py-4 px-4 select-text" style={{ contain: 'layout', minWidth: '180px', minHeight: '32px' }}>
      <div className="font-medium text-foreground select-text">{customerName}</div>
    </TableCell>
  );
};

export default memo(OrderRowCustomer);
