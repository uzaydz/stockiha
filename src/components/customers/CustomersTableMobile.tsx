import React, { memo, useState, useCallback } from 'react';
import { Customer } from '@/types/customer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
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
import CustomerDetailsDialog from './CustomerDetailsDialog';
import EditCustomerDialog from './EditCustomerDialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { deleteCustomer } from '@/lib/api/customers';

interface CustomersTableMobileProps {
  customers: Customer[];
  isLoading: boolean;
  hasEditPermission?: boolean;
  hasDeletePermission?: boolean;
}

const CustomersTableMobile = memo(({
  customers,
  isLoading,
  hasEditPermission = false,
  hasDeletePermission = false
}: CustomersTableMobileProps) => {
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

  const makeCall = useCallback((phone: string) => {
    window.location.href = `tel:${phone}`;
  }, []);

  // Helper function to check if customer is new (registered in last 7 days)
  const isNewCustomer = (createdAt: string) => {
    const customerDate = new Date(createdAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return customerDate > sevenDaysAgo;
  };

  // Helper function to check if email is a placeholder
  const isPlaceholderEmail = (email: string | null | undefined) => {
    if (!email) return true;
    return email.includes('@example.com') || email.startsWith('customer_');
  };

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
    <div className="space-y-3">
      {customers.map((customer, index) => (
        <Card
          key={customer.id}
          className={`
            overflow-hidden transition-all duration-300
            hover:shadow-lg hover:scale-[1.02]
            border-l-4
            ${index % 2 === 0 ? 'border-l-primary/60' : 'border-l-blue-500/60'}
            bg-gradient-to-br from-background to-muted/20
          `}
        >
          <CardContent className="p-0">
            {/* Header Section with Gradient */}
            <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-4 border-b border-border/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 space-x-reverse flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center border-2 border-primary/30 shadow-sm">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base text-foreground truncate">{customer.name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {isNewCustomer(customer.created_at) && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 shadow-sm">
                          ✨ جديد
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        عميل
                      </Badge>
                      {customer._synced === false && (
                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200">
                          غير متزامن
                        </Badge>
                      )}
                      {customer._syncStatus === 'error' && (
                        <Badge variant="destructive" className="text-xs">
                          خطأ
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-primary/20 hover:text-primary shrink-0"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="font-semibold">خيارات العميل</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleViewDetails(customer)}
                      className="cursor-pointer"
                    >
                      <User className="h-4 w-4 ml-2 text-primary" />
                      <span>عرض التفاصيل الكاملة</span>
                    </DropdownMenuItem>

                    {hasEditPermission && (
                      <DropdownMenuItem
                        onClick={() => handleEditCustomer(customer)}
                        className="cursor-pointer"
                      >
                        <Edit className="h-4 w-4 ml-2 text-blue-600 dark:text-blue-400" />
                        <span>تعديل البيانات</span>
                      </DropdownMenuItem>
                    )}

                    {hasDeletePermission && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteCustomer(customer)}
                          className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer"
                        >
                          <Trash className="h-4 w-4 ml-2" />
                          <span>حذف العميل</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Info Section */}
            <div className="p-4 space-y-3">
              {!isPlaceholderEmail(customer.email) ? (
                <div className="flex items-center text-sm bg-muted/30 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 mr-2 shrink-0">
                    <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="truncate text-muted-foreground" dir="ltr">{customer.email}</span>
                </div>
              ) : (
                <div className="flex items-center text-sm bg-muted/20 p-2.5 rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-900/30 mr-2 shrink-0">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <span className="text-muted-foreground text-xs italic">بدون بريد إلكتروني</span>
                </div>
              )}

              {customer.phone ? (
                <div className="flex items-center text-sm bg-muted/30 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 mr-2 shrink-0">
                    <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    <span dir="ltr">{customer.phone}</span>
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center text-sm bg-muted/20 p-2.5 rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-900/30 mr-2 shrink-0">
                    <Phone className="h-4 w-4 text-gray-400" />
                  </div>
                  <span className="text-muted-foreground text-xs italic">رقم الهاتف غير متوفر</span>
                </div>
              )}

              <div className="flex items-center text-sm bg-muted/30 p-2.5 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 mr-2 shrink-0">
                  <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-muted-foreground">انضم في {formatDate(customer.created_at)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                {!isPlaceholderEmail(customer.email) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendEmail(customer.email)}
                    className="flex-1 flex items-center justify-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                  >
                    <Mail className="h-4 w-4" />
                    <span className="text-sm font-medium">إرسال بريد</span>
                  </Button>
                )}

                {customer.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => makeCall(customer.phone!)}
                    className="flex-1 flex items-center justify-center gap-2 hover:bg-green-50 dark:hover:bg-green-950/20 hover:text-green-600 dark:hover:text-green-400 hover:border-green-300 dark:hover:border-green-700 transition-all"
                  >
                    <Phone className="h-4 w-4" />
                    <span className="text-sm font-medium">اتصال</span>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewDetails(customer)}
                  className="hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <span className="text-sm font-medium">التفاصيل</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

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

CustomersTableMobile.displayName = 'CustomersTableMobile';

export default CustomersTableMobile;
