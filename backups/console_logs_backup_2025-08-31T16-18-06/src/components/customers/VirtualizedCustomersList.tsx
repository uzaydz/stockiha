import React, { memo, useState, useCallback, useMemo } from 'react';
import { Customer } from '@/types/customer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
 } from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal, 
  Edit, 
  Trash, 
  UserX, 
  Mail, 
  Phone, 
  Calendar,
  User
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useVirtualization } from '@/hooks/useVirtualization';
import CustomerDetailsDialog from './CustomerDetailsDialog';
import EditCustomerDialog from './EditCustomerDialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { deleteCustomer } from '@/lib/api/customers';
import { useOptimizedClickHandler } from "@/lib/performance-utils";

interface VirtualizedCustomersListProps {
  customers: Customer[];
  isLoading: boolean;
  hasEditPermission?: boolean;
  hasDeletePermission?: boolean;
  containerHeight?: number;
}

const ITEM_HEIGHT = 180; // Height of each customer card
const DEFAULT_CONTAINER_HEIGHT = 600;

const CustomerItem = memo(({ 
  customer, 
  style, 
  hasEditPermission, 
  hasDeletePermission,
  onViewDetails,
  onEdit,
  onDelete,
  onSendEmail,
  onMakeCall
}: {
  customer: Customer;
  style: React.CSSProperties;
  hasEditPermission: boolean;
  hasDeletePermission: boolean;
  onViewDetails: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onSendEmail: (email: string) => void;
  onMakeCall: (phone: string) => void;
}) => (
  <div style={style} className="absolute inset-x-0 px-1">
    <Card className="hover:shadow-md transition-shadow mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base truncate">{customer.name}</h3>
              <div className="flex items-center mt-1">
                <Badge variant="outline" className="text-xs">
                  عميل
                </Badge>
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>خيارات</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onViewDetails(customer)}>
                <User className="h-4 w-4 ml-2" />
                عرض التفاصيل
              </DropdownMenuItem>
              
              {hasEditPermission && (
                <DropdownMenuItem onClick={() => onEdit(customer)}>
                  <Edit className="h-4 w-4 ml-2" />
                  تعديل
                </DropdownMenuItem>
              )}
              
              {hasDeletePermission && (
                <DropdownMenuItem 
                  onClick={() => onDelete(customer)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash className="h-4 w-4 ml-2" />
                  حذف
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Mail className="h-4 w-4 ml-2 flex-shrink-0" />
            <span className="truncate" dir="ltr">{customer.email}</span>
          </div>
          
          {customer.phone && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Phone className="h-4 w-4 ml-2 flex-shrink-0" />
              <span dir="ltr">{customer.phone}</span>
            </div>
          )}
          
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 ml-2 flex-shrink-0" />
            <span>انضم في {formatDate(customer.created_at)}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <div className="flex space-x-2 space-x-reverse">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSendEmail(customer.email)}
              className="flex items-center space-x-1 space-x-reverse"
            >
              <Mail className="h-3 w-3" />
              <span className="text-xs">بريد</span>
            </Button>
            
            {customer.phone && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMakeCall(customer.phone!)}
                className="flex items-center space-x-1 space-x-reverse"
              >
                <Phone className="h-3 w-3" />
                <span className="text-xs">اتصال</span>
              </Button>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetails(customer)}
            className="text-xs"
          >
            عرض المزيد
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
));

CustomerItem.displayName = 'CustomerItem';

const VirtualizedCustomersList = memo(({ 
  customers, 
  isLoading,
  hasEditPermission = false,
  hasDeletePermission = false,
  containerHeight = DEFAULT_CONTAINER_HEIGHT
}: VirtualizedCustomersListProps) => {
  const { toast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { 
    virtualItems, 
    totalHeight, 
    containerProps, 
    viewportProps 
  } = useVirtualization(customers, {
    itemHeight: ITEM_HEIGHT,
    containerHeight,
    overscan: 3
  });

  const handleViewDetails = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsOpen(true);
  }, []);
  
  const handleEditCustomer = useCallback((customer: Customer) => {
    if (!hasEditPermission) {
      toast({
        title: 'غير مصرح',
        description: 'ليس لديك صلاحية لتعديل بيانات العملاء',
        variant: 'destructive'
      });
      return;
    }
    
    setSelectedCustomer(customer);
    setIsEditOpen(true);
  }, [hasEditPermission, toast]);
  
  const handleDeleteCustomer = useCallback((customer: Customer) => {
    if (!hasDeletePermission) {
      toast({
        title: 'غير مصرح',
        description: 'ليس لديك صلاحية لحذف العملاء',
        variant: 'destructive'
      });
      return;
    }
    
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
  }, [hasDeletePermission, toast]);
  
  const confirmDeleteCustomer = useCallback(async () => {
    if (!selectedCustomer) return;
    
    try {
      await deleteCustomer(selectedCustomer.id);
      toast({
        title: 'تم حذف العميل',
        description: `تم حذف ${selectedCustomer.name} بنجاح`,
      });
    } catch (error) {
      toast({
        title: 'حدث خطأ',
        description: 'لم نتمكن من حذف العميل. الرجاء المحاولة مرة أخرى.',
        variant: 'destructive'
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  }, [selectedCustomer, toast]);
  
  const sendEmail = useCallback((email: string) => {
    window.location.href = `mailto:${email}`;
  }, []);

  const makeCall = useCallback((phone: string) => {
    window.location.href = `tel:${phone}`;
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (customers.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <UserX className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">لا يوجد عملاء</h3>
          <p className="text-muted-foreground text-sm">لم يتم العثور على عملاء مطابقين لمعايير البحث</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="md:hidden">
      <div {...containerProps}>
        <div {...viewportProps}>
          {virtualItems.map(({ index, start, item }) => (
            <CustomerItem
              key={index}
              customer={item}
              style={{
                top: start,
                height: ITEM_HEIGHT,
              }}
              hasEditPermission={hasEditPermission}
              hasDeletePermission={hasDeletePermission}
              onViewDetails={handleViewDetails}
              onEdit={handleEditCustomer}
              onDelete={handleDeleteCustomer}
              onSendEmail={sendEmail}
              onMakeCall={makeCall}
            />
          ))}
        </div>
      </div>
      
      {selectedCustomer && (
        <CustomerDetailsDialog
          customer={selectedCustomer}
          open={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
        />
      )}
      
      {selectedCustomer && hasEditPermission && (
        <EditCustomerDialog
          customer={selectedCustomer}
          open={isEditOpen}
          onClose={() => setIsEditOpen(false)}
        />
      )}
      
      {hasDeletePermission && (
        <ConfirmDialog
          open={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={confirmDeleteCustomer}
          title="حذف العميل"
          description={`هل أنت متأكد أنك تريد حذف العميل ${selectedCustomer?.name}؟ هذا الإجراء لا يمكن التراجع عنه.`}
          confirmText="حذف"
          cancelText="إلغاء"
        />
      )}
    </div>
  );
});

VirtualizedCustomersList.displayName = 'VirtualizedCustomersList';

export default VirtualizedCustomersList;
