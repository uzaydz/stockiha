import React, { useState, memo, useCallback } from 'react';
import { Customer } from '@/types/customer';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash, UserX, Mail } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import CustomerDetailsDialog from './CustomerDetailsDialog';
import EditCustomerDialog from './EditCustomerDialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { deleteCustomer } from '@/lib/api/customers';

interface CustomersListProps {
  customers: Customer[];
  isLoading: boolean;
  hasEditPermission?: boolean;
  hasDeletePermission?: boolean;
}

const CustomersList = memo(({ 
  customers, 
  isLoading,
  hasEditPermission = false,
  hasDeletePermission = false
}: CustomersListProps) => {
  const { toast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
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
    
    if (!hasDeletePermission) {
      toast({
        title: 'غير مصرح',
        description: 'ليس لديك صلاحية لحذف العملاء',
        variant: 'destructive'
      });
      return;
    }
    
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
  }, [selectedCustomer, hasDeletePermission, toast]);
  
  const sendEmail = useCallback((email: string) => {
    window.location.href = `mailto:${email}`;
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2">جاري تحميل العملاء...</p>
      </div>
    );
  }
  
  if (customers.length === 0) {
    return (
      <div className="bg-muted/20 rounded-lg p-8 text-center">
        <UserX className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
        <h3 className="font-semibold text-lg">لا يوجد عملاء</h3>
        <p className="text-muted-foreground mt-1">لم يتم العثور على عملاء مطابقين لمعايير البحث</p>
      </div>
    );
  }

  return (
    <div className="hidden md:block">
      <div className="overflow-x-auto">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">الاسم</TableHead>
            <TableHead>البريد الإلكتروني</TableHead>
            <TableHead>رقم الهاتف</TableHead>
            <TableHead>تاريخ التسجيل</TableHead>
            <TableHead className="text-left">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell className="font-medium">{customer.name}</TableCell>
              <TableCell>{customer.email}</TableCell>
              <TableCell>{customer.phone || 'غير متوفر'}</TableCell>
              <TableCell>{formatDate(customer.created_at)}</TableCell>
              <TableCell className="text-left">
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => sendEmail(customer.email)}
                    title="إرسال بريد إلكتروني"
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>خيارات</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleViewDetails(customer)}>
                        عرض التفاصيل
                      </DropdownMenuItem>
                      
                      {hasEditPermission && (
                        <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                          <Edit className="h-4 w-4 ml-2" />
                          تعديل
                        </DropdownMenuItem>
                      )}
                      
                      {hasDeletePermission && (
                        <DropdownMenuItem 
                          onClick={() => handleDeleteCustomer(customer)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash className="h-4 w-4 ml-2" />
                          حذف
                        </DropdownMenuItem>
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

CustomersList.displayName = 'CustomersList';

export default CustomersList;
