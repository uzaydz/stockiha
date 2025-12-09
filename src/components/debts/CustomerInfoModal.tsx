import React, { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  FileText,
  CreditCard,
  ShoppingBag,
  AlertCircle,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface CustomerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string | null;
  customerName: string;
  totalDebt: number;
  ordersCount: number;
}

interface CustomerData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  nif: string | null;
  rc: string | null;
  nis: string | null;
  notes: string | null;
  created_at: string;
}

const CustomerInfoModal: React.FC<CustomerInfoModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  totalDebt,
  ordersCount,
}) => {
  // جلب بيانات العميل من PowerSync
  const { sql, params } = useMemo(() => {
    if (!customerId || customerId === 'unknown') {
      console.log('[CustomerInfoModal] No valid customerId:', customerId);
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    console.log('[CustomerInfoModal] Fetching customer:', customerId);
    return {
      sql: `
        SELECT
          id,
          name,
          email,
          phone,
          address,
          nif,
          rc,
          nis,
          created_at
        FROM customers
        WHERE id = ?
        LIMIT 1
      `,
      params: [customerId]
    };
  }, [customerId]);

  const { data, isLoading, error } = useQuery<CustomerData>(sql, params);
  const customer = data?.[0];

  // Debug log
  console.log('[CustomerInfoModal] Query result:', { data, isLoading, error, customerId });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <User className="h-5 w-5 text-primary" />
            معلومات العميل
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            جاري تحميل البيانات...
          </div>
        ) : (
          <div className="space-y-4">
            {/* الاسم والحالة */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{customer?.name || customerName}</h3>
                  <p className="text-xs text-muted-foreground">
                    عميل منذ {customer?.created_at
                      ? new Date(customer.created_at).toLocaleDateString('ar-DZ')
                      : 'غير معروف'}
                  </p>
                </div>
              </div>
              <Badge variant="destructive" className="text-sm">
                مديون
              </Badge>
            </div>

            {/* ملخص الدين */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs">إجمالي الدين</span>
                </div>
                <p className="text-xl font-bold text-red-600">{formatPrice(totalDebt)}</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <ShoppingBag className="h-4 w-4" />
                  <span className="text-xs">عدد الطلبات</span>
                </div>
                <p className="text-xl font-bold">{ordersCount} طلب</p>
              </div>
            </div>

            <Separator />

            {/* معلومات الاتصال */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">معلومات الاتصال</h4>

              {customer?.phone && (
                <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                    <p className="font-medium" dir="ltr">{customer.phone}</p>
                  </div>
                </div>
              )}

              {customer?.email && (
                <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                    <p className="font-medium" dir="ltr">{customer.email}</p>
                  </div>
                </div>
              )}

              {customer?.address && (
                <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">العنوان</p>
                    <p className="font-medium">{customer.address}</p>
                  </div>
                </div>
              )}

              {!customer?.phone && !customer?.email && !customer?.address && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  لا توجد معلومات اتصال متاحة
                </p>
              )}
            </div>

            {/* المعلومات التجارية */}
            {(customer?.nif || customer?.rc || customer?.nis) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground">المعلومات التجارية</h4>

                  <div className="grid grid-cols-1 gap-2">
                    {customer?.nif && (
                      <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">رقم التعريف الجبائي (NIF)</p>
                          <p className="font-medium font-mono">{customer.nif}</p>
                        </div>
                      </div>
                    )}

                    {customer?.rc && (
                      <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">السجل التجاري (RC)</p>
                          <p className="font-medium font-mono">{customer.rc}</p>
                        </div>
                      </div>
                    )}

                    {customer?.nis && (
                      <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">رقم التعريف الإحصائي (NIS)</p>
                          <p className="font-medium font-mono">{customer.nis}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* الملاحظات */}
            {customer?.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">ملاحظات</h4>
                  <p className="text-sm p-3 bg-muted/20 rounded-lg">{customer.notes}</p>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomerInfoModal;
