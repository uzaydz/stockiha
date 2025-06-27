import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Loader2, ArrowLeft, Settings, MessageSquare } from 'lucide-react';
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

  // فتح تطبيق الرسائل مع رسالة جاهزة
  const openSMSApp = (phoneNumber: string, orderNumber: string) => {
    const message = `مرحباً ${order?.customer_name}، طلبيتك رقم ${orderNumber} جاهزة للاستلام. يمكنك المرور لاستلامها في أي وقت مناسب لك. شكراً لثقتك بنا.`;
    
    // تنظيف رقم الهاتف
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // إنشاء رابط SMS
    const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(message)}`;
    
    // فتح تطبيق الرسائل
    window.open(smsUrl, '_self');
  };

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
      
      // فتح تطبيق الرسائل تلقائياً بعد ثانيتين
      setTimeout(() => {
        openSMSApp(order.customer_phone, order.order_number || order.id.slice(0, 8));
      }, 2000);
      
    } catch (err: any) {
      toast.error('حدث خطأ أثناء تحديث الحالة: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // تحديد لون الحالة مع دعم الدارك مود
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'قيد الانتظار':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50';
      case 'جاري التصليح':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50';
      case 'مكتمل':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800/50';
      case 'ملغي':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-200 dark:border-gray-600/50';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">جاري تحميل بيانات الطلبية... ⏳</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-red-600 dark:text-red-400 text-xl font-bold">خطأ ❌</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800/50 mb-6">
              <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
            </div>
            <Button 
              onClick={() => navigate('/')} 
              className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 dark:from-gray-600 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              size="lg"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              العودة للرئيسية 🏠
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-gray-500 dark:text-gray-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">لم يتم العثور على الطلبية 🔍</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          {isCompleted ? (
            <>
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-green-600 dark:text-green-400 text-xl font-bold">
                تم إنهاء التصليح بنجاح! 🎉
              </CardTitle>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
              <CardTitle className="text-gray-800 dark:text-gray-100 text-xl font-bold">
                إنهاء تصليح الجهاز 🔧
              </CardTitle>
            </>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6 pt-2">
          {/* معلومات الطلبية */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-600/50 p-4 rounded-xl border border-gray-200/50 dark:border-gray-600/50">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-200/50 dark:border-gray-600/50">
                <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">📋 رقم الطلبية:</span>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-100 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-md">
                  {order.order_number || order.id.slice(0, 8)}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-200/50 dark:border-gray-600/50">
                <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">👤 العميل:</span>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{order.customer_name}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-200/50 dark:border-gray-600/50">
                <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">📱 الهاتف:</span>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-100 font-mono">{order.customer_phone}</span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">⚡ الحالة الحالية:</span>
                <Badge className={`${getStatusColor(order.status)} shadow-sm font-bold`}>
                  {order.status}
                </Badge>
              </div>
              
              {order.issue_description && (
                <div className="pt-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">🔧 وصف العطل:</span>
                  <p className="text-sm mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 leading-relaxed">
                    {order.issue_description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* أزرار العمل */}
          <div className="space-y-4">
            {isCompleted ? (
              <div className="text-center">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800/50 mb-4">
                  <p className="text-green-700 dark:text-green-300 font-bold text-lg mb-2">
                    ✅ تم تحديث حالة الطلبية بنجاح إلى "تم التصليح"
                  </p>
                  <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                    📱 سيتم فتح تطبيق الرسائل لإرسال إشعار للعميل...
                  </p>
                </div>
                <div className="space-y-3">
                  <Button 
                    onClick={() => openSMSApp(order.customer_phone, order.order_number || order.id.slice(0, 8))}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    size="lg"
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    إرسال رسالة للعميل 💬
                  </Button>
                  <Button 
                    onClick={() => navigate(`/repair-tracking/${order.order_number || order.id}`)}
                    className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 dark:from-gray-600 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    size="lg"
                  >
                    عرض تفاصيل التتبع 📊
                  </Button>
                </div>
              </div>
            ) : order.status === 'مكتمل' ? (
              <div className="text-center">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800/50 mb-4">
                  <p className="text-green-700 dark:text-green-300 font-bold text-lg">
                    ✅ هذه الطلبية مكتملة بالفعل
                  </p>
                </div>
                <div className="space-y-3">
                  <Button 
                    onClick={() => openSMSApp(order.customer_phone, order.order_number || order.id.slice(0, 8))}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    size="lg"
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    إرسال رسالة للعميل 💬
                  </Button>
                  <Button 
                    onClick={() => navigate(`/repair-tracking/${order.order_number || order.id}`)}
                    className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 dark:from-gray-600 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    size="lg"
                  >
                    عرض تفاصيل التتبع 📊
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <Button 
                  onClick={handleCompleteRepair}
                  disabled={isUpdating}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 dark:from-green-600 dark:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  size="lg"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      جاري التحديث... ⏳
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      تأكيد إنهاء التصليح ✅
                    </>
                  )}
                </Button>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800/50 mt-4">
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                    💡 سيتم تحديث حالة الطلبية إلى "تم التصليح" وإشعار العميل تلقائياً
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RepairComplete; 