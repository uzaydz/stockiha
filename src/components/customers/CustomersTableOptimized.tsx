import React, { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ArrowUpRight,
  MessageCircle,
  History,
  Star,
  Ban,
  Trash2,
  Pencil,
  ShoppingBag
} from "lucide-react";
import { Customer, CustomerWithStats } from "@/types/customer";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface CustomersTableOptimizedProps {
  customers: Customer[];
  isLoading: boolean;
  hasEditPermission: boolean;
  hasDeletePermission: boolean;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
  onViewDetails?: (customer: Customer) => void;
}

// دالة مساعدة لتوليد ألوان ثابتة بناءً على الاسم
const getAvatarColor = (name: string) => {
  const colors = [
    "bg-red-100 text-red-600",
    "bg-orange-100 text-orange-600",
    "bg-amber-100 text-amber-600",
    "bg-green-100 text-green-600",
    "bg-emerald-100 text-emerald-600",
    "bg-teal-100 text-teal-600",
    "bg-cyan-100 text-cyan-600",
    "bg-blue-100 text-blue-600",
    "bg-indigo-100 text-indigo-600",
    "bg-violet-100 text-violet-600",
    "bg-purple-100 text-purple-600",
    "bg-fuchsia-100 text-fuchsia-600",
    "bg-pink-100 text-pink-600",
    "bg-rose-100 text-rose-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const CustomersTableOptimized = ({
  customers,
  isLoading,
  hasEditPermission,
  hasDeletePermission,
  onEdit,
  onDelete,
  onViewDetails
}: CustomersTableOptimizedProps) => {
  const { toast } = useToast();
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);

  // التعامل مع تحديد الكل
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCustomers(customers.map((c) => c.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleSelectCustomer = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedCustomers((prev) => [...prev, id]);
    } else {
      setSelectedCustomers((prev) => prev.filter((c) => c !== id));
    }
  };

  // دالة لفتح واتساب
  const openWhatsApp = (phone: string | null) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^\d]/g, "");
    window.open(`https://wa.me/${cleanPhone}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-4 p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <div className="h-12 w-12 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/4 bg-muted rounded" />
              <div className="h-3 w-1/3 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="bg-muted/50 p-6 rounded-full mb-4">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">لا يوجد عملاء</h3>
        <p className="text-muted-foreground max-w-sm mt-2">
          لم يتم العثور على عملاء يطابقون معايير البحث الحالية.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[50px] text-center">
                <Checkbox
                  checked={
                    customers.length > 0 &&
                    selectedCustomers.length === customers.length
                  }
                  onCheckedChange={handleSelectAll}
                  aria-label="تحديد الكل"
                />
              </TableHead>
              <TableHead className="text-right min-w-[250px]">العميل</TableHead>
              <TableHead className="text-right min-w-[150px]">التواصل</TableHead>
              <TableHead className="text-right min-w-[120px]">الأداء</TableHead>
              <TableHead className="text-right min-w-[150px]">آخر ظهور</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => {
              const stats = customer as CustomerWithStats;
              const initials = getInitials(customer.name);
              const avatarColor = getAvatarColor(customer.name);
              const lastOrderDate = stats.last_order_date
                ? new Date(stats.last_order_date)
                : null;

              // تصنيف العميل
              let customerBadge = null;
              if ((stats.total_spent || 0) > 50000) {
                customerBadge = (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-0 text-[10px] px-1.5 py-0 h-5">
                    VIP
                  </Badge>
                );
              } else if ((stats.orders_count || 0) > 5) {
                customerBadge = (
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-0 text-[10px] px-1.5 py-0 h-5">
                    مميز
                  </Badge>
                );
              } else if (!stats.orders_count) {
                customerBadge = (
                  <Badge variant="outline" className="text-muted-foreground text-[10px] px-1.5 py-0 h-5">
                    جديد
                  </Badge>
                );
              }

              return (
                <TableRow
                  key={customer.id}
                  className="group hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => onViewDetails?.(customer)}
                >
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedCustomers.includes(customer.id)}
                      onCheckedChange={(checked) =>
                        handleSelectCustomer(customer.id, checked as boolean)
                      }
                      aria-label={`تحديد ${customer.name}`}
                    />
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-border/50">
                        <AvatarImage src="" alt={customer.name} />
                        <AvatarFallback className={cn("font-semibold text-sm", avatarColor)}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground/90 text-sm group-hover:text-primary transition-colors">
                            {customer.name}
                          </span>
                          {customerBadge}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground gap-2">
                          <span className="flex items-center gap-1 truncate max-w-[180px]">
                             ID: #{customer.id.slice(0, 6)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-1.5">
                      {customer.phone ? (
                        <button
                          onClick={() => openWhatsApp(customer.phone)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-green-600 transition-colors w-fit p-1 -mr-1 rounded-md hover:bg-green-50"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span dir="ltr" className="font-mono">{customer.phone}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground/50 flex items-center gap-1.5 p-1">
                          <Phone className="h-3.5 w-3.5" />
                          <span>لا يوجد هاتف</span>
                        </span>
                      )}
                      
                      {customer.email && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground p-1 -mr-1">
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[150px]">{customer.email}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                          <ShoppingBag className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">
                            {stats.orders_count || 0} طلب
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {stats.total_spent?.toLocaleString()} د.ج
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {lastOrderDate ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <History className="h-3.5 w-3.5" />
                          <span>
                            {formatDistanceToNow(lastOrderDate, {
                              addSuffix: true,
                              locale: ar,
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">
                          لا توجد طلبات
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                           انضم {new Date(customer.created_at).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          <span className="sr-only">الإجراءات</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px]">
                        <DropdownMenuLabel>إجراءات العميل</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onViewDetails?.(customer)}>
                          <ArrowUpRight className="mr-2 h-4 w-4" />
                          عرض التفاصيل
                        </DropdownMenuItem>
                        {hasEditPermission && (
                          <DropdownMenuItem onClick={() => onEdit?.(customer)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            تعديل البيانات
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => openWhatsApp(customer.phone)}>
                          <MessageCircle className="mr-2 h-4 w-4" />
                          مراسلة واتساب
                        </DropdownMenuItem>
                        {hasDeletePermission && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => onDelete?.(customer)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              حذف العميل
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CustomersTableOptimized;
