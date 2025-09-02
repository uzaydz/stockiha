/**
 * مكون إعادة شحن الطلبيات الإلكترونية
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, CreditCard, AlertTriangle, RefreshCw, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useOnlineOrdersLimit } from '@/hooks/useOnlineOrdersLimit';

interface RechargePackage {
  id: string;
  name: string;
  description: string;
  orders_count: number;
  price: number;
  currency: string;
}

interface RechargeHistory {
  id: string;
  package_name: string;
  orders_count: number;
  amount_paid: number;
  currency: string;
  created_at: string;
}

export const OnlineOrdersRechargeCard: React.FC = () => {
  const { organization } = useAuth();
  const { limitInfo, loading: limitLoading, refreshLimit } = useOnlineOrdersLimit();
  
  const [packages, setPackages] = useState<RechargePackage[]>([]);
  const [history, setHistory] = useState<RechargeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [recharging, setRecharging] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // جلب حزم إعادة الشحن
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const { data, error } = await supabase
          .from('online_orders_recharge_packages')
          .select('*')
          .eq('is_active', true)
          .order('display_order');

        if (error) throw error;
        setPackages(data || []);
      } catch (error) {
        console.error('خطأ في جلب حزم إعادة الشحن:', error);
        toast.error('فشل في جلب حزم إعادة الشحن');
      }
    };

    fetchPackages();
  }, []);

  // جلب تاريخ إعادة الشحن
  useEffect(() => {
    const fetchHistory = async () => {
      if (!organization?.id) return;

      try {
        const { data, error } = await supabase
          .from('online_orders_recharge_history')
          .select('*')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setHistory(data || []);
      } catch (error) {
        console.error('خطأ في جلب تاريخ إعادة الشحن:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [organization?.id]);

  // معالجة إعادة الشحن
  const handleRecharge = async () => {
    if (!organization?.id || !selectedPackage || !paymentMethod) {
      toast.error('يرجى اختيار حزمة الشحن وطريقة الدفع');
      return;
    }

    const packageData = packages.find(p => p.id === selectedPackage);
    if (!packageData) return;

    try {
      setRecharging(true);

      const { data, error } = await supabase.rpc('recharge_online_orders', {
        p_organization_id: organization.id,
        p_package_id: selectedPackage,
        p_payment_method: paymentMethod,
        p_amount_paid: packageData.price
      });

      if (error) throw error;

      toast.success(`تم شحن ${packageData.orders_count} طلبية بنجاح!`);
      setIsDialogOpen(false);
      setSelectedPackage('');
      setPaymentMethod('');
      
      // تحديث البيانات
      await refreshLimit();
      
      // إعادة جلب التاريخ
      const { data: historyData } = await supabase
        .from('online_orders_recharge_history')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setHistory(historyData || []);

    } catch (error) {
      console.error('خطأ في إعادة الشحن:', error);
      toast.error('فشل في إعادة الشحن');
    } finally {
      setRecharging(false);
    }
  };

  const formatPrice = (price: number, currency: string = 'DZD') => {
    return `${price.toLocaleString('ar-DZ')} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading || limitLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="mr-2">جاري التحميل...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* بطاقة الحالة الحالية */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            حالة الطلبيات الإلكترونية
          </CardTitle>
          <CardDescription>
            عرض الحد الحالي والمتبقي من الطلبيات الإلكترونية
          </CardDescription>
        </CardHeader>
        <CardContent>
          {limitInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{limitInfo.maxOrders || 0}</div>
                <div className="text-sm text-muted-foreground">الحد الحالي</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{limitInfo.currentOrders}</div>
                <div className="text-sm text-muted-foreground">المستخدم</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className={`text-2xl font-bold ${limitInfo.isBlocked ? 'text-red-600' : 'text-green-600'}`}>
                  {limitInfo.remainingOrders || 0}
                </div>
                <div className="text-sm text-muted-foreground">المتبقي</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">لا توجد بيانات متاحة</p>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <Button
              onClick={refreshLimit}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              تحديث البيانات
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  إعادة الشحن
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>إعادة شحن الطلبيات الإلكترونية</DialogTitle>
                  <DialogDescription>
                    اختر حزمة الشحن وطريقة الدفع لإضافة طلبيات إضافية
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">حزمة الشحن</label>
                    <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر حزمة الشحن" />
                      </SelectTrigger>
                      <SelectContent>
                        {packages.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{pkg.name}</span>
                              <span className="text-muted-foreground mr-2">
                                {pkg.orders_count} طلبية - {formatPrice(pkg.price, pkg.currency)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">طريقة الدفع</label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر طريقة الدفع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">نقداً</SelectItem>
                        <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                        <SelectItem value="ccp">بريد الجزائر CCP</SelectItem>
                        <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleRecharge}
                      disabled={recharging || !selectedPackage || !paymentMethod}
                      className="flex-1"
                    >
                      {recharging ? 'جاري الشحن...' : 'تأكيد الشحن'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* حزم الشحن المتاحة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            حزم الشحن المتاحة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <div key={pkg.id} className="p-4 border rounded-lg">
                <h3 className="font-semibold">{pkg.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{pkg.description}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{pkg.orders_count} طلبية</Badge>
                  <span className="font-bold text-primary">{formatPrice(pkg.price, pkg.currency)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* تاريخ إعادة الشحن */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>تاريخ إعادة الشحن</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{item.package_name}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(item.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{item.orders_count} طلبية</p>
                    <p className="text-sm text-muted-foreground">{formatPrice(item.amount_paid, item.currency)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};