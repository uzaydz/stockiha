import React, { memo, useCallback } from "react";
import { TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  TooltipProvider, 
  Tooltip, 
  TooltipTrigger, 
  TooltipContent 
} from "@/components/ui/tooltip";
import { Copy, User, Phone } from "lucide-react";
import { toast } from "sonner";

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
  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`تم نسخ ${label} بنجاح`);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success(`تم نسخ ${label} بنجاح`);
    }
  }, []);

  if (showContact && customerContact) {
    const isEmail = customerContact.includes('@');
    
    return (
      <TableCell className="py-4 px-4 select-text" style={{ contain: 'layout' }}>
        <div className="flex items-center gap-2 group">
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
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 invisible group-hover:visible transform translate-x-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(customerContact, isEmail ? 'البريد الإلكتروني' : 'رقم الهاتف');
                  }}
                  aria-label={isEmail ? 'نسخ البريد الإلكتروني' : 'نسخ رقم الهاتف'}
                  title={isEmail ? 'نسخ البريد الإلكتروني' : 'نسخ رقم الهاتف'}
                  style={{ willChange: 'transform' }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <span>{isEmail ? 'نسخ البريد الإلكتروني' : 'نسخ رقم الهاتف'}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>
    );
  }

  return (
    <TableCell className="py-4 px-4 select-text" style={{ contain: 'layout' }}>
      <div className="font-medium text-foreground select-text">{customerName}</div>
    </TableCell>
  );
};

export default memo(OrderRowCustomer);
