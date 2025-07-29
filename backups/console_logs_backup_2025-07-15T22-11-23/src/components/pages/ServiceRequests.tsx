import React, { useState, useEffect, useMemo } from 'react';
import { ServiceStatus, ServiceBooking as ServiceBookingType } from '@/types';
import { getServiceRequests } from '@/lib/api/services';
import { useTenant } from '@/context/TenantContext';
import { useToast } from '@/components/ui/use-toast';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, ChevronLeft, ChevronRight, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';

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

const ServiceRequests = () => {
  const { toast } = useToast();
  const { currentOrganization, isLoading: orgLoading } = useTenant();
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // جلب طلبات الخدمات
  const fetchServiceRequests = async () => {
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

      // جلب طلبات الخدمات من قاعدة البيانات
      const data = await getServiceRequests(currentOrganization.id);

      setServiceRequests(data);
      setFilteredRequests(data);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'حدث خطأ أثناء جلب طلبات الخدمات';
      
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء جلب طلبات الخدمات',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // التأثير الأولي لجلب طلبات الخدمات
  useEffect(() => {
    if (currentOrganization) {
      fetchServiceRequests();
    }
  }, [currentOrganization]);

  // تطبيق الفلترة عند تغيير معايير البحث أو الفلترة
  useEffect(() => {
    let result = [...serviceRequests];

    // تطبيق البحث
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        request =>
          request.service_name.toLowerCase().includes(query) ||
          (request.customer_name && request.customer_name.toLowerCase().includes(query)) ||
          (request.notes && request.notes.toLowerCase().includes(query))
      );
    }

    // تطبيق فلتر الحالة
    if (statusFilter !== 'all') {
      result = result.filter(request => request.status === statusFilter);
    }

    setFilteredRequests(result);
    setCurrentPage(1); // العودة إلى الصفحة الأولى عند تغيير الفلترة
  }, [serviceRequests, searchQuery, statusFilter]);

  // حساب عدد الصفحات
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  
  // طلبات الخدمات المعروضة في الصفحة الحالية
  const currentRequests = useMemo(() => {
    const firstItemIndex = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(firstItemIndex, firstItemIndex + itemsPerPage);
  }, [filteredRequests, currentPage]);

  // التنقل بين الصفحات
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="space-y-6">
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
          onClick={fetchServiceRequests} 
          variant="outline"
        >
          تحديث
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>قائمة طلبات الخدمات</CardTitle>
          <CardDescription>
            عرض وإدارة الخدمات المحجوزة والمقدمة للعملاء
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || orgLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-lg font-medium">جاري تحميل طلبات الخدمات...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.service_name}
                        {request.notes && (
                          <div className="text-xs text-gray-500 mt-1">
                            {request.notes.length > 30
                              ? `${request.notes.substring(0, 30)}...`
                              : request.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {request.customer_name || 'زبون غير مسجل'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {request.public_tracking_code || request.id.substring(0, 13)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(request.price)}
                      </TableCell>
                      <TableCell>
                        {request.scheduled_date
                          ? formatDate(new Date(request.scheduled_date))
                          : 'غير محدد'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${statusConfig[request.status as keyof typeof statusConfig].color} flex items-center`}
                        >
                          {statusConfig[request.status as keyof typeof statusConfig].icon}
                          {statusConfig[request.status as keyof typeof statusConfig].label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {filteredRequests.length > 0 && (
          <CardFooter className="flex items-center justify-between px-6 py-4">
            <div className="text-sm text-muted-foreground">
              عرض {Math.min(currentRequests.length, itemsPerPage)} من {filteredRequests.length} طلب خدمة
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
                  
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
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
    </div>
  );
};

export default ServiceRequests;
