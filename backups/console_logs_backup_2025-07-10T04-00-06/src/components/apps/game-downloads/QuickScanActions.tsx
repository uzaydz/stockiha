import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  Play, 
  Package, 
  Gamepad2, 
  User, 
  Phone,
  Clock,
  Download,
  AlertCircle
} from 'lucide-react';

interface GameOrder {
  id: string;
  tracking_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  game_id?: string;
  game_name?: string;
  game_platform?: string;
  device_type?: string;
  device_specs?: string;
  notes?: string;
  status: string;
  status_history: any[];
  price: number;
  payment_status: string;
  amount_paid: number;
  created_at: string;
  updated_at: string;
  game?: {
    name: string;
    platform: string;
  };
}

// صفحة بدء التحميل - بدون الحاجة لتسجيل الدخول
export const GameDownloadStart: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<GameOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('game_download_orders')
        .select(`
          *,
          game:games_catalog(name, platform)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      if (data) {
        setOrder(data as GameOrder);
      } else {
        toast.error('لم يتم العثور على الطلب');
      }
    } catch (error: any) {
      toast.error('حدث خطأ أثناء جلب بيانات الطلب');
    } finally {
      setLoading(false);
    }
  };

  const handleStartDownload = async () => {
    if (!order) return;

    try {
      setUpdating(true);

      // تحديث حالة الطلب مباشرة بدون الحاجة لـ userId
      const { error: updateError } = await (supabase as any)
        .from('game_download_orders')
        .update({ 
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      // محاولة إضافة سجل في تاريخ الحالات (إذا كان الجدول موجود)
      try {
        const { error: historyError } = await (supabase as any)
          .from('game_order_status_history')
          .insert([{
            order_id: order.id,
            status: 'processing',
            notes: 'تم بدء عملية تحميل الألعاب بواسطة المسؤول',
            created_at: new Date().toISOString()
          }]);

        if (historyError) {
        }
      } catch (historyError) {
      }

      toast.success('تم بدء عملية التحميل بنجاح! 🚀');
      
      // تحديث البيانات المحلية
      setOrder(prev => prev ? { ...prev, status: 'processing' } : null);

    } catch (error: any) {
      toast.error('فشل في تحديث حالة الطلب');
    } finally {
      setUpdating(false);
    }
  };

  // استخراج قائمة الألعاب من الملاحظات
  const extractGames = (notes: string) => {
    if (!notes) return [];
    
    try {
      const lines = notes.split('\n');
      const games: any[] = [];
      
      lines.forEach(line => {
        if (line.includes('🎮') || line.includes('لعبة:')) {
          const gameName = line.replace('🎮', '').replace('لعبة:', '').trim();
          if (gameName) {
            games.push({
              name: gameName,
              platform: 'متعدد المنصات',
              quantity: 1
            });
          }
        }
      });
      
      return games.length > 0 ? games : [
        { name: order?.game_name || 'لعبة غير محددة', platform: order?.game_platform || 'متعدد المنصات', quantity: 1 }
      ];
    } catch {
      return [
        { name: order?.game_name || 'لعبة غير محددة', platform: order?.game_platform || 'متعدد المنصات', quantity: 1 }
      ];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات الطلب...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">لم يتم العثور على الطلب</h2>
          <p className="text-gray-600 mb-4">الطلب المطلوب غير موجود أو تم حذفه</p>
        </div>
      </div>
    );
  }

  const gamesList = extractGames(order.notes || '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-8">
      <div className="container max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Play className="h-8 w-8 text-green-600" />
                <Download className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">🚀 بدء تحميل الألعاب</CardTitle>
              <CardDescription>
                تأكيد بدء عملية تحميل الألعاب للطلب رقم: {order.tracking_number}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* معلومات الطلب */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">{order.customer_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{order.customer_phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {new Date(order.created_at).toLocaleDateString('ar-EG')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <Badge variant={
                    order.status === 'pending' ? 'secondary' :
                    order.status === 'processing' ? 'default' :
                    order.status === 'ready' ? 'outline' : 'destructive'
                  }>
                    {order.status === 'pending' ? 'قيد الانتظار' :
                     order.status === 'processing' ? 'قيد التحميل' :
                     order.status === 'ready' ? 'جاهز' :
                     order.status === 'delivered' ? 'مكتمل' : 'ملغي'}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* قائمة الألعاب */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5" />
                  الألعاب المطلوبة ({gamesList.reduce((sum, game) => sum + game.quantity, 0)} لعبة)
                </h3>
                <div className="space-y-3">
                  {gamesList.map((game, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Gamepad2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{game.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {game.platform}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {order.status === 'processing' ? 'قيد التحميل' : 'في الانتظار'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* أزرار الإجراء */}
              <div className="flex gap-3">
                <Button
                  onClick={handleStartDownload}
                  disabled={updating || order.status === 'processing'}
                  className="flex-1"
                  size="lg"
                >
                  {updating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Play className="h-5 w-5 mr-2" />
                  )}
                  {order.status === 'processing' ? 'قيد التحميل بالفعل' : 'بدء التحميل'}
                </Button>
              </div>

              {order.status === 'processing' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <p className="text-green-800 font-medium">
                    هذا الطلب قيد التحميل بالفعل
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

// صفحة إنهاء الطلب - بدون الحاجة لتسجيل الدخول
export const GameOrderComplete: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<GameOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('game_download_orders')
        .select(`
          *,
          game:games_catalog(name, platform)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      if (data) {
        setOrder(data as GameOrder);
      } else {
        toast.error('لم يتم العثور على الطلب');
      }
    } catch (error: any) {
      toast.error('حدث خطأ أثناء جلب بيانات الطلب');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!order) return;

    try {
      setUpdating(true);

      // تحديث حالة الطلب مباشرة بدون الحاجة لـ userId
      const { error: updateError } = await (supabase as any)
        .from('game_download_orders')
        .update({ 
          status: 'ready',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      // محاولة إضافة سجل في تاريخ الحالات (إذا كان الجدول موجود)
      try {
        const { error: historyError } = await (supabase as any)
          .from('game_order_status_history')
          .insert([{
            order_id: order.id,
            status: 'ready',
            notes: 'تم الانتهاء من تحميل جميع الألعاب - الطلب جاهز للاستلام',
            created_at: new Date().toISOString()
          }]);

        if (historyError) {
        }
      } catch (historyError) {
      }

      toast.success('تم إنهاء الطلب بنجاح! ✅ الطلب جاهز للاستلام');
      
      // تحديث البيانات المحلية
      setOrder(prev => prev ? { ...prev, status: 'ready' } : null);

    } catch (error: any) {
      toast.error('فشل في تحديث حالة الطلب');
    } finally {
      setUpdating(false);
    }
  };

  // استخراج قائمة الألعاب من الملاحظات
  const extractGames = (notes: string) => {
    if (!notes) return [];
    
    try {
      const lines = notes.split('\n');
      const games: any[] = [];
      
      lines.forEach(line => {
        if (line.includes('🎮') || line.includes('لعبة:')) {
          const gameName = line.replace('🎮', '').replace('لعبة:', '').trim();
          if (gameName) {
            games.push({
              name: gameName,
              platform: 'متعدد المنصات',
              quantity: 1
            });
          }
        }
      });
      
      return games.length > 0 ? games : [
        { name: order?.game_name || 'لعبة غير محددة', platform: order?.game_platform || 'متعدد المنصات', quantity: 1 }
      ];
    } catch {
      return [
        { name: order?.game_name || 'لعبة غير محددة', platform: order?.game_platform || 'متعدد المنصات', quantity: 1 }
      ];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات الطلب...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">لم يتم العثور على الطلب</h2>
          <p className="text-gray-600 mb-4">الطلب المطلوب غير موجود أو تم حذفه</p>
        </div>
      </div>
    );
  }

  const gamesList = extractGames(order.notes || '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
      <div className="container max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">✅ إنهاء طلب الألعاب</CardTitle>
              <CardDescription>
                تأكيد إنهاء عملية تحميل الألعاب للطلب رقم: {order.tracking_number}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* معلومات الطلب */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">{order.customer_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{order.customer_phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {new Date(order.created_at).toLocaleDateString('ar-EG')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <Badge variant={
                    order.status === 'pending' ? 'secondary' :
                    order.status === 'processing' ? 'default' :
                    order.status === 'ready' ? 'outline' :
                    order.status === 'delivered' ? 'outline' : 'destructive'
                  }>
                    {order.status === 'pending' ? 'قيد الانتظار' :
                     order.status === 'processing' ? 'قيد التحميل' :
                     order.status === 'ready' ? 'جاهز للاستلام' :
                     order.status === 'delivered' ? 'مكتمل' : 'ملغي'}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* قائمة الألعاب */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5" />
                  الألعاب المكتملة ({gamesList.reduce((sum, game) => sum + game.quantity, 0)} لعبة)
                </h3>
                <div className="space-y-3">
                  {gamesList.map((game, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium">{game.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {game.platform}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {order.status === 'ready' ? 'مكتمل ✓' : 'جاري العمل'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* حالة الطلب الحالية */}
              {order.status === 'processing' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-800">الطلب قيد التحميل</span>
                  </div>
                  <p className="text-blue-700 text-sm">
                    يمكنك إنهاء الطلب عند الانتهاء من تحميل جميع الألعاب
                  </p>
                </div>
              )}

              {order.status === 'ready' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">الطلب جاهز للاستلام</span>
                  </div>
                  <p className="text-green-700 text-sm">
                    تم الانتهاء من تحميل جميع الألعاب بنجاح
                  </p>
                </div>
              )}

              {/* أزرار الإجراء */}
              <div className="flex gap-3">
                <Button
                  onClick={handleCompleteOrder}
                  disabled={updating || order.status === 'ready'}
                  className="flex-1"
                  size="lg"
                  variant={order.status === 'ready' ? 'outline' : 'default'}
                >
                  {updating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <CheckCircle className="h-5 w-5 mr-2" />
                  )}
                  {order.status === 'ready' ? 'تم الإنهاء بالفعل' : 'إنهاء الطلب'}
                </Button>
              </div>

              {order.status === 'ready' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <p className="text-green-800 font-medium">
                    تم إنهاء الطلب بنجاح - جاهز للاستلام
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
