import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Loader2, ArrowLeft, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface RepairOrder {
  id: string;
  order_number?: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  issue_description?: string;
  created_at: string;
  organization_id: string;
}

const RepairComplete: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // جلب بيانات الطلبية
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setError('معرف الطلبية غير صحيح');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('repair_orders')
          .select('id, order_number, customer_name, customer_phone, status, issue_description, created_at, organization_id')
          .eq('id', orderId)
          .single();

        if (error) {
          setError('لم يتم العثور على الطلبية');
          setIsLoading(false);
          return;
        }

        setOrder(data);
        
        // التحقق من الحالة الحالية
        if (data.status === 'مكتمل') {
          setIsCompleted(true);
        }
      } catch (err) {
        setError('حدث خطأ أثناء جلب بيانات الطلبية');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  // تحديث حالة الطلبية إلى "تم التصليح"
  const handleCompleteRepair = async () => {
    if (!order) return;

    setIsUpdating(true);
    try {
      // 1. تحديث حالة الطلبية
      const { error: updateError } = await supabase
        .from('repair_orders')
        .update({ 
          status: 'مكتمل',
          completed_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      // 2. إضافة سجل في تاريخ الحالة
      const { error: historyError } = await supabase
        .from('repair_status_history')
        .insert({
          repair_order_id: order.id,
          status: 'مكتمل',
          notes: 'تم تحديث الحالة عبر QR code',
          created_by: null // نظام تلقائي - بدون مستخدم محدد
        });

      if (historyError) throw historyError;

      setIsCompleted(true);
      setOrder({ ...order, status: 'مكتمل' });
      toast.success('تم تحديث حالة الطلبية بنجاح إلى "تم التصليح"');
    } catch (err: any) {
      toast.error('حدث خطأ أثناء تحديث الحالة: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // تحديد لون الحالة
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'قيد الانتظار':
        return 'bg-yellow-100 text-yellow-800';
      case 'جاري التصليح':
        return 'bg-blue-100 text-blue-800';
      case 'مكتمل':
        return 'bg-green-100 text-green-800';
      case 'ملغي':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل بيانات الطلبية...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <CardTitle className="text-red-600">خطأ</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              العودة للرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">لم يتم العثور على الطلبية</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {isCompleted ? (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <CardTitle className="text-green-600">تم إنهاء التصليح بنجاح!</CardTitle>
            </>
          ) : (
            <>
              <Settings className="h-12 w-12 text-blue-500 mx-auto mb-2" />
              <CardTitle>إنهاء تصليح الجهاز</CardTitle>
            </>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* معلومات الطلبية */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">رقم الطلبية:</span>
                <span className="text-sm font-medium">
                  {order.order_number || order.id.slice(0, 8)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">العميل:</span>
                <span className="text-sm font-medium">{order.customer_name}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">الهاتف:</span>
                <span className="text-sm font-medium">{order.customer_phone}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">الحالة الحالية:</span>
                <Badge className={getStatusColor(order.status)}>
                  {order.status}
                </Badge>
              </div>
              
              {order.issue_description && (
                <div>
                  <span className="text-sm text-gray-600">وصف العطل:</span>
                  <p className="text-sm mt-1 p-2 bg-white rounded border">
                    {order.issue_description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* أزرار العمل */}
          <div className="space-y-3">
            {isCompleted ? (
              <div className="text-center">
                <p className="text-green-600 mb-3">
                  ✅ تم تحديث حالة الطلبية بنجاح إلى "تم التصليح"
                </p>
                <Button 
                  onClick={() => navigate(`/repair-tracking/${order.order_number || order.id}`)}
                  className="w-full"
                >
                  عرض تفاصيل التتبع
                </Button>
              </div>
            ) : order.status === 'مكتمل' ? (
              <div className="text-center">
                <p className="text-green-600 mb-3">
                  ✅ هذه الطلبية مكتملة بالفعل
                </p>
                <Button 
                  onClick={() => navigate(`/repair-tracking/${order.order_number || order.id}`)}
                  className="w-full"
                  variant="outline"
                >
                  عرض تفاصيل التتبع
                </Button>
              </div>
            ) : (
              <>
                <Button 
                  onClick={handleCompleteRepair}
                  disabled={isUpdating}
                  className="w-full"
                  size="lg"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      جاري التحديث...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      تأكيد إنهاء التصليح
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-gray-500 text-center">
                  سيتم تحديث حالة الطلبية إلى "تم التصليح" وإشعار العميل
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RepairComplete; 