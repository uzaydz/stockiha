/**
 * CustomersTableSimple - Customers Table
 * ============================================================
 * Apple-Inspired Design - Elegant & Refined
 * Same design as POSOrdersTableSimple
 * ============================================================
 */

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  Users,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  CreditCard,
} from 'lucide-react';
import { format, parseISO, isToday, isYesterday, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Customer } from '@/types/customer';

// ===============================================================================
// Types
// ===============================================================================

interface CustomersTableProps {
  customers: Customer[];
  loading?: boolean;
  error?: string | null;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onCustomerView: (customer: Customer) => void;
  onCustomerEdit: (customer: Customer) => void;
  onCustomerDelete: (customer: Customer) => void;
  onViewDebts?: (customer: Customer) => void;
}

// ===============================================================================
// Column Widths - Centralized for perfect alignment
// ===============================================================================

const COL = {
  name: 'w-[160px]',
  phone: 'w-[120px]',
  email: 'w-[180px]',
  address: 'w-[150px]',
  nif: 'w-[130px]',
  date: 'w-[90px]',
  status: 'w-[80px]',
  actions: 'w-[140px]',
} as const;

// ===============================================================================
// Helpers
// ===============================================================================

const formatDateLabel = (dateString: string) => {
  try {
    const date = parseISO(dateString);
    if (isToday(date)) return 'اليوم';
    if (isYesterday(date)) return 'أمس';
    const daysDiff = differenceInDays(new Date(), date);
    if (daysDiff < 7) return `${daysDiff} أيام`;
    if (daysDiff < 30) return `${Math.floor(daysDiff / 7)} أسابيع`;
    return format(date, 'd MMM yyyy', { locale: ar });
  } catch {
    return dateString;
  }
};

const formatFullDate = (dateString: string) => {
  try {
    const date = parseISO(dateString);
    return format(date, 'yyyy/MM/dd - HH:mm', { locale: ar });
  } catch {
    return dateString;
  }
};

// ===============================================================================
// Skeleton Row
// ===============================================================================

const SkeletonRow = () => (
  <div className="flex items-center gap-2 px-3 py-3 border-b border-zinc-100 dark:border-zinc-800/50">
    <div className={cn(COL.name, "h-4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse")} />
    <div className={cn(COL.phone, "h-4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse")} />
    <div className={cn(COL.email, "h-4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse")} />
    <div className={cn(COL.address, "h-4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse")} />
    <div className={cn(COL.nif, "h-4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse")} />
    <div className={cn(COL.date, "h-4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse")} />
    <div className={cn(COL.status, "h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse")} />
    <div className={cn(COL.actions, "h-8 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse")} />
  </div>
);

// ===============================================================================
// Customer Row
// ===============================================================================

const CustomerRow = React.memo<{
  customer: Customer;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewDebts?: () => void;
}>(({ customer, onView, onEdit, onDelete, onViewDebts }) => {

  const isNew = useMemo(() => {
    try {
      const created = parseISO(customer.created_at);
      return differenceInDays(new Date(), created) <= 7;
    } catch {
      return false;
    }
  }, [customer.created_at]);

  const hasContact = customer.phone || customer.email;

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2.5",
        "border-b border-zinc-100 dark:border-zinc-800/50",
        "transition-colors duration-150",
        "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
      )}
    >
      {/* Customer Name */}
      <button
        onClick={onView}
        className={cn(
          COL.name, "shrink-0 text-right",
          "text-sm font-semibold text-zinc-900 dark:text-zinc-100",
          "hover:text-orange-600 dark:hover:text-orange-400 transition-colors",
          "truncate"
        )}
      >
        <span className="truncate">{customer.name}</span>
      </button>

      {/* Phone */}
      <div className={cn(COL.phone, "shrink-0 text-center")}>
        {customer.phone ? (
          <a
            href={`tel:${customer.phone}`}
            className="text-sm text-zinc-600 dark:text-zinc-300 hover:text-orange-600 dark:hover:text-orange-400 flex items-center justify-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="w-3 h-3 text-zinc-400 shrink-0" />
            <span className="font-numeric truncate" dir="ltr">{customer.phone}</span>
          </a>
        ) : (
          <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
        )}
      </div>

      {/* Email */}
      <div className={cn(COL.email, "shrink-0 text-center")}>
        {customer.email ? (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`mailto:${customer.email}`}
                  className="text-sm text-zinc-600 dark:text-zinc-300 hover:text-orange-600 dark:hover:text-orange-400 flex items-center justify-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="w-3 h-3 text-zinc-400 shrink-0" />
                  <span className="truncate max-w-[140px]">{customer.email}</span>
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {customer.email}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
        )}
      </div>

      {/* Address */}
      <div className={cn(COL.address, "shrink-0 text-center")}>
        {customer.address ? (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center justify-center gap-1 cursor-help">
                  <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                  <span className="truncate max-w-[120px]">{customer.address}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-[250px]">
                {customer.address}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
        )}
      </div>

      {/* NIF (Tax ID) */}
      <div className={cn(COL.nif, "shrink-0 text-center")}>
        {customer.nif ? (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-center gap-1 cursor-help">
                  <CreditCard className="w-3 h-3 text-zinc-400 shrink-0" />
                  <span className="font-numeric truncate">{customer.nif}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div className="space-y-1">
                  <div>NIF: {customer.nif}</div>
                  {customer.rc && <div>RC: {customer.rc}</div>}
                  {customer.nis && <div>NIS: {customer.nis}</div>}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
        )}
      </div>

      {/* Created Date */}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(COL.date, "shrink-0 text-center cursor-help")}>
              <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300 flex items-center justify-center gap-1">
                <Calendar className="w-3 h-3 text-zinc-400 shrink-0" />
                {formatDateLabel(customer.created_at)}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {formatFullDate(customer.created_at)}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Status Badge */}
      <div className={cn(COL.status, "shrink-0 flex justify-center")}>
        {isNew ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            جديد
          </span>
        ) : hasContact ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
            نشط
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            عادي
          </span>
        )}
      </div>

      {/* Actions - Direct Buttons */}
      <div className={cn(COL.actions, "shrink-0 flex items-center justify-center gap-0.5")} onClick={(e) => e.stopPropagation()}>
        <TooltipProvider delayDuration={300}>
          {/* View */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onView}
                className="h-7 w-7 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/40 text-zinc-400 hover:text-orange-600"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">عرض</TooltipContent>
          </Tooltip>

          {/* Edit */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="h-7 w-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">تعديل</TooltipContent>
          </Tooltip>

          {/* View Debts */}
          {onViewDebts && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onViewDebts}
                  className="h-7 w-7 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-zinc-400 hover:text-amber-600"
                >
                  <FileText className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">المديونيات</TooltipContent>
            </Tooltip>
          )}

          {/* Delete */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-7 w-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-zinc-400 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">حذف</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
});
CustomerRow.displayName = 'CustomerRow';

// ===============================================================================
// Table Header
// ===============================================================================

const TableHeader = React.memo(() => (
  <div className={cn(
    "flex items-center gap-2 px-3 py-2.5",
    "bg-zinc-50 dark:bg-zinc-800/60",
    "border-b border-zinc-200 dark:border-zinc-700"
  )}>
    <span className={cn(COL.name, "shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-right")}>العميل</span>
    <span className={cn(COL.phone, "shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>الهاتف</span>
    <span className={cn(COL.email, "shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>البريد الإلكتروني</span>
    <span className={cn(COL.address, "shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>العنوان</span>
    <span className={cn(COL.nif, "shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>الرقم الجبائي</span>
    <span className={cn(COL.date, "shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>التسجيل</span>
    <span className={cn(COL.status, "shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>الحالة</span>
    <span className={cn(COL.actions, "shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>الإجراءات</span>
  </div>
));
TableHeader.displayName = 'TableHeader';

// ===============================================================================
// Main Component
// ===============================================================================

export const CustomersTableSimple = React.memo<CustomersTableProps>(({
  customers,
  loading = false,
  error = null,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onCustomerView,
  onCustomerEdit,
  onCustomerDelete,
  onViewDebts,
}) => {

  // Empty State
  if (!loading && customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-zinc-400" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          لا يوجد عملاء
        </h3>
        <p className="text-sm text-zinc-500">
          جرب تغيير الفلاتر للعثور على عملاء
        </p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className={cn(
        "bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden",
        "border border-zinc-200 dark:border-zinc-800",
        "shadow-sm"
      )}>
        {/* Header */}
        <TableHeader />

        {/* Rows */}
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
          ) : (
            customers.map((customer) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                onView={() => onCustomerView(customer)}
                onEdit={() => onCustomerEdit(customer)}
                onDelete={() => onCustomerDelete(customer)}
                onViewDebts={onViewDebts ? () => onViewDebts(customer) : undefined}
              />
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-zinc-500">
            <span className="font-numeric">{startItem}</span>
            <span className="mx-1">-</span>
            <span className="font-numeric">{endItem}</span>
            <span className="mx-1.5">من</span>
            <span className="font-numeric font-medium text-zinc-700 dark:text-zinc-300">{totalItems}</span>
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-0.5">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) page = i + 1;
                else if (currentPage <= 3) page = i + 1;
                else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                else page = currentPage - 2 + i;

                return (
                  <Button
                    key={page}
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-9 w-9 rounded-xl text-sm font-medium font-numeric",
                      currentPage === page
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                    onClick={() => onPageChange(page)}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

CustomersTableSimple.displayName = 'CustomersTableSimple';

export default CustomersTableSimple;
