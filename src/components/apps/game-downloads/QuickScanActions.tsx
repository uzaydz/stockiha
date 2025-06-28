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
import { useUser } from '@/context/UserContext';

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

// صفحة بدء التحميل
export const GameDownloadStart: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { userId } = useUser();
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
      const { data, error } = await supabase
        .from('game_download_orders')
        .select(`
          *,
          game:games_catalog(name, platform)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      if (data) {
        setOrder(data);
      } else {
        toast.error('لم يتم العثور على الطلب');
        navigate('/admin/game-orders');
      }
    } catch (error: any) {
      toast.error('حدث خطأ أثناء جلب بيانات الطلب');
      navigate('/admin/game-orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStartDownload = async () => {
    if (!order || !userId) return;

    try {
      setUpdating(true);

      const { error } = await supabase.rpc('update_game_order_status', {
        order_id: order.id,
        new_status: 'processing',
        user_id: userId,
        notes: 'تم بدء عملية تحميل الألعاب'
      });

      if (error) throw error;

      toast.success('تم بدء عملية التحميل بنجاح');
      
      // إعادة توجيه إلى صفحة إدارة الطلبات بعد ثانيتين
      setTimeout(() => {
        navigate('/admin/game-orders');
      }, 2000);

    } catch (error: any) {
      toast.error('فشل في تحديث حالة الطلب');
    } finally {
      setUpdating(false);
    }
  };

  // استخراج تفاصيل الألعاب من الملاحظات
  const extractGamesFromNotes = () => {
    if (!order?.notes || !order.notes.includes('📋 تفاصيل الطلب:')) {
      return [{
        name: order?.game?.name || order?.game_name || 'لعبة غير محددة',
        platform: order?.game?.platform || order?.game_platform || 'منصة غير محددة',
        quantity: 1
      }];
    }

    const gamesSection = order.notes.split('📋 تفاصيل الطلب:')[1]?.split('📊 الملخص:')[0];
    if (!gamesSection) return [];

    const gameLines = gamesSection.split('\n').filter(line => line.trim().startsWith('•'));
    return gameLines.map(line => {
      const gameName = line.replace('•', '').split('(')[0].trim();
      const platform = line.match(/\(([^)]+)\)/)?.[1] || 'غير محدد';
      const quantity = parseInt(line.match(/الكمية: (\d+)/)?.[1] || '1');
      
      return { name: gameName, platform, quantity };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">طلب غير موجود</h3>
            <p className="text-muted-foreground mb-4">لم يتم العثور على الطلب المطلوب</p>
            <Button onClick={() => navigate('/admin/game-orders')}>
              العودة لقائمة الطلبات
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const gamesList = extractGamesFromNotes();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-8">
      <div className="container max-w-2xl mx-auto">
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
              {/* معلومات العميل */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  معلومات العميل
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground">الاسم</div>
                    <div className="font-medium">{order.customer_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">الهاتف</div>
                    <div className="font-medium flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {order.customer_phone}
                    </div>
                  </div>
                </div>
              </div>

              {/* قائمة الألعاب */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5" />
                  الألعاب المطلوب تحميلها ({gamesList.reduce((sum, game) => sum + game.quantity, 0)} لعبة)
                </h3>
                <div className="space-y-3">
                  {gamesList.map((game, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Gamepad2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{game.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {game.platform}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        الكمية: {game.quantity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* معلومات الجهاز */}
              {(order.device_type || order.device_specs) && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    معلومات الجهاز
                  </h3>
                  {order.device_type && (
                    <div className="mb-2">
                      <div className="text-sm text-muted-foreground">نوع الجهاز</div>
                      <div className="font-medium">{order.device_type}</div>
                    </div>
                  )}
                  {order.device_specs && (
                    <div>
                      <div className="text-sm text-muted-foreground">المواصفات</div>
                      <div className="text-sm bg-white p-2 rounded border">
                        {order.device_specs}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* أزرار التحكم */}
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
                
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin/game-orders')}
                  size="lg"
                >
                  إلغاء
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

// صفحة إنهاء الطلب
export const GameOrderComplete: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { userId } = useUser();
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
      const { data, error } = await supabase
        .from('game_download_orders')
        .select(`
          *,
          game:games_catalog(name, platform)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      if (data) {
        setOrder(data);
      } else {
        toast.error('لم يتم العثور على الطلب');
        navigate('/admin/game-orders');
      }
    } catch (error: any) {
      toast.error('حدث خطأ أثناء جلب بيانات الطلب');
      navigate('/admin/game-orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!order || !userId) return;

    try {
      setUpdating(true);

      const { error } = await supabase.rpc('update_game_order_status', {
        order_id: order.id,
        new_status: 'ready',
        user_id: userId,
        notes: 'تم الانتهاء من تحميل جميع الألعاب - الطلب جاهز للاستلام'
      });

      if (error) throw error;

      toast.success('تم إنهاء الطلب بنجاح - الطلب جاهز للاستلام');
      
      // إعادة توجيه إلى صفحة إدارة الطلبات بعد ثانيتين
      setTimeout(() => {
        navigate('/admin/game-orders');
      }, 2000);

    } catch (error: any) {
      toast.error('فشل في تحديث حالة الطلب');
    } finally {
      setUpdating(false);
    }
  };

  // استخراج تفاصيل الألعاب من الملاحظات
  const extractGamesFromNotes = () => {
    if (!order?.notes || !order.notes.includes('📋 تفاصيل الطلب:')) {
      return [{
        name: order?.game?.name || order?.game_name || 'لعبة غير محددة',
        platform: order?.game?.platform || order?.game_platform || 'منصة غير محددة',
        quantity: 1
      }];
    }

    const gamesSection = order.notes.split('📋 تفاصيل الطلب:')[1]?.split('📊 الملخص:')[0];
    if (!gamesSection) return [];

    const gameLines = gamesSection.split('\n').filter(line => line.trim().startsWith('•'));
    return gameLines.map(line => {
      const gameName = line.replace('•', '').split('(')[0].trim();
      const platform = line.match(/\(([^)]+)\)/)?.[1] || 'غير محدد';
      const quantity = parseInt(line.match(/الكمية: (\d+)/)?.[1] || '1');
      
      return { name: gameName, platform, quantity };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">طلب غير موجود</h3>
            <p className="text-muted-foreground mb-4">لم يتم العثور على الطلب المطلوب</p>
            <Button onClick={() => navigate('/admin/game-orders')}>
              العودة لقائمة الطلبات
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const gamesList = extractGamesFromNotes();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
      <div className="container max-w-2xl mx-auto">
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
              {/* معلومات العميل */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  معلومات العميل
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground">الاسم</div>
                    <div className="font-medium">{order.customer_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">الهاتف</div>
                    <div className="font-medium flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {order.customer_phone}
                    </div>
                  </div>
                </div>
              </div>

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
                        مكتمل ✓
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* حالة الطلب الحالية */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  حالة الطلب الحالية
                </h3>
                <div className="flex items-center gap-2">
                  <Badge className={
                    order.status === 'processing' 
                      ? 'bg-blue-100 text-blue-800' 
                      : order.status === 'ready'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }>
                    {order.status === 'processing' ? 'قيد التحميل' : 
                     order.status === 'ready' ? 'جاهز للاستلام' : 
                     order.status === 'delivered' ? 'تم التسليم' : 
                     'غير محدد'}
                  </Badge>
                </div>
              </div>

              {/* أزرار التحكم */}
              <div className="flex gap-3">
                <Button
                  onClick={handleCompleteOrder}
                  disabled={updating || order.status === 'ready' || order.status === 'delivered'}
                  className="flex-1"
                  size="lg"
                >
                  {updating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <CheckCircle className="h-5 w-5 mr-2" />
                  )}
                  {order.status === 'ready' ? 'جاهز للاستلام بالفعل' : 
                   order.status === 'delivered' ? 'تم التسليم بالفعل' : 
                   'إنهاء الطلب'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin/game-orders')}
                  size="lg"
                >
                  إلغاء
                </Button>
              </div>

              {(order.status === 'ready' || order.status === 'delivered') && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <p className="text-green-800 font-medium">
                    {order.status === 'ready' ? 'هذا الطلب جاهز للاستلام بالفعل' : 'تم تسليم هذا الطلب بالفعل'}
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