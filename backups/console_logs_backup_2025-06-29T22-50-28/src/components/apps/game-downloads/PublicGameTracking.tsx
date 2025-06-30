import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Search, 
  XCircle, 
  Copy, 
  Check, 
  Gamepad2, 
  Download, 
  Package, 
  Truck,
  Timer,
  Users
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useTenant } from '@/context/TenantContext';

// تكوين حالات الطلب
const statusConfig = {
  'pending': {
    label: 'قيد الانتظار',
    color: 'bg-yellow-100 text-yellow-800',
    icon: <Clock className="h-4 w-4 mr-1" />,
    description: 'تم استلام طلبك وهو في انتظار المعالجة'
  },
  'processing': {
    label: 'قيد التحميل',
    color: 'bg-blue-100 text-blue-800',
    icon: <Download className="h-4 w-4 mr-1 animate-pulse" />,
    description: 'جاري تحميل الألعاب على جهازك'
  },
  'ready': {
    label: 'جاهز للاستلام',
    color: 'bg-purple-100 text-purple-800',
    icon: <Package className="h-4 w-4 mr-1" />,
    description: 'تم تحميل الألعاب وجهازك جاهز للاستلام'
  },
  'delivered': {
    label: 'تم التسليم',
    color: 'bg-green-100 text-green-800',
    icon: <CheckCircle className="h-4 w-4 mr-1" />,
    description: 'تم تسليم جهازك بنجاح'
  },
  'cancelled': {
    label: 'ملغي',
    color: 'bg-red-100 text-red-800',
    icon: <XCircle className="h-4 w-4 mr-1" />,
    description: 'تم إلغاء الطلب'
  },
};

// مراحل سير عملية التحميل
const downloadSteps = [
  { key: 'pending', label: 'تم الاستلام', icon: <Clock className="h-4 w-4" /> },
  { key: 'processing', label: 'قيد التحميل', icon: <Download className="h-4 w-4" /> },
  { key: 'ready', label: 'جاهز للاستلام', icon: <Package className="h-4 w-4" /> },
  { key: 'delivered', label: 'تم التسليم', icon: <CheckCircle className="h-4 w-4" /> },
];

// دالة للحصول على رقم المرحلة الحالية
const getCurrentStepIndex = (status: string): number => {
  if (status === 'cancelled') return -1; // حالة خاصة للإلغاء
  
  const index = downloadSteps.findIndex(step => step.key === status);
  return index >= 0 ? index : 0;
};

// نوع البيانات المستردة من الاستعلام
interface GameOrderResult {
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
  processing_started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  price: number;
  payment_status: string;
  payment_method?: string;
  amount_paid: number;
  created_at: string;
  updated_at: string;
  organization_id: string;
  // إضافة معلومات الطابور
  queue_position?: number;
  total_in_queue?: number;
  game?: {
    name: string;
    platform: string;
  };
}

// دالة لجلب معلومات الطابور للطلب
const getQueueInfo = async (orderId: string) => {
  try {
    // جلب معلومات الطلب الحالي
    const { data: currentOrder, error: currentOrderError } = await supabase
      .from('game_download_orders')
      .select('created_at, status, organization_id')
      .eq('id', orderId)
      .single() as any;
      
    if (currentOrderError || !currentOrder) return null;
    
    // إذا كان الطلب مكتمل أو ملغي، لا تعرض معلومات الطابور
    if (currentOrder.status === 'delivered' || currentOrder.status === 'cancelled') {
      return null;
    }
    
    // حساب عدد الطلبات التي تم إنشاؤها قبل هذا الطلب
    const { data: ordersBeforeMe, error: beforeError } = await supabase
      .from('game_download_orders')
      .select('id')
      .eq('organization_id', currentOrder.organization_id)
      .in('status', ['pending', 'processing'])
      .lt('created_at', currentOrder.created_at);
      
    // حساب إجمالي الطلبات النشطة
    const { data: totalActiveOrders, error: totalError } = await supabase
      .from('game_download_orders')
      .select('id, created_at')
      .eq('organization_id', currentOrder.organization_id)
      .in('status', ['pending', 'processing']);
      
    if (beforeError || totalError) return null;
    
    const totalInQueue = totalActiveOrders?.length || 0;
    
    // حساب الترتيب الصحيح
    const ordersAfterMe = totalActiveOrders?.filter(order => {
      return new Date(order.created_at) > new Date(currentOrder.created_at);
    }) || [];
    
    const queuePosition = totalInQueue - ordersAfterMe.length;
    
    return {
      queuePosition: Math.max(1, queuePosition),
      totalInQueue
    };
  } catch (error) {
    return null;
  }
};

const PublicGameTracking: React.FC = () => {
  const { trackingNumber: urlTrackingNumber } = useParams<{ trackingNumber: string }>();
  const { currentOrganization } = useTenant();
  
  const [trackingCode, setTrackingCode] = useState(urlTrackingNumber || '');
  const [gameOrder, setGameOrder] = useState<GameOrderResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [queueInfo, setQueueInfo] = useState<{ queuePosition: number; totalInQueue: number } | null>(null);

  // جلب الطلب تلقائياً إذا كان هناك رقم تتبع في الرابط
  useEffect(() => {
    if (urlTrackingNumber) {
      handleTrackOrder(urlTrackingNumber);
    }
  }, [urlTrackingNumber]);

  const handleTrackOrder = async (codeToTrack?: string) => {
    const codeToSearch = codeToTrack || trackingCode.trim();
    
    if (!codeToSearch) {
      toast.error('يرجى إدخال رقم التتبع أو رقم الهاتف');
      return;
    }

    try {
      setLoading(true);
      setGameOrder(null);
      setQueueInfo(null);

      // البحث برقم التتبع أولاً
      let { data, error } = await supabase
        .from('game_download_orders')
        .select(`
          *,
          game:games_catalog(name, platform)
        `)
        .eq('tracking_number', codeToSearch)
        .single();

      // إذا لم يوجد برقم التتبع، ابحث برقم الهاتف
      if (error && error.code === 'PGRST116') {
        ({ data, error } = await supabase
          .from('game_download_orders')
          .select(`
            *,
            game:games_catalog(name, platform)
          `)
          .eq('customer_phone', codeToSearch)
          .order('created_at', { ascending: false })
          .limit(1)
          .single());
      }

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error('لم يتم العثور على طلب بهذا الرقم');
        } else {
          throw error;
        }
        return;
      }

      if (data) {
        setGameOrder(data);
        
        // جلب معلومات الطابور
        const queueData = await getQueueInfo(data.id);
        setQueueInfo(queueData);
        
        toast.success('تم العثور على الطلب بنجاح');
      }
    } catch (error: any) {
      toast.error('حدث خطأ أثناء البحث عن الطلب');
    } finally {
      setLoading(false);
    }
  };

  const formatGameDate = (dateString: string | undefined): string => {
    if (!dateString) return 'غير محدد';
    
    try {
      return formatDate(new Date(dateString));
    } catch {
      return 'غير محدد';
    }
  };

  const copyTrackingCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('تم نسخ رقم التتبع');
    setTimeout(() => setCopied(false), 2000);
  };

  const renderGameResult = () => {
    if (!gameOrder) return null;

    const currentStepIndex = getCurrentStepIndex(gameOrder.status);
    const statusInfo = statusConfig[gameOrder.status as keyof typeof statusConfig];

    // استخراج تفاصيل الألعاب من الملاحظات
    const extractGamesFromNotes = () => {
      if (!gameOrder.notes || !gameOrder.notes.includes('📋 تفاصيل الطلب:')) {
        return [{
          name: gameOrder.game?.name || gameOrder.game_name || 'لعبة غير محددة',
          platform: gameOrder.game?.platform || gameOrder.game_platform || 'منصة غير محددة',
          quantity: 1
        }];
      }

      const gamesSection = gameOrder.notes.split('📋 تفاصيل الطلب:')[1]?.split('📊 الملخص:')[0];
      if (!gamesSection) return [];

      const gameLines = gamesSection.split('\n').filter(line => line.trim().startsWith('•'));
      return gameLines.map(line => {
        const gameName = line.replace('•', '').split('(')[0].trim();
        const platform = line.match(/\(([^)]+)\)/)?.[1] || 'غير محدد';
        const quantity = parseInt(line.match(/الكمية: (\d+)/)?.[1] || '1');
        
        return { name: gameName, platform, quantity };
      });
    };

    const gamesList = extractGamesFromNotes();
    const totalItems = gamesList.reduce((sum, game) => sum + game.quantity, 0);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* معلومات أساسية */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Gamepad2 className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">تفاصيل طلب الألعاب</CardTitle>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono font-medium bg-primary/10 px-3 py-1 rounded-md text-lg">
                {gameOrder.tracking_number}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyTrackingCode(gameOrder.tracking_number)}
                className="h-8 w-8 p-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* الحالة الحالية */}
            <div className="flex items-center justify-center">
              <Badge className={`${statusInfo?.color} px-4 py-2 text-sm font-medium`}>
                {statusInfo?.icon}
                {statusInfo?.label}
              </Badge>
            </div>
            
            <p className="text-center text-muted-foreground">
              {statusInfo?.description}
            </p>

            {/* معلومات الطابور */}
            {queueInfo && queueInfo.queuePosition > 0 && gameOrder.status !== 'delivered' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4 text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Timer className="h-5 w-5 text-orange-600" />
                  <span className="font-semibold text-orange-800">موقعك في الطابور</span>
                </div>
                <div className="text-3xl font-bold text-orange-600 mb-1">
                  {queueInfo.queuePosition}
                </div>
                <div className="text-sm text-orange-700">
                  من أصل {queueInfo.totalInQueue} طلب في الانتظار
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* مراحل سير العملية */}
        {gameOrder.status !== 'cancelled' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">مراحل سير العملية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {downloadSteps.map((step, index) => {
                  const isCompleted = index < currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  const isPending = index > currentStepIndex;

                  return (
                    <motion.div
                      key={step.key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center gap-4 p-3 rounded-lg ${
                        isCompleted
                          ? 'bg-green-50 border border-green-200'
                          : isCurrent
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isCurrent
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          step.icon
                        )}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${
                          isCompleted
                            ? 'text-green-800'
                            : isCurrent
                            ? 'text-blue-800'
                            : 'text-gray-600'
                        }`}>
                          {step.label}
                        </div>
                      </div>
                      {isCurrent && (
                        <div className="animate-pulse">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* قائمة الألعاب */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              الألعاب المطلوبة ({totalItems} لعبة)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {gamesList.map((game, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
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
                  <div className="text-sm font-medium">
                    الكمية: {game.quantity}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* معلومات إضافية */}
        <Card>
          <CardHeader>
            <CardTitle>معلومات الطلب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">اسم العميل</div>
                <div className="font-medium">{gameOrder.customer_name}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">رقم الهاتف</div>
                <div className="font-medium">{gameOrder.customer_phone}</div>
              </div>
              {gameOrder.customer_email && (
                <div>
                  <div className="text-sm text-muted-foreground">البريد الإلكتروني</div>
                  <div className="font-medium">{gameOrder.customer_email}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-muted-foreground">تاريخ الطلب</div>
                <div className="font-medium">{formatGameDate(gameOrder.created_at)}</div>
              </div>
              {gameOrder.device_type && (
                <div>
                  <div className="text-sm text-muted-foreground">نوع الجهاز</div>
                  <div className="font-medium">{gameOrder.device_type}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-muted-foreground">حالة الدفع</div>
                <div className="font-medium">
                  {gameOrder.payment_status === 'paid' ? 'مدفوع' : 
                   gameOrder.payment_status === 'partial' ? 'مدفوع جزئياً' : 'غير مدفوع'}
                </div>
              </div>
            </div>

            {gameOrder.device_specs && (
              <div>
                <div className="text-sm text-muted-foreground mb-2">مواصفات الجهاز</div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm">{gameOrder.device_specs}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* سجل التغييرات */}
        {gameOrder.status_history && gameOrder.status_history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>سجل التحديثات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {gameOrder.status_history.reverse().map((entry: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {statusConfig[entry.to_status as keyof typeof statusConfig]?.label || entry.to_status}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {formatGameDate(entry.changed_at)}
                        </span>
                      </div>
                      {entry.notes && (
                        <div className="text-sm text-muted-foreground">
                          {entry.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    );
  };

  return (
    <>
      {/* Hero Banner */}
      <div className="bg-gradient-to-b from-primary/5 to-background/10 py-16">
        <div className="container">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge variant="outline" className="bg-primary/10 text-primary font-medium mb-6 px-4 py-1">
              تحميل الألعاب
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">تتبع طلب الألعاب الخاص بك</h1>
            <p className="text-xl text-muted-foreground mb-6">
              ادخل رقم التتبع أو رقم الهاتف للاطلاع على حالة طلب تحميل الألعاب
            </p>
          </motion.div>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          {/* نموذج البحث */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-center">تتبع طلب الألعاب</CardTitle>
                <CardDescription className="text-center">
                  أدخل رقم التتبع أو رقم الهاتف المسجل في الطلب
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="رقم التتبع أو رقم الهاتف (مثل: GD-000001 أو 0123456789)"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleTrackOrder()}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => handleTrackOrder()} 
                    disabled={loading}
                    className="px-6"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        بحث
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* نتائج البحث */}
          {renderGameResult()}
        </div>
      </div>
    </>
  );
};

export default PublicGameTracking;
