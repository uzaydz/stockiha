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
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MoreHorizontal,
  Edit,
  Trash,
  UserX,
  Mail,
  Phone,
  Calendar,
  Eye,
  User,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import CustomerDetailsDialog from './CustomerDetailsDialog';
import EditCustomerDialog from './EditCustomerDialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { deleteCustomer } from '@/lib/api/customers';
import { cn } from '@/lib/utils';

interface CustomersListProps {
  customers: Customer[];
  isLoading: boolean;
  hasEditPermission?: boolean;
  hasDeletePermission?: boolean;
}

// Helper component for copying text


const CopyButton = ({ text, label, toast }: { text: string; label: string; toast: ReturnType<typeof useToast>['toast'] }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ description: `تم نسخ ${label} بنجاح`, duration: 2000 });
    setTimeout(() => setCopied(false), 2000);
  }, [text, label, toast]);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-5 w-5 opacity-0 group-hover/copy:opacity-100 transition-opacity"
      onClick={handleCopy}
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </Button>
  );
};

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

    try {
      await deleteCustomer(selectedCustomer.id);
      toast({
        title: 'تم الحذف',
        description: `تم حذف العميل ${selectedCustomer.name} بنجاح`,
        className: "bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800"
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل حذف العميل، يرجى المحاولة لاحقاً',
        variant: 'destructive'
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  }, [selectedCustomer, toast]);

  const sendEmail = useCallback((email: string) => {
    window.location.href = `mailto:${email}`;
  }, []);

  const isPlaceholderEmail = (email: string | null | undefined) => {
    if (!email) return true;
    return email.includes('@example.com') || email.startsWith('customer_');
  };

  const isNewCustomer = (createdAt: string) => {
    const customerDate = new Date(createdAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return customerDate > sevenDaysAgo;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="w-full p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 w-full bg-muted/20 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-lg bg-muted/5 mx-4">
        <div className="bg-muted/20 p-4 rounded-full mb-4">
          <UserX className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">لا يوجد عملاء</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          لم يتم العثور على أي عملاء في قاعدة البيانات أو لا توجد نتائج تطابق بحثك.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[300px]">العميل</TableHead>
                <TableHead>البريد الإلكتروني</TableHead>
                <TableHead>رقم الهاتف</TableHead>
                <TableHead>تاريخ التسجيل</TableHead>
                <TableHead className="text-left w-[100px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="group hover:bg-muted/30 transition-colors cursor-default"
                  onClick={() => handleViewDetails(customer)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${customer.name}`} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(customer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {customer.name}
                          </span>
                          {isNewCustomer(customer.created_at) && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                              جديد
                            </Badge>
                          )}
                          {customer._synced === false && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-orange-50 text-orange-600 border-orange-200">
                              غير متزامن
                            </Badge>
                          )}
                          {customer._syncStatus === 'error' && (
                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                              خطأ
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">ID: #{customer.id.toString().slice(-4)}</span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="relative group/copy-email">
                    {!isPlaceholderEmail(customer.email) ? (
                      <div className="flex items-center gap-2">
                        <span dir="ltr" className="truncate max-w-[200px] text-sm font-medium text-foreground">
                          {customer.email}
                        </span>
                        <CopyButton text={customer.email!} label="البريد" toast={toast} />
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs">
                        بدون بريد
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="relative group/copy-phone">
                    {customer.phone ? (
                      <div className="flex items-center gap-2">
                        <span dir="ltr" className="truncate max-w-[200px] text-sm font-medium text-foreground">
                          {customer.phone}
                        </span>
                        <CopyButton text={customer.phone} label="الهاتف" toast={toast} />
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm text-foreground">{formatDate(customer.created_at)}</span>
                      {/* Optional: Add relative time like "2 days ago" here */}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {/* Quick Action: Email */}                      {!isPlaceholderEmail(customer.email) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-blue-600 hidden group-hover:inline-flex"
                              onClick={() => sendEmail(customer.email!)}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>مراسلة</TooltipContent>
                        </Tooltip>
                      )}

                      {/* Dropdown Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px]">
                          <DropdownMenuLabel>خيارات العميل</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewDetails(customer)}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            عرض التفاصيل
                          </DropdownMenuItem>

                          {hasEditPermission && (
                            <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                              <Edit className="mr-2 h-4 w-4" />
                              تعديل البيانات
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {hasDeletePermission && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteCustomer(customer)}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              حذف العميل
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
        </TooltipProvider>      </div>

      {/* Dialogs - Kept as is, assuming they are correctly implemented */}
      {selectedCustomer && (
        <>
          <CustomerDetailsDialog
            customer={selectedCustomer}
            open={isDetailsOpen}
            onClose={() => setIsDetailsOpen(false)}
          />
          {hasEditPermission && (
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
              description={`هل أنت متأكد أنك تريد حذف العميل ${selectedCustomer?.name}؟ سيتم حذف جميع البيانات المرتبطة به نهائياً.`}
              confirmText="نعم، حذف العميل"
              cancelText="إلغاء"
              variant="destructive"
            />
          )}
        </>
      )}
    </>
  );
});

CustomersList.displayName = 'CustomersList';

export default CustomersList;