/**
 * 🧑‍💼 CustomerSaleDialog - نافذة اختيار العميل ونوع البيع
 * ═══════════════════════════════════════════════════════════════════════════
 * المنطق الجديد:
 * - إذا السعر المعدل = السعر الأصلي → بيع عادي فقط
 * - إذا السعر المعدل < السعر الأصلي → يمكن اختيار (تخفيض أو مديونية)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  User,
  UserPlus,
  Search,
  Check,
  ShoppingCart,
  Percent,
  CreditCard,
  X,
  Phone
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type SaleMode = 'normal' | 'discount' | 'debt';

interface Customer {
  id: string;
  name?: string;
  full_name?: string;
  phone?: string;
  email?: string;
}

interface CustomerSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  selectedCustomerId?: string;
  selectedCustomerName?: string;
  // الأسعار
  originalTotal: number; // السعر الأصلي (قبل التعديل)
  currentTotal: number;  // السعر الحالي (بعد التعديل)
  // نوع البيع
  saleMode: SaleMode;
  onSelectCustomer: (customerId: string | undefined, customerName: string | undefined) => void;
  onChangeSaleMode: (mode: SaleMode) => void;
  onCreateCustomer?: () => void;
  // ✅ callback بعد التأكيد للمتابعة للدفع
  onConfirmAndProceed?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Sale Mode Config
// ═══════════════════════════════════════════════════════════════════════════

const SALE_MODES = {
  normal: {
    label: 'بيع عادي',
    icon: ShoppingCart,
    color: 'bg-emerald-500',
    lightColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    description: 'دفع كامل المبلغ'
  },
  discount: {
    label: 'تخفيض',
    icon: Percent,
    color: 'bg-amber-500',
    lightColor: 'bg-amber-50 dark:bg-amber-950/30',
    textColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800',
    description: 'خصم على الطلب'
  },
  debt: {
    label: 'مديونية',
    icon: CreditCard,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50 dark:bg-blue-950/30',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'تسجيل كدين'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Format Price
// ═══════════════════════════════════════════════════════════════════════════

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ar-DZ').format(price);
};

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

const CustomerSaleDialog: React.FC<CustomerSaleDialogProps> = ({
  open,
  onOpenChange,
  customers,
  selectedCustomerId,
  selectedCustomerName,
  originalTotal,
  currentTotal,
  saleMode,
  onSelectCustomer,
  onChangeSaleMode,
  onCreateCustomer,
  onConfirmAndProceed
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelectedId, setLocalSelectedId] = useState<string | undefined>(selectedCustomerId);
  const [localSelectedName, setLocalSelectedName] = useState<string | undefined>(selectedCustomerName);
  const [localSaleMode, setLocalSaleMode] = useState<SaleMode>(saleMode);

  // تحديث القيم المحلية عند فتح النافذة
  useEffect(() => {
    if (open) {
      setLocalSelectedId(selectedCustomerId);
      setLocalSelectedName(selectedCustomerName);
      setLocalSaleMode(saleMode);
    }
  }, [open, selectedCustomerId, selectedCustomerName, saleMode]);

  // حساب الفرق
  const priceDifference = originalTotal - currentTotal;
  const hasDifference = priceDifference > 0;
  const differencePercentage = originalTotal > 0 ? ((priceDifference / originalTotal) * 100).toFixed(1) : '0';

  // تصفية العملاء
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers || [];
    const query = searchQuery.toLowerCase();
    return (customers || []).filter(c =>
      (c.name || c.full_name || '').toLowerCase().includes(query) ||
      (c.phone || '').includes(query)
    );
  }, [customers, searchQuery]);

  // اختيار عميل
  const handleSelectCustomer = (customer: Customer) => {
    setLocalSelectedId(customer.id);
    setLocalSelectedName(customer.name || customer.full_name);
  };

  // إلغاء اختيار العميل
  const handleClearCustomer = () => {
    setLocalSelectedId(undefined);
    setLocalSelectedName(undefined);
  };

  // تأكيد الاختيار
  const handleConfirm = () => {
    onSelectCustomer(localSelectedId, localSelectedName);
    onChangeSaleMode(localSaleMode);
    onOpenChange(false);
    // ✅ المتابعة للدفع بعد التأكيد - مع تأخير بسيط لتجنب مشاكل re-render
    if (onConfirmAndProceed) {
      setTimeout(() => {
        onConfirmAndProceed();
      }, 100);
    }
  };

  const currentModeConfig = SALE_MODES[localSaleMode];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden max-h-[90vh] dark:bg-[#161b22] dark:border-[#30363d]" dir="rtl">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-[#30363d] bg-zinc-50 dark:bg-[#0f1419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 dark:text-[#e6edf3]">
              <User className="w-5 h-5" />
              العميل ونوع البيع
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* ═══ ملخص السعر ═══ */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#21262d] space-y-2 dark:border dark:border-[#30363d]">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-500 dark:text-[#8b949e]">السعر الأصلي</span>
              <span className="font-bold dark:text-[#e6edf3]">{formatPrice(originalTotal)} د.ج</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-500 dark:text-[#8b949e]">السعر الحالي</span>
              <span className={cn("font-bold dark:text-[#e6edf3]", hasDifference && "text-orange-600 dark:text-orange-400")}>
                {formatPrice(currentTotal)} د.ج
              </span>
            </div>
            {hasDifference && (
              <div className="flex justify-between items-center pt-2 border-t border-zinc-200 dark:border-[#30363d]">
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">الفرق</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {formatPrice(priceDifference)} د.ج ({differencePercentage}%)
                </span>
              </div>
            )}
          </div>

          {/* ═══ نوع البيع ═══ */}
          {hasDifference ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-600 dark:text-[#8b949e]">
                كيف تريد معالجة الفرق؟
              </label>
              <div className="grid grid-cols-2 gap-2">
                {/* تخفيض */}
                <button
                  onClick={() => setLocalSaleMode('discount')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                    localSaleMode === 'discount'
                      ? "bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40"
                      : "border-zinc-200 dark:border-[#30363d] hover:border-zinc-300 dark:hover:border-[#484f58]"
                  )}
                >
                  <Percent className={cn(
                    "w-6 h-6",
                    localSaleMode === 'discount' ? "text-amber-600 dark:text-amber-400" : "text-zinc-400 dark:text-[#6e7681]"
                  )} />
                  <span className={cn(
                    "text-sm font-semibold",
                    localSaleMode === 'discount' ? "text-amber-700 dark:text-amber-300" : "text-zinc-600 dark:text-[#8b949e]"
                  )}>تخفيض</span>
                  <span className="text-[10px] text-zinc-400 dark:text-[#6e7681]">خصم {differencePercentage}%</span>
                </button>

                {/* مديونية */}
                <button
                  onClick={() => setLocalSaleMode('debt')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                    localSaleMode === 'debt'
                      ? "bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/40"
                      : "border-zinc-200 dark:border-[#30363d] hover:border-zinc-300 dark:hover:border-[#484f58]"
                  )}
                >
                  <CreditCard className={cn(
                    "w-6 h-6",
                    localSaleMode === 'debt' ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 dark:text-[#6e7681]"
                  )} />
                  <span className={cn(
                    "text-sm font-semibold",
                    localSaleMode === 'debt' ? "text-blue-700 dark:text-blue-300" : "text-zinc-600 dark:text-[#8b949e]"
                  )}>مديونية</span>
                  <span className="text-[10px] text-zinc-400 dark:text-[#6e7681]">{formatPrice(priceDifference)} د.ج</span>
                </button>
              </div>

              {/* تحذير المديونية */}
              {localSaleMode === 'debt' && !localSelectedId && (
                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
                  <p className="text-xs text-red-600 dark:text-red-400">
                    ⚠️ يجب اختيار عميل لتسجيل المديونية
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium text-emerald-700 dark:text-emerald-300">بيع عادي</span>
              </div>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">السعر كامل - لا يوجد تخفيض أو مديونية</p>
            </div>
          )}

          {/* ═══ اختيار العميل ═══ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-600 dark:text-[#8b949e]">
                العميل {localSaleMode === 'debt' && <span className="text-red-500">*</span>}
              </label>
              {localSelectedId && (
                <button
                  onClick={handleClearCustomer}
                  className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  إلغاء
                </button>
              )}
            </div>

            {/* العميل المختار */}
            {localSelectedId && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
                <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                  {(localSelectedName || '?')[0]}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-emerald-700 dark:text-emerald-300">
                    {localSelectedName}
                  </p>
                </div>
                <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              </div>
            )}

            {/* البحث */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                type="text"
                placeholder="ابحث عن عميل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 h-9"
              />
            </div>

            {/* زر إنشاء عميل جديد */}
            {onCreateCustomer && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onCreateCustomer();
                }}
                className="w-full justify-center gap-2 border-dashed h-8"
              >
                <UserPlus className="w-3.5 h-3.5" />
                عميل جديد
              </Button>
            )}

            {/* قائمة العملاء */}
            <ScrollArea className="h-[150px] rounded-xl border border-zinc-200 dark:border-[#30363d]">
              {filteredCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-6 text-zinc-400 dark:text-[#6e7681]">
                  <User className="w-6 h-6 mb-1 opacity-50" />
                  <p className="text-xs">لا يوجد عملاء</p>
                </div>
              ) : (
                <div className="p-1.5 space-y-0.5">
                  {filteredCustomers.map((customer) => {
                    const isSelected = customer.id === localSelectedId;
                    const displayName = customer.name || customer.full_name || 'بدون اسم';

                    return (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => handleSelectCustomer(customer)}
                        className={cn(
                          "w-full flex items-center gap-2.5 p-2 rounded-lg transition-all text-right",
                          isSelected
                            ? "bg-orange-100 dark:bg-orange-500/15 border border-orange-300 dark:border-orange-500/40"
                            : "hover:bg-zinc-100 dark:hover:bg-[#21262d] border border-transparent"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0",
                          isSelected ? "bg-orange-500" : "bg-zinc-400 dark:bg-[#484f58]"
                        )}>
                          {displayName[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "font-medium text-sm truncate",
                            isSelected ? "text-orange-700 dark:text-orange-300" : "text-zinc-700 dark:text-[#e6edf3]"
                          )}>
                            {displayName}
                          </p>
                          {customer.phone && (
                            <p className="text-[10px] text-zinc-400 dark:text-[#6e7681] flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5" />
                              {customer.phone}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-[#30363d] bg-zinc-50 dark:bg-[#0f1419]">
          <Button
            onClick={handleConfirm}
            disabled={localSaleMode === 'debt' && !localSelectedId}
            className={cn(
              "w-full h-10 rounded-xl font-bold text-white",
              currentModeConfig.color,
              "disabled:opacity-50"
            )}
          >
            <Check className="w-4 h-4 ml-2" />
            تأكيد
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerSaleDialog;
