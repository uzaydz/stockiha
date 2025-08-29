import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Edit, 
  Trash2, 
  MoreVertical,
  Clock,
  Calendar,
  Wrench,
  ToggleRight,
  ToggleLeft,
  RefreshCw,
  PlusCircle
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import type { Service } from '@/lib/api/services';
import { deleteService, toggleServiceStatus } from '@/lib/api/services';
import EditServiceDialog from './EditServiceDialog';
import ServiceDetailsDialog from './ServiceDetailsDialog';
import BookingDialog from './BookingDialog';
import { formatPrice } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { hasPermissions } from '@/lib/api/userPermissionsUnified';
import { useOptimizedClickHandler } from "@/lib/performance-utils";

interface ServicesListProps {
  services: Service[];
  onRefreshServices: () => Promise<void>;
}

const ServicesList = ({ services, onRefreshServices }: ServicesListProps) => {
  const { user } = useAuth();
  const [viewService, setViewService] = useState<Service | null>(null);
  const [editService, setEditService] = useState<Service | null>(null);
  const [bookService, setBookService] = useState<Service | null>(null);
  const [deleteConfirmService, setDeleteConfirmService] = useState<Service | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [permissions, setPermissions] = useState({
    canEdit: false,
    canDelete: false,
    canTrack: false
  });

  // تحقق من الصلاحيات عند تحميل المكون
  useEffect(() => {
    const checkPermissions = async () => {
      if (user) {
        try {
          // استخدام الدالة الموحدة للتحقق من عدة صلاحيات دفعة واحدة
          const permissionsResult = await hasPermissions(['editServices', 'deleteServices', 'trackServices'], user.id);
          
          setPermissions({
            canEdit: permissionsResult.editServices || false,
            canDelete: permissionsResult.deleteServices || false,
            canTrack: permissionsResult.trackServices || false
          });
        } catch (error) {
        }
      }
    };
    
    checkPermissions();
  }, [user]);

  const handleView = (service: Service) => {
    setViewService(service);
    setIsViewOpen(true);
  };

  const handleEdit = (service: Service) => {
    if (!permissions.canEdit) {
      toast.error('ليس لديك صلاحية تعديل الخدمات');
      return;
    }
    setEditService(service);
    setIsEditOpen(true);
  };

  const handleBook = (service: Service) => {
    if (!permissions.canTrack) {
      toast.error('ليس لديك صلاحية متابعة الخدمات');
      return;
    }
    setBookService(service);
    setIsBookOpen(true);
  };

  const handleDelete = (service: Service) => {
    if (!permissions.canDelete) {
      toast.error('ليس لديك صلاحية حذف الخدمات');
      return;
    }
    setDeleteConfirmService(service);
    setIsDeleteOpen(true);
  };

  const handleToggleActive = async (service: Service) => {
    if (!permissions.canEdit) {
      toast.error('ليس لديك صلاحية تعديل الخدمات');
      return;
    }
    
    try {
      setIsLoading(true);
      await toggleServiceStatus(service.id, !service.is_available);
      await onRefreshServices();
      toast.success(service.is_available ? 'تم تعطيل الخدمة بنجاح' : 'تم تفعيل الخدمة بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث حالة الخدمة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmService) return;

    setIsLoading(true);
    try {
      await deleteService(deleteConfirmService.id);
      toast.success('تم حذف الخدمة بنجاح');
      setIsDeleteOpen(false);
      onRefreshServices();
    } catch (error) {
      toast.error('حدث خطأ أثناء حذف الخدمة');
    } finally {
      setIsLoading(false);
    }
  };

  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // استخراج الفئات الفريدة للخدمات
  const uniqueCategories = Array.from(new Set(services.map(service => service.category)))
    .filter(Boolean) // إزالة القيم الفارغة
    .sort();

  if (!services || services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">لا توجد خدمات</h3>
        <p className="text-muted-foreground mt-1 mb-4">
          لم يتم إضافة أي خدمات بعد أو لا توجد خدمات تطابق معايير البحث.
        </p>
        {permissions.canEdit && (
          <Button onClick={() => toast.info('يمكنك إضافة خدمة جديدة من خلال زر "إضافة خدمة" في الأعلى')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            أضف أول خدمة
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-background rounded-lg border shadow-sm overflow-hidden">
        <div className="flex justify-end p-2">
          <div className="flex space-x-1 rounded-lg bg-muted p-1">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs"
              onClick={() => setViewMode('table')}
            >
              جدول
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs"
              onClick={() => setViewMode('grid')}
            >
              شبكة
            </Button>
          </div>
        </div>
        
        {viewMode === 'table' ? (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الخدمة</TableHead>
                  <TableHead>السعر</TableHead>
                  <TableHead>المدة</TableHead>
                  <TableHead>الفئة</TableHead>
                  <TableHead>تاريخ الإضافة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-left">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[250px]">
                        {service.description || 'لا يوجد وصف'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-lg font-bold text-primary">
                        {service.is_price_dynamic ? 'سعر مفتوح' : formatPrice(service.price)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{service.estimated_time}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {service.category ? (
                        <Badge variant="outline">{service.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">غير مصنف</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(service.created_at)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="default"
                        className={service.is_available 
                          ? "bg-green-100 text-green-700 hover:bg-green-100" 
                          : "bg-gray-100 text-gray-700 hover:bg-gray-100"}
                      >
                        {service.is_available ? 'متاح' : 'غير متاح'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(service)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">عرض</span>
                        </Button>
                        
                        {permissions.canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(service)}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">تعديل</span>
                          </Button>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">المزيد</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(service)}>
                              <Eye className="ml-2 h-4 w-4" />
                              عرض التفاصيل
                            </DropdownMenuItem>
                            
                            {permissions.canEdit && (
                              <DropdownMenuItem onClick={() => handleEdit(service)}>
                                <Edit className="ml-2 h-4 w-4" />
                                تعديل الخدمة
                              </DropdownMenuItem>
                            )}
                            
                            {permissions.canTrack && (
                              <DropdownMenuItem onClick={() => handleBook(service)}>
                                <Calendar className="ml-2 h-4 w-4" />
                                حجز موعد
                              </DropdownMenuItem>
                            )}
                            
                            {permissions.canEdit && (
                              <DropdownMenuItem onClick={() => handleToggleActive(service)}>
                                {service.is_available ? (
                                  <>
                                    <ToggleLeft className="ml-2 h-4 w-4" />
                                    تعطيل الخدمة
                                  </>
                                ) : (
                                  <>
                                    <ToggleRight className="ml-2 h-4 w-4" />
                                    تفعيل الخدمة
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                            
                            {permissions.canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDelete(service)}
                                >
                                  <Trash2 className="ml-2 h-4 w-4" />
                                  حذف الخدمة
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {services.map((service) => (
              <Card key={service.id} className="h-full">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-center line-clamp-1" title={service.name}>
                    {service.name}
                  </CardTitle>
                  <CardDescription className="text-center line-clamp-2">
                    {service.description || 'لا يوجد وصف'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 pb-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="text-lg font-bold text-primary">
                      {service.is_price_dynamic ? 'سعر مفتوح' : formatPrice(service.price)}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm">
                        <div className="font-medium">{service.estimated_time}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    {service.category ? (
                      <Badge variant="outline">{service.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">بدون فئة</span>
                    )}
                    
                    <Badge 
                      variant="default"
                      className={service.is_available 
                        ? "bg-green-100 text-green-700 hover:bg-green-100" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-100"}
                    >
                      {service.is_available ? 'متاح' : 'غير متاح'}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-muted-foreground text-center">
                    تم الإضافة: {formatDate(service.created_at)}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-2 flex justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleView(service)}>
                    <Eye className="ml-1 h-3 w-3" />
                    عرض
                  </Button>
                  {permissions.canEdit && (
                    <Button variant="outline" size="sm" onClick={() => handleEdit(service)}>
                      <Edit className="ml-1 h-3 w-3" />
                      تعديل
                    </Button>
                  )}
                  {permissions.canTrack && (
                    <Button variant="outline" size="sm" onClick={() => handleBook(service)}>
                      <Calendar className="ml-1 h-3 w-3" />
                      حجز
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Service Details Dialog */}
      {viewService && (
        <ServiceDetailsDialog
          service={viewService}
          open={isViewOpen}
          onOpenChange={setIsViewOpen}
          onEdit={handleEdit}
          onBook={handleBook}
        />
      )}

      {/* Edit Service Dialog */}
      {editService && permissions.canEdit && (
        <EditServiceDialog
          service={editService}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onServiceUpdated={onRefreshServices}
          categories={uniqueCategories}
        />
      )}

      {/* Booking Dialog */}
      {bookService && permissions.canTrack && (
        <BookingDialog
          service={bookService}
          open={isBookOpen}
          onOpenChange={setIsBookOpen}
          onBookingCreated={onRefreshServices}
        />
      )}

      {/* Delete Service Confirmation */}
      {deleteConfirmService && permissions.canDelete && (
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من حذف هذه الخدمة؟</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف الخدمة "{deleteConfirmService.name}" نهائياً من النظام.
                هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={isLoading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الحذف...
                  </>
                ) : (
                  "حذف"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default ServicesList;
