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
              
              <div className="space-y-4 mt-6">
                <div className="flex items-start">
                  <Mail className="h-5 w-5 ml-2 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">البريد الإلكتروني</p>
                    <p className="text-muted-foreground">{customer.email}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Phone className="h-5 w-5 ml-2 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">رقم الهاتف</p>
                    <p className="text-muted-foreground">{customer.phone || 'غير متوفر'}</p>
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
                      {isLoading ? 'جارٍ التحميل...' : ordersCount}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <DollarSign className="h-5 w-5 ml-2 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">إجمالي المشتريات</p>
                    <p className="text-muted-foreground">
                      {isLoading ? 'جارٍ التحميل...' : 
                        `${totalSpent.toLocaleString()} دج`}
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
