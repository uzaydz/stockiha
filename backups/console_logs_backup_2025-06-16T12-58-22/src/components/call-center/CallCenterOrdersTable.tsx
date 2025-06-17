import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  User,
  Phone,
  UserCheck,
  PhoneCall,
  Calendar,
  MoreHorizontal,
  Eye,
  Edit,
  MessageSquare,
  FileText,
  Search,
  Filter,
  SlidersHorizontal,
  Download,
  Printer,
  Package,
  Clock,
  CheckCircle,
  Truck,
  CheckCircle2,
  XCircle,
  Copy
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { getOrderCustomerName, getOrderCustomerContact } from "@/utils/ordersHelpers";
import { formatDate } from "@/lib/utils";

interface AssignedOrder {
  id: string;
  customer_order_number: number;
  total: number;
  status: string;
  payment_status: string;
  payment_method: string;
  shipping_cost?: number;
  notes?: string;
  created_at: string;
  organization_id: string;
  form_data?: any;
  assigned_agent_id?: string;
  agent_priority: number;
  call_attempts: number;
  last_call_attempt?: string;
  next_call_scheduled?: string;
  assignment_timestamp?: string;
  call_center_priority: number;
  call_center_notes?: string;
  call_confirmation_status_id?: number;
  call_confirmation_notes?: string;
  order_items?: any[];
  call_center_agents?: {
    id: string;
    users: {
      id: string;
      name: string;
      email: string;
    };
  };
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  shipping_address?: {
    id: string;
    name?: string;
    street_address?: string;
    municipality?: string;
    state?: string;
    phone?: string;
  };
  customerName?: string;
  customerContact?: string;
}

interface CallCenterOrdersTableProps {
  orders: AssignedOrder[];
  selectedOrders: string[];
  expandedOrders: Record<string, boolean>;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  loading?: boolean;
  onSelectAll: (checked: boolean) => void;
  onSelectOrder: (orderId: string, checked: boolean) => void;
  onToggleExpand: (orderId: string) => void;
  onPageChange: (page: number) => void;
  onViewOrder: (orderId: string) => void;
  onCallCustomer: (phone: string) => void;
  onBulkUpdateStatus?: (orderIds: string[], status: string) => void;
  onResetSelections?: () => void;
  getStatusVariant: (status: string) => "default" | "secondary" | "destructive" | "outline";
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  formatDate: (dateString: string) => string;
}

const CallCenterOrdersTable: React.FC<CallCenterOrdersTableProps> = ({
  orders,
  selectedOrders,
  expandedOrders,
  currentPage,
  totalPages,
  pageSize,
  loading = false,
  onSelectAll,
  onSelectOrder,
  onToggleExpand,
  onPageChange,
  onViewOrder,
  onCallCustomer,
  onBulkUpdateStatus,
  onResetSelections,
  getStatusVariant,
  getStatusColor,
  getStatusText,
  formatDate: formatDateProp
}) => {
  const [searchFilter, setSearchFilter] = useState("");

  // تنقية الطلبات بناءً على البحث
  const filteredOrders = useMemo(() => {
    if (!searchFilter.trim()) return orders;
    
    const searchTerm = searchFilter.toLowerCase();
    return orders.filter(order => 
      order.id.toLowerCase().includes(searchTerm) ||
      (order.customer_order_number?.toString() || "").includes(searchTerm) ||
      getOrderCustomerName(order as any).toLowerCase().includes(searchTerm) ||
      getOrderCustomerContact(order as any).toLowerCase().includes(searchTerm) ||
      order.status.toLowerCase().includes(searchTerm)
    );
  }, [orders, searchFilter]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // التحقق من وجود انتقاء كلي
  const allSelected = useMemo(() => {
    return paginatedOrders.length > 0 && selectedOrders.length === paginatedOrders.length;
  }, [paginatedOrders, selectedOrders]);

  // Bulk actions
  const handleBulkStatusUpdate = async (status: string) => {
    if (onBulkUpdateStatus) {
      onBulkUpdateStatus(selectedOrders, status);
    }
  };

  const resetSelections = () => {
    if (onResetSelections) {
      onResetSelections();
    }
  };

  return (
    <div className="overflow-hidden">
      <div className="p-5">
        {/* شريط البحث والإجراءات العلوي - تصميم محسن */}
        <div className="mb-6 flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4 lg:items-center lg:justify-between">
          <div className="relative flex items-center w-full lg:w-80">
            <Search className="absolute left-3 h-4 w-4 text-call-center-foreground-muted" />
            <Input
              type="search"
              placeholder="البحث في الطلبات..."
              className="pl-10 pr-4 py-2.5 w-full rounded-lg border border-call-center-border bg-call-center-bg/50 backdrop-blur-sm focus:border-call-center-primary/50 focus:ring-2 focus:ring-call-center-primary/20 transition-all duration-200 text-call-center-foreground placeholder:text-call-center-foreground-muted"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {selectedOrders.length > 0 && (
              <div className="bg-call-center-primary/10 border border-call-center-primary/30 px-4 py-2 rounded-lg text-sm flex items-center gap-2 backdrop-blur-sm">
                <span className="font-semibold text-call-center-primary">{selectedOrders.length}</span>
                <span className="text-call-center-primary/80">طلب محدد</span>
              </div>
            )}
            
            {selectedOrders.length > 0 && (
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2 px-4 py-2 rounded-lg call-center-hover border-call-center-border"
                    >
                      <Package className="h-4 w-4" />
                      تحديث الحالة
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="call-center-glass border-call-center-border">
                    <DropdownMenuLabel>تحديث حالة الطلبات</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleBulkStatusUpdate('pending')}
                      className="call-center-hover"
                    >
                      <Clock className="h-4 w-4 ml-2 text-amber-500" />
                      قيد الانتظار
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleBulkStatusUpdate('processing')}
                      className="call-center-hover"
                    >
                      <CheckCircle className="h-4 w-4 ml-2 text-blue-500" />
                      قيد المعالجة
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleBulkStatusUpdate('completed')}
                      className="call-center-hover"
                    >
                      <CheckCircle2 className="h-4 w-4 ml-2 text-green-500" />
                      مكتمل
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleBulkStatusUpdate('cancelled')}
                      className="call-center-hover"
                    >
                      <XCircle className="h-4 w-4 ml-2 text-red-500" />
                      ملغي
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetSelections}
                  className="gap-2 px-4 py-2 rounded-lg call-center-hover border-call-center-border"
                >
                  إلغاء التحديد
                </Button>
              </div>
            )}
            
            <Button variant="outline" size="sm" className="gap-2 px-4 py-2 rounded-lg call-center-hover border-call-center-border">
              <Filter className="h-4 w-4" />
              <span>تصفية</span>
            </Button>
            
            <Button variant="outline" size="sm" className="gap-2 px-4 py-2 rounded-lg call-center-hover border-call-center-border">
              <SlidersHorizontal className="h-4 w-4" />
              <span>الأعمدة</span>
            </Button>
            
            <Button variant="outline" size="sm" className="gap-2 px-4 py-2 rounded-lg call-center-hover border-call-center-border">
              <Download className="h-4 w-4" />
              <span>تصدير</span>
            </Button>
            
            <Button variant="outline" size="sm" className="gap-2 px-4 py-2 rounded-lg call-center-hover border-call-center-border">
              <Printer className="h-4 w-4" />
              <span>طباعة</span>
            </Button>
          </div>
        </div>

        {/* الجدول المحسن مع تصميم حديث */}
        <div className="rounded-lg border border-call-center-border/30 bg-call-center-bg/50 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader className="bg-gradient-to-r from-call-center-bg-muted/40 to-call-center-bg-muted/20 backdrop-blur-sm">
                <TableRow className="border-b border-call-center-border/50 hover:bg-transparent">
                  <TableHead className="w-12 py-4 px-4">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={onSelectAll}
                      disabled={paginatedOrders.length === 0}
                      aria-label="تحديد كل الطلبات"
                      className="border-call-center-border/50"
                    />
                  </TableHead>
                  <TableHead className="w-10 py-4"></TableHead>
                  <TableHead className="font-semibold text-call-center-foreground py-4 px-4 text-sm">رقم الطلب</TableHead>
                  <TableHead className="font-semibold text-call-center-foreground py-4 px-4 text-sm">العميل</TableHead>
                  <TableHead className="font-semibold text-call-center-foreground py-4 px-4 text-sm">الاتصال</TableHead>
                  <TableHead className="font-semibold text-call-center-foreground py-4 px-4 text-sm">المبلغ</TableHead>
                  <TableHead className="font-semibold text-call-center-foreground py-4 px-4 text-sm">الحالة</TableHead>
                  <TableHead className="font-semibold text-call-center-foreground py-4 px-4 text-sm">الوكيل</TableHead>
                  <TableHead className="font-semibold text-call-center-foreground py-4 px-4 text-sm">المحاولات</TableHead>
                  <TableHead className="font-semibold text-call-center-foreground py-4 px-4 text-sm">التاريخ</TableHead>
                  <TableHead className="text-right font-semibold w-16 py-4 px-4 text-call-center-foreground text-sm">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`} className="hover:bg-call-center-accent/20 border-b border-call-center-border/30 transition-colors duration-150">
                      <TableCell className="py-4 px-4">
                        <Skeleton className="h-4 w-4 bg-call-center-bg-muted/60 rounded" />
                      </TableCell>
                      <TableCell className="py-4">
                        <Skeleton className="h-4 w-4 bg-call-center-bg-muted/60 rounded" />
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <Skeleton className="h-5 w-24 bg-call-center-bg-muted/60 rounded-md" />
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <div className="flex flex-col gap-2">
                          <Skeleton className="h-5 w-32 bg-call-center-bg-muted/60 rounded-md" />
                          <Skeleton className="h-4 w-24 bg-call-center-bg-muted/40 rounded-md" />
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-16 bg-call-center-bg-muted/60 rounded-md" />
                          <Skeleton className="h-5 w-16 bg-call-center-bg-muted/60 rounded-md" />
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <Skeleton className="h-6 w-20 bg-call-center-bg-muted/60 rounded-lg" />
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <Skeleton className="h-6 w-24 bg-call-center-bg-muted/60 rounded-full" />
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <Skeleton className="h-5 w-32 bg-call-center-bg-muted/60 rounded-md" />
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <Skeleton className="h-5 w-10 bg-call-center-bg-muted/60 rounded-md" />
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <Skeleton className="h-5 w-20 bg-call-center-bg-muted/60 rounded-md" />
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <div className="flex justify-end">
                          <Skeleton className="h-8 w-8 bg-call-center-bg-muted/60 rounded-lg" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : paginatedOrders.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={11} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-call-center-foreground-muted py-12">
                        <div className="p-4 rounded-full bg-call-center-bg-muted/20 mb-4">
                          <Search className="h-8 w-8 opacity-40" />
                        </div>
                        <p className="text-lg font-semibold mb-2 text-call-center-foreground">لا توجد طلبات</p>
                        <p className="text-sm text-call-center-foreground-muted max-w-sm">لم يتم العثور على طلبات تطابق معايير البحث المحددة.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOrders.map((order) => (
                    <React.Fragment key={order.id}>
                      <TableRow 
                        className={`
                          ${selectedOrders.includes(order.id) ? "bg-call-center-primary/5 border-call-center-primary/20" : ""}
                          hover:bg-call-center-accent/10 
                          transition-all duration-200
                          cursor-pointer
                          group
                          border-b border-call-center-border/30
                          ${selectedOrders.includes(order.id) ? "shadow-sm" : ""}
                        `}
                        onClick={() => onToggleExpand(order.id)}
                      >
                        {/* Checkbox */}
                        <TableCell className="w-12 py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedOrders.includes(order.id)}
                            onCheckedChange={(checked) => onSelectOrder(order.id, !!checked)}
                            aria-label={`تحديد الطلب #${order.customer_order_number || order.id.slice(0, 8)}`}
                            className="border-call-center-border/50 data-[state=checked]:border-call-center-primary"
                          />
                        </TableCell>
                        
                        {/* Expand button */}
                        <TableCell className="w-10 py-4 px-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 transition-opacity opacity-70 group-hover:opacity-100 text-call-center-foreground hover:bg-call-center-accent/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleExpand(order.id);
                            }}
                            aria-label={expandedOrders[order.id] ? "طي التفاصيل" : "عرض التفاصيل"}
                          >
                            {expandedOrders[order.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        
                        {/* Order ID */}
                        <TableCell className="py-4 px-4">
                          <div className="font-semibold text-call-center-foreground bg-call-center-accent/30 px-2 py-1 rounded-md text-sm">
                            #{order.customer_order_number || order.id.slice(0, 8)}
                          </div>
                        </TableCell>
                        
                        {/* Customer name */}
                        <TableCell className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-call-center-primary" />
                            <span className="font-medium text-call-center-foreground">
                              {getOrderCustomerName(order as any)}
                            </span>
                          </div>
                        </TableCell>
                        
                        {/* Contact */}
                        <TableCell className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-call-center-primary" />
                            <span className="text-call-center-foreground">
                              {getOrderCustomerContact(order as any)}
                            </span>
                          </div>
                        </TableCell>
                        
                        {/* Total */}
                        <TableCell className="py-4 px-4">
                          <span className="font-mono font-semibold text-call-center-foreground">
                            {(order as any).total_amount || order.total || 0} د.م.
                          </span>
                        </TableCell>
                        
                        {/* Status */}
                        <TableCell className="py-4 px-4">
                          <Badge 
                            variant={getStatusVariant(order.status)}
                            className={getStatusColor(order.status)}
                          >
                            {getStatusText(order.status)}
                          </Badge>
                        </TableCell>
                        
                        {/* Agent */}
                        <TableCell className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-call-center-primary" />
                            <span className="text-call-center-foreground text-sm">
                              {order.call_center_agents?.users?.name || 'غير مُكلف'}
                            </span>
                          </div>
                        </TableCell>
                        
                        {/* Call attempts */}
                        <TableCell className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <PhoneCall className="h-4 w-4 text-call-center-primary" />
                            <span className="text-call-center-foreground font-medium">
                              {order.call_attempts || 0}
                            </span>
                          </div>
                        </TableCell>
                        
                        {/* Date */}
                        <TableCell className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-call-center-primary" />
                            <span className="text-call-center-foreground text-sm">
                              {formatDateProp(order.created_at)}
                            </span>
                          </div>
                        </TableCell>
                        
                        {/* Actions */}
                        <TableCell className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 call-center-hover"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent 
                              align="end"
                              className="call-center-glass border-call-center-border"
                            >
                              <DropdownMenuItem 
                                className="call-center-hover"
                                onClick={() => onViewOrder(order.id)}
                              >
                                <Eye className="h-4 w-4 ml-2" />
                                عرض التفاصيل
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="call-center-hover"
                                onClick={() => onCallCustomer(getOrderCustomerContact(order as any))}
                              >
                                <Phone className="h-4 w-4 ml-2" />
                                اتصال
                              </DropdownMenuItem>
                              <DropdownMenuItem className="call-center-hover">
                                <Edit className="h-4 w-4 ml-2" />
                                تعديل الحالة
                              </DropdownMenuItem>
                              <DropdownMenuItem className="call-center-hover">
                                <MessageSquare className="h-4 w-4 ml-2" />
                                إضافة ملاحظة
                              </DropdownMenuItem>
                              <DropdownMenuItem className="call-center-hover">
                                <FileText className="h-4 w-4 ml-2" />
                                طباعة الفاتورة
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded row details */}
                      {expandedOrders[order.id] && (
                        <TableRow className="bg-call-center-bg-muted/20 border-b border-call-center-border/30">
                          <TableCell colSpan={11} className="py-4 px-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-call-center-foreground">معلومات إضافية</h4>
                                <div className="space-y-1 text-call-center-foreground-muted">
                                  <p>طريقة الدفع: {order.payment_method || 'غير محدد'}</p>
                                  <p>حالة الدفع: {order.payment_status || 'غير محدد'}</p>
                                  <p>تكلفة الشحن: {order.shipping_cost || 0} د.م.</p>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <h4 className="font-semibold text-call-center-foreground">تفاصيل المكالمة</h4>
                                <div className="space-y-1 text-call-center-foreground-muted">
                                  <p>آخر محاولة: {order.last_call_attempt ? formatDateProp(order.last_call_attempt) : 'لا توجد'}</p>
                                  <p>المكالمة التالية: {order.next_call_scheduled ? formatDateProp(order.next_call_scheduled) : 'غير محددة'}</p>
                                  <p>الأولوية: {order.call_center_priority || 'عادية'}</p>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <h4 className="font-semibold text-call-center-foreground">الملاحظات</h4>
                                <div className="text-call-center-foreground-muted">
                                  <p>{order.call_center_notes || order.notes || 'لا توجد ملاحظات'}</p>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* شريط التنقل السفلي المحسن */}
          {filteredOrders.length > 0 && (
            <div className="py-4 px-6 bg-gradient-to-r from-call-center-bg-muted/20 to-call-center-bg-muted/10 border-t border-call-center-border/30 flex items-center justify-between">
              <div className="text-sm text-call-center-foreground-muted">
                عرض <span className="font-semibold text-call-center-foreground bg-call-center-accent/50 px-2 py-1 rounded-md">{startIndex + 1}</span> 
                إلى <span className="font-semibold text-call-center-foreground bg-call-center-accent/50 px-2 py-1 rounded-md">{Math.min(endIndex, filteredOrders.length)}</span> 
                من إجمالي <span className="font-semibold text-call-center-primary bg-call-center-primary/10 px-2 py-1 rounded-md">{filteredOrders.length}</span> طلب
              </div>
              
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage <= 1}
                  onClick={() => onPageChange(1)}
                  className="px-4 py-2 rounded-lg call-center-hover border-call-center-border disabled:opacity-50"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage <= 1}
                  onClick={() => onPageChange(currentPage - 1)}
                  className="px-4 py-2 rounded-lg call-center-hover border-call-center-border disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="text-sm text-call-center-foreground-muted bg-call-center-bg-muted/20 px-3 py-2 rounded-lg border border-call-center-border/30">
                  صفحة <span className="font-semibold text-call-center-foreground">{currentPage}</span> من <span className="font-semibold text-call-center-foreground">{totalPages}</span>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage >= totalPages}
                  onClick={() => onPageChange(currentPage + 1)}
                  className="px-4 py-2 rounded-lg call-center-hover border-call-center-border disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage >= totalPages}
                  onClick={() => onPageChange(totalPages)}
                  className="px-4 py-2 rounded-lg call-center-hover border-call-center-border disabled:opacity-50"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallCenterOrdersTable; 