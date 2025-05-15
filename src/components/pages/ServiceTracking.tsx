import React, { useState, useEffect, useMemo } from 'react';
import { useShop } from '@/context/ShopContext';
import { useTenant } from '@/context/TenantContext';
import { User, ServiceStatus, ServiceBooking as ServiceBookingType, UserRole, ServiceProgress } from '@/types';
import { getServiceRequests } from '@/lib/api/services';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, Clock, Search, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

interface ServiceBookingWithOrder {
  orderId: string;
  order: any;
  serviceBooking: ServiceBookingType;
}

interface ServiceWithProgress {
  serviceBooking: ServiceBookingType;
}

const statusConfig = {
  pending: {
    label: 'قيد الانتظار',
    color: 'bg-yellow-100 text-yellow-800',
    icon: <Clock className="h-4 w-4 mr-1" />,
  },
  in_progress: {
    label: 'قيد التنفيذ',
    color: 'bg-blue-100 text-blue-800',
    icon: <Clock className="h-4 w-4 mr-1" />,
  },
  completed: {
    label: 'مكتملة',
    color: 'bg-green-100 text-green-800',
    icon: <CheckCircle className="h-4 w-4 mr-1" />,
  },
  cancelled: {
    label: 'ملغاة',
    color: 'bg-red-100 text-red-800',
    icon: <XCircle className="h-4 w-4 mr-1" />,
  },
  delayed: {
    label: 'مؤجلة',
    color: 'bg-purple-100 text-purple-800',
    icon: <AlertCircle className="h-4 w-4 mr-1" />,
  },
};

const ServiceTracking = () => {
  const { 
    updateServiceBookingStatus, 
    assignServiceBooking, 
    users, 
    currentUser
  } = useShop();
  const { toast } = useToast();
  const { currentOrganization, isLoading: orgLoading } = useTenant();
  
  const [serviceBookings, setServiceBookings] = useState<ServiceBookingWithOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<ServiceBookingWithOrder | null>(null);
  const [statusUpdateNote, setStatusUpdateNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ServiceStatus | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // الحصول على الخدمات
  const fetchServiceBookings = async () => {
    setIsLoading(true);
    try {
      if (!currentOrganization) {
        toast({
          title: 'خطأ',
          description: 'لم يتم العثور على بيانات المؤسسة',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      
      
      
      // التحقق من وجود خدمات للمؤسسة الحالية وإصلاح المشكلة إذا لزم الأمر
      try {
        // فحص ما إذا كانت هناك أي خدمات في النظام
        const { data: availableServices, error: servicesError } = await supabase
          .from('service_bookings')
          .select('organization_id')
          .not('organization_id', 'is', null);
        
        if (!servicesError && availableServices && availableServices.length > 0) {
          // الحصول على قائمة المؤسسات التي لديها خدمات
          const orgsWithServices = [...new Set(availableServices.map(s => s.organization_id))];
          
          
          
          
          
          // إذا لم تكن المؤسسة الحالية موجودة في القائمة، يمكننا محاولة استخدام إحدى المؤسسات المتاحة
          if (!orgsWithServices.includes(currentOrganization.id) && orgsWithServices.length > 0) {
            
          }
        }
      } catch (checkError) {
        console.error('خطأ أثناء التحقق من توفر الخدمات:', checkError);
      }
      
      // استخدام الدالة الجديدة لجلب طلبات الخدمات
      const data = await getServiceRequests(currentOrganization.id);
      
      // تحويل البيانات إلى الصيغة المطلوبة
      const transformedData = data.map(booking => ({
        orderId: booking.order_id,
        order: booking.orders || {},
        serviceBooking: {
          id: booking.id,
          serviceId: booking.service_id,
          serviceName: booking.service_name,
          price: booking.price,
          scheduledDate: booking.scheduled_date ? new Date(booking.scheduled_date) : undefined,
          notes: booking.notes,
          customerId: booking.customer_id,
          customer_name: booking.customer_name || undefined,
          status: booking.status as ServiceStatus,
          assignedTo: booking.assigned_to,
          completedAt: booking.completed_at ? new Date(booking.completed_at) : undefined,
          public_tracking_code: booking.public_tracking_code,
          progress: []
        }
      }));
      
      setServiceBookings(transformedData);
      
    } catch (error) {
      console.error('Error fetching service bookings:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء جلب طلبات الخدمات',
        variant: 'destructive',
      });
      setServiceBookings([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // تحميل البيانات عند تحميل الصفحة
  useEffect(() => {
    if (currentOrganization) {
      fetchServiceBookings();
    }
  }, [currentOrganization]);
  
  // تصفية الخدمات بناءً على البحث وحالة الخدمة
  const filteredBookings = serviceBookings.filter((booking) => {
    // تصفية البحث
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      booking.serviceBooking.serviceName.toLowerCase().includes(searchLower) || 
      (booking.serviceBooking.customer_name?.toLowerCase().includes(searchLower)) ||
      (booking.serviceBooking.notes?.toLowerCase().includes(searchLower));
    
    // تصفية الحالة
    const matchesStatus = statusFilter === 'all' || booking.serviceBooking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // حساب عدد الصفحات
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  
  // الخدمات المعروضة في الصفحة الحالية
  const currentBookings = useMemo(() => {
    const firstItemIndex = (currentPage - 1) * itemsPerPage;
    return filteredBookings.slice(firstItemIndex, firstItemIndex + itemsPerPage);
  }, [filteredBookings, currentPage]);

  // التنقل بين الصفحات
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // عندما يتغير عدد النتائج المصفاة، قم بالعودة إلى الصفحة الأولى
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);
  
  // تحديث حالة الخدمة
  const handleStatusUpdate = async () => {
    if (!selectedService || !selectedStatus) return;
    
    try {
      await updateServiceBookingStatus(
        selectedService.orderId,
        selectedService.serviceBooking.id,
        selectedStatus,
        statusUpdateNote
      );
      
      setIsStatusDialogOpen(false);
      setStatusUpdateNote('');
      setSelectedStatus(null);
      await fetchServiceBookings();
    } catch (error) {
      console.error('Error updating service status:', error);
      // يمكن إضافة رسالة خطأ هنا
    }
  };
  
  // تعيين موظف للخدمة
  const handleAssignEmployee = async () => {
    if (!selectedService || !selectedEmployeeId) return;
    
    try {
      await assignServiceBooking(
        selectedService.orderId,
        selectedService.serviceBooking.id,
        selectedEmployeeId
      );
      
      setIsAssignDialogOpen(false);
      setSelectedEmployeeId(null);
      await fetchServiceBookings();
    } catch (error) {
      console.error('Error assigning employee:', error);
      // يمكن إضافة رسالة خطأ هنا
    }
  };
  
  // الحصول على اسم الموظف بناءً على المعرف
  const getEmployeeName = (employeeId?: string) => {
    if (!employeeId) return 'غير معين';
    const employee = users.find(user => user.id === employeeId);
    return employee ? employee.name : 'غير معروف';
  };
  
  // الحصول على الموظفين الذين يمكن تعيينهم للخدمة
  const getAssignableEmployees = () => {
    return users.filter(user => 
      user.role === 'employee' || user.role === 'admin' || user.role === 'owner'
    );
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">إدارة ومتابعة الخدمات</h1>
      
      {/* أدوات التصفية والبحث */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="text"
            placeholder="بحث عن خدمة، عميل، ملاحظات..."
            className="pl-10 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select
          value={statusFilter}
          onValueChange={setStatusFilter}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="كل الحالات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="pending">قيد الانتظار</SelectItem>
            <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
            <SelectItem value="completed">مكتملة</SelectItem>
            <SelectItem value="cancelled">ملغاة</SelectItem>
            <SelectItem value="delayed">مؤجلة</SelectItem>
          </SelectContent>
        </Select>
        
        <Button 
          onClick={fetchServiceBookings}
          variant="outline"
        >
          تحديث
        </Button>
      </div>
      
      {/* عرض الخدمات */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الخدمات</CardTitle>
          <CardDescription>
            عرض وإدارة الخدمات المحجوزة والمقدمة للعملاء
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || orgLoading ? (
            <div className="flex justify-center items-center py-12">
              <Clock className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-lg font-medium">جاري تحميل طلبات الخدمات...</span>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-8">لا توجد خدمات للعرض</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الخدمة</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>كود التتبع</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead>التاريخ المجدول</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>المسؤول</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentBookings.map((booking) => (
                    <TableRow key={booking.serviceBooking.id}>
                      <TableCell className="font-medium">
                        {booking.serviceBooking.serviceName}
                        {booking.serviceBooking.notes && (
                          <div className="text-xs text-gray-500 mt-1">
                            {booking.serviceBooking.notes.length > 30
                              ? `${booking.serviceBooking.notes.substring(0, 30)}...`
                              : booking.serviceBooking.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {booking.serviceBooking.customer_name || 'زبون غير مسجل'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {booking.serviceBooking.public_tracking_code || booking.serviceBooking.id.substring(0, 13)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(booking.serviceBooking.price)}
                      </TableCell>
                      <TableCell>
                        {booking.serviceBooking.scheduledDate
                          ? formatDate(booking.serviceBooking.scheduledDate)
                          : 'غير محدد'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${statusConfig[booking.serviceBooking.status].color} flex items-center`}
                        >
                          {statusConfig[booking.serviceBooking.status].icon}
                          {statusConfig[booking.serviceBooking.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getEmployeeName(booking.serviceBooking.assignedTo)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedService(booking);
                              setIsStatusDialogOpen(true);
                            }}
                          >
                            تحديث الحالة
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedService(booking);
                              setIsAssignDialogOpen(true);
                            }}
                          >
                            تعيين مسؤول
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedService(booking);
                              setIsHistoryDialogOpen(true);
                            }}
                          >
                            سجل التحديثات
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {filteredBookings.length > 0 && (
          <CardFooter className="flex items-center justify-between px-6 py-4">
            <div className="text-sm text-muted-foreground">
              عرض {Math.min(currentBookings.length, itemsPerPage)} من {filteredBookings.length} خدمة
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">الصفحة السابقة</span>
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  
                  // إذا كان عدد الصفحات أكبر من 5، نعرض الصفحات بشكل ديناميكي
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1; // الصفحات الأولى
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i; // الصفحات الأخيرة
                  } else {
                    pageNum = currentPage - 2 + i; // الصفحات الوسطى
                  }
                  
                  return (
                    <Button
                      key={i}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => goToPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                
                {/* إذا كان عدد الصفحات أكبر من 5، نعرض نقاط للصفحات المخفية */}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="mx-1">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => goToPage(totalPages)}
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">الصفحة التالية</span>
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
      
      {/* نافذة تحديث الحالة */}
      <Dialog open={isStatusDialogOpen} onOpenChange={(open) => {
        setIsStatusDialogOpen(open);
        if (!open) {
          setSelectedStatus(null);
          setStatusUpdateNote('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحديث حالة الخدمة</DialogTitle>
            <DialogDescription>
              حدد الحالة الجديدة للخدمة: {selectedService?.serviceBooking.serviceName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              {['pending', 'in_progress', 'completed', 'cancelled', 'delayed'].map((status) => (
                <Button
                  key={status}
                  variant={selectedStatus === status ? 'default' : (selectedService?.serviceBooking.status === status ? 'default' : 'outline')}
                  className={`flex items-center gap-2 ${selectedService?.serviceBooking.status === status ? 'opacity-75' : ''}`}
                  onClick={() => setSelectedStatus(status as ServiceStatus)}
                  disabled={selectedService?.serviceBooking.status === status}
                >
                  {statusConfig[status as ServiceStatus].icon}
                  {statusConfig[status as ServiceStatus].label}
                </Button>
              ))}
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">
                ملاحظات التحديث (اختياري)
              </label>
              <Textarea
                placeholder="أضف ملاحظات حول سبب تغيير الحالة..."
                value={statusUpdateNote}
                onChange={(e) => setStatusUpdateNote(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleStatusUpdate}
              disabled={!selectedStatus || selectedStatus === selectedService?.serviceBooking.status}
            >
              تأكيد التحديث
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* نافذة تعيين الموظف */}
      <Dialog open={isAssignDialogOpen} onOpenChange={(open) => {
        setIsAssignDialogOpen(open);
        if (!open) {
          setSelectedEmployeeId(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعيين مسؤول عن الخدمة</DialogTitle>
            <DialogDescription>
              اختر الموظف المسؤول عن تنفيذ الخدمة: {selectedService?.serviceBooking.serviceName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              {getAssignableEmployees().map((employee) => (
                <Button
                  key={employee.id}
                  variant={selectedEmployeeId === employee.id ? 'default' : (selectedService?.serviceBooking.assignedTo === employee.id ? 'default' : 'outline')}
                  className={`justify-start ${selectedService?.serviceBooking.assignedTo === employee.id ? 'opacity-75' : ''}`}
                  onClick={() => setSelectedEmployeeId(employee.id)}
                  disabled={selectedService?.serviceBooking.assignedTo === employee.id}
                >
                  {employee.name}
                  {employee.role === 'admin' && <Badge className="mr-2">مدير</Badge>}
                  {employee.role === 'owner' && <Badge className="mr-2">مالك</Badge>}
                </Button>
              ))}
            </div>
          </div>
          
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleAssignEmployee}
              disabled={!selectedEmployeeId || selectedEmployeeId === selectedService?.serviceBooking.assignedTo}
            >
              تأكيد التعيين
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* نافذة سجل التحديثات */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>سجل تحديثات الخدمة</DialogTitle>
            <DialogDescription>
              تاريخ التحديثات والتغييرات التي تمت على الخدمة: {selectedService?.serviceBooking.serviceName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {selectedService?.serviceBooking.progress && selectedService.serviceBooking.progress.length > 0 ? (
              <div className="space-y-4">
                {/* سجل التقدم مرتب حسب الأحدث */}
                {selectedService.serviceBooking.progress.map((progress, index) => (
                  <div key={progress.id} className="border-b pb-3 last:border-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`${statusConfig[progress.status].color} flex items-center`}
                        >
                          {statusConfig[progress.status].icon}
                          {statusConfig[progress.status].label}
                        </Badge>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(progress.timestamp)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        بواسطة: {users.find(user => user.id === progress.createdBy)?.name || 
                          (progress.createdBy === '00000000-0000-0000-0000-000000000000' ? 'النظام' : 'غير معروف')}
                      </div>
                    </div>
                    {progress.note && (
                      <div className="mt-2 text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md border border-gray-100 dark:border-gray-700">
                        <p className="font-medium mb-1 text-gray-700 dark:text-gray-300">ملاحظات:</p>
                        <p>{progress.note}</p>
                      </div>
                    )}
                    {index === 0 && selectedService.serviceBooking.assignedTo && (
                      <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                        <span className="font-medium">المسؤول عن التنفيذ: </span>
                        {getEmployeeName(selectedService.serviceBooking.assignedTo)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                لا يوجد سجل تحديثات لهذه الخدمة
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setIsHistoryDialogOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceTracking; 