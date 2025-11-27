import { useEffect, useState } from 'react';
import { Customer } from '@/types/customer';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getCustomerOrdersCount, getCustomerOrdersTotal } from '@/lib/api/customers';
import { formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  ShoppingBag,
  DollarSign
} from 'lucide-react';

interface CustomerDetailsDialogProps {
  customer: Customer;
  open: boolean;
  onClose: () => void;
}

const CustomerDetailsDialog = ({ customer, open, onClose }: CustomerDetailsDialogProps) => {
  const [ordersCount, setOrdersCount] = useState<number>(0);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchCustomerStats = async () => {
      if (!customer) return;
      
      setIsLoading(true);
      try {
        const [countData, totalData] = await Promise.all([
          getCustomerOrdersCount(customer.id),
          getCustomerOrdersTotal(customer.id)
        ]);
        
        setOrdersCount(countData);
        setTotalSpent(totalData);
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };
    
    if (open) {
      fetchCustomerStats();
    }
  }, [customer, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>تفاصيل العميل</DialogTitle>
          <DialogDescription>
            عرض معلومات مفصلة عن العميل وإحصائيات المشتريات
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center flex-col mb-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <User className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">{customer.name}</h2>
                <p className="text-muted-foreground">
                  عميل منذ {formatDate(customer.created_at)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="flex items-center justify-center rounded-md bg-muted/40 py-2 text-sm">
                  <ShoppingBag className="h-4 w-4 ml-1" />
                  {isLoading ? (
                    <Skeleton className="h-4 w-10" />
                  ) : (
                    <span>{ordersCount}</span>
                  )}
                </div>
                <div className="flex items-center justify-center rounded-md bg-muted/40 py-2 text-sm">
                  <DollarSign className="h-4 w-4 ml-1" />
                  {isLoading ? (
                    <Skeleton className="h-4 w-16" />
                  ) : (
                    <span>{`${totalSpent.toLocaleString()} دج`}</span>
                  )}
                </div>
              </div>
              
              <div className="space-y-4 mt-6">
                <div className="flex items-start">
                  <Mail className="h-5 w-5 ml-2 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">البريد الإلكتروني</p>
                    <p className="text-muted-foreground" dir="ltr">{customer.email}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Phone className="h-5 w-5 ml-2 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">رقم الهاتف</p>
                    <p className="text-muted-foreground" dir="ltr">{customer.phone || 'غير متوفر'}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 ml-2 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">تاريخ التسجيل</p>
                    <p className="text-muted-foreground">{formatDate(customer.created_at)}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <ShoppingBag className="h-5 w-5 ml-2 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">عدد الطلبات</p>
                    <p className="text-muted-foreground">
                      {isLoading ? <Skeleton className="h-4 w-10" /> : ordersCount}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <DollarSign className="h-5 w-5 ml-2 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">إجمالي المشتريات</p>
                    <p className="text-muted-foreground">
                      {isLoading ? <Skeleton className="h-4 w-16" /> : `${totalSpent.toLocaleString()} دج`}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDetailsDialog;
