/**
 * CartTransferButton - زر نقل السلة بين الأجهزة
 *
 * يعرض زراً لإرسال أو استقبال السلة
 * مع اكتشاف تلقائي لنوع الجهاز (هاتف/حاسوب)
 */

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Send,
  Download,
  Smartphone,
  Monitor,
  Share2,
  QrCode,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SendCartDialog } from './SendCartDialog';
import { ReceiveCartDialog } from './ReceiveCartDialog';
import { CartTransferItem } from '@/services/P2PCartService';

interface CartTransferButtonProps {
  cartItems: any[];
  onReceiveCart: (items: CartTransferItem[], mode: 'add' | 'replace') => void;
  customerId?: string;
  customerName?: string;
  notes?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'icon';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  className?: string;
  showLabel?: boolean;
  disabled?: boolean;
}

export function CartTransferButton({
  cartItems,
  onReceiveCart,
  customerId,
  customerName,
  notes,
  variant = 'outline',
  size = 'default',
  className,
  showLabel = true,
  disabled = false,
}: CartTransferButtonProps) {
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);

  // اكتشاف نوع الجهاز
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768;
  }, []);

  // عدد المنتجات في السلة
  const itemsCount = cartItems.length;

  // إذا كان الحجم icon فقط نعرض زر واحد
  if (variant === 'icon' || size === 'icon') {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn('relative', className)}
                    disabled={disabled}
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setSendDialogOpen(true)}
                    disabled={itemsCount === 0}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>إرسال السلة</span>
                    {itemsCount > 0 && (
                      <span className="text-xs text-muted-foreground mr-auto">
                        ({itemsCount})
                      </span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setReceiveDialogOpen(true)}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>استقبال سلة</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent>
              <p>نقل السلة</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <SendCartDialog
          open={sendDialogOpen}
          onClose={() => setSendDialogOpen(false)}
          cartItems={cartItems}
          customerId={customerId}
          customerName={customerName}
          notes={notes}
        />

        <ReceiveCartDialog
          open={receiveDialogOpen}
          onClose={() => setReceiveDialogOpen(false)}
          onCartReceived={onReceiveCart}
          currentCartItemsCount={itemsCount}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={cn('gap-2', className)}
            disabled={disabled}
          >
            {isMobile ? (
              <Send className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {showLabel && (
              <>
                <span>{isMobile ? 'إرسال' : 'استقبال'}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* إرسال السلة */}
          <DropdownMenuItem
            onClick={() => setSendDialogOpen(true)}
            disabled={itemsCount === 0}
            className="gap-3 py-2.5"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <Send className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">إرسال السلة</span>
              <span className="text-xs text-muted-foreground">
                {itemsCount > 0
                  ? `${itemsCount} منتج للإرسال`
                  : 'السلة فارغة'}
              </span>
            </div>
            <Smartphone className="h-4 w-4 text-muted-foreground mr-auto" />
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* استقبال سلة */}
          <DropdownMenuItem
            onClick={() => setReceiveDialogOpen(true)}
            className="gap-3 py-2.5"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/10">
              <Download className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">استقبال سلة</span>
              <span className="text-xs text-muted-foreground">
                من جهاز آخر
              </span>
            </div>
            <Monitor className="h-4 w-4 text-muted-foreground mr-auto" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* نوافذ الحوار */}
      <SendCartDialog
        open={sendDialogOpen}
        onClose={() => setSendDialogOpen(false)}
        cartItems={cartItems}
        customerId={customerId}
        customerName={customerName}
        notes={notes}
      />

      <ReceiveCartDialog
        open={receiveDialogOpen}
        onClose={() => setReceiveDialogOpen(false)}
        onCartReceived={onReceiveCart}
        currentCartItemsCount={itemsCount}
      />
    </>
  );
}

export default CartTransferButton;
