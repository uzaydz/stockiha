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
  CardFooter,
} from '@/components/ui/card';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, Clock, Search, XCircle, ArrowRight, Copy, Check, ChevronLeft, ChevronRight, Wrench, Phone, Settings } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';

// تكوين حالات الخدمة
const statusConfig = {
  'قيد الانتظار': {
    label: 'قيد الانتظار',
    color: 'bg-yellow-100 text-yellow-800',
    icon: <Clock className="h-4 w-4 mr-1" />,
  },
  'جاري التصليح': {
    label: 'جاري التصليح',
    color: 'bg-blue-100 text-blue-800',
    icon: <Settings className="h-4 w-4 mr-1 animate-spin" />,
  },
  'مكتمل': {
    label: 'مكتمل',
    color: 'bg-green-100 text-green-800',
    icon: <CheckCircle className="h-4 w-4 mr-1" />,
  },
  'ملغي': {
    label: 'ملغي',
    color: 'bg-red-100 text-red-800',
    icon: <XCircle className="h-4 w-4 mr-1" />,
  },
  'معلق': {
    label: 'معلق',
    color: 'bg-purple-100 text-purple-800',
    icon: <AlertCircle className="h-4 w-4 mr-1" />,
  },
};

// نوع البيانات المستردة من الاستعلام
interface RepairOrderResult {
  id: string;
  order_number?: string;
  customer_name: string;
  customer_phone: string;
  repair_location_id?: string;
  custom_location?: string;
  repair_location_name?: string;
  issue_description?: string;
  status: string;
  total_price: number;
  paid_amount: number;
  received_by: string;
  received_by_name?: string;
  created_at: string;
  completed_at?: string;
  payment_method?: string;
  repair_notes?: string;
  repair_tracking_code?: string;
  organization_id: string;
  images?: {
    id: string;
    repair_order_id: string;
    image_url: string;
    image_type: string;
    description?: string;
    created_at: string;
  }[];
  history?: {
    id: string;
    repair_order_id: string;
    status: string;
    notes?: string;
    created_by: string;
    created_at: string;
    users?: {
      name: string;
    };
  }[];
  repair_location?: {
    id: string;
    name: string;
    description?: string;
    address?: string;
    phone?: string;
  };
  staff?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
}

const PublicRepairTracking: React.FC = () => {
  const [activeTab, setActiveTab] = useState('tracking');
  const [trackingCode, setTrackingCode] = useState('');
  const [repairOrder, setRepairOrder] = useState<RepairOrderResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const { currentOrganization } = useTenant();
  const { currentSubdomain } = useAuth();
  const { trackingCode: urlTrackingCode } = useParams<{ trackingCode?: string }>();

  // استخدام رمز التتبع من عنوان URL إذا كان متاحًا
  useEffect(() => {
    if (urlTrackingCode) {
      setTrackingCode(urlTrackingCode);
      handleTrackRepair(urlTrackingCode);
    }
  }, [urlTrackingCode]);

  // تعديل الدالة لتقبل معلمة اختيارية لرمز التتبع
  const handleTrackRepair = async (codeToTrack?: string) => {
    const codeToSearch = codeToTrack || trackingCode.trim();
    
    if (!codeToSearch) {
      setError('يرجى إدخال رمز التتبع أو رقم الطلبية للبحث');
      return;
    }

    setIsLoading(true);
    setError(null);
    setRepairOrder(null);

    try {
      let organizationId = currentOrganization?.id;
      
      // إذا كان هناك نطاق فرعي ولكن لا يوجد معرف مؤسسة، ابحث عن المؤسسة باستخدام النطاق الفرعي
      if (!organizationId && currentSubdomain) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('subdomain', currentSubdomain)
          .single();
        
        if (!orgError && orgData) {
          organizationId = orgData.id;
        }
      }

      // التحقق من نوع البحث (رقم هاتف أم كود تتبع)
      const isPhoneNumber = /^[0-9+\-\s()]+$/.test(codeToSearch);
      
      if (isPhoneNumber) {
        // البحث برقم الهاتف
        const { data: phoneSearchData, error: phoneSearchError } = await supabase
          .from('repair_orders')
          .select(`
            *,
            images:repair_images(*),
            history:repair_status_history(*, users(name)),
            repair_location:repair_locations(id, name, description, address, phone),
            staff:users(id, name, email, phone)
          `)
          .eq('customer_phone', codeToSearch)
          .order('created_at', { ascending: false });

        if (!phoneSearchError && phoneSearchData && phoneSearchData.length > 0) {
          // فلترة الطلبيات التي تنتمي للمؤسسة الحالية
          const orgOrders = organizationId ? 
            phoneSearchData.filter(order => order.organization_id === organizationId) : 
            phoneSearchData;
            
          if (orgOrders.length > 0) {
            // اختر أحدث طلبية
            setRepairOrder(orgOrders[0] as RepairOrderResult);
          } else {
            setError('لم يتم العثور على طلبيات تصليح مرتبطة بهذا الرقم في المتجر الحالي');
          }
        } else {
          setError('لم يتم العثور على طلبيات تصليح مرتبطة بهذا الرقم');
        }
      } else {
        // البحث بكود التتبع أو رقم الطلبية
        
        // 1. البحث برمز التتبع
        const { data: trackingCodeData, error: trackingCodeError } = await supabase
          .from('repair_orders')
          .select(`
            *,
            images:repair_images(*),
            history:repair_status_history(*, users(name)),
            repair_location:repair_locations(id, name, description, address, phone),
            staff:users(id, name, email, phone)
          `)
          .eq('repair_tracking_code', codeToSearch)
          .single();

        if (!trackingCodeError && trackingCodeData) {
          setRepairOrder(trackingCodeData as RepairOrderResult);
        } else {
          // 2. البحث برقم الطلبية
          const { data: orderNumberData, error: orderNumberError } = await supabase
            .from('repair_orders')
            .select(`
              *,
              images:repair_images(*),
              history:repair_status_history(*, users(name)),
              repair_location:repair_locations(id, name, description, address, phone),
              staff:users(id, name, email, phone)
            `)
            .eq('order_number', codeToSearch)
            .single();

          if (!orderNumberError && orderNumberData) {
            setRepairOrder(orderNumberData as RepairOrderResult);
          } else {
            // 3. البحث بمعرف الطلبية مباشرة
            const { data: directIdData, error: directIdError } = await supabase
              .from('repair_orders')
              .select(`
                *,
                images:repair_images(*),
                history:repair_status_history(*, users(name)),
                repair_location:repair_locations(id, name, description, address, phone),
                staff:users(id, name, email, phone)
              `)
              .eq('id', codeToSearch)
              .single();

            if (!directIdError && directIdData) {
              setRepairOrder(directIdData as RepairOrderResult);
            } else {
              setError('لم يتم العثور على طلبية تصليح بهذا الرمز');
            }
          }
        }
      }
    } catch (err) {
      setError('حدث خطأ أثناء البحث عن طلبية التصليح');
    } finally {
      setIsLoading(false);
    }
  };

  // تنسيق عرض تاريخ الطلبية
  const formatRepairDate = (dateString: string | undefined): string => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) + ' ' + date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // دالة لنسخ كود التتبع إلى الحافظة
  const copyTrackingCode = (code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setIsCopied(true);
        toast.success('تم نسخ رمز التتبع');
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => {
        toast.error('حدث خطأ أثناء نسخ الرمز');
      });
  };

  // عرض نتيجة البحث عن طلبية التصليح
  const renderRepairResult = () => {
    if (!repairOrder) return null;

    return (
      <Card className="mt-6 overflow-hidden shadow-lg border-border/50">
        <CardHeader className="bg-primary/5 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl mb-1">
                تصليح #{repairOrder.order_number || repairOrder.id.slice(0, 8)}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                رمز التتبع: 
                <span className="font-mono font-medium bg-primary/10 px-2 py-0.5 rounded-sm">
                  {repairOrder.repair_tracking_code || repairOrder.order_number || repairOrder.id.slice(0, 8)}
                </span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6 rounded-full" 
                  onClick={() => copyTrackingCode(repairOrder.repair_tracking_code || repairOrder.order_number || repairOrder.id)}
                  title="نسخ رمز التتبع"
                >
                  {isCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </CardDescription>
            </div>
            <Badge 
              variant="outline" 
              className={`${statusConfig[repairOrder.status]?.color || 'bg-gray-100 text-gray-800'} flex items-center`}
            >
              {statusConfig[repairOrder.status]?.icon || <Clock className="h-4 w-4 mr-1" />}
              {statusConfig[repairOrder.status]?.label || repairOrder.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">معلومات الطلبية</h3>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">العميل</span>
                  <span className="font-medium">{repairOrder.customer_name || 'غير محدد'}</span>
                </div>
                {repairOrder.customer_phone && (
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">رقم الهاتف</span>
                    <span className="font-medium">{repairOrder.customer_phone}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">تاريخ الاستلام</span>
                  <span className="font-medium">{formatRepairDate(repairOrder.created_at)}</span>
                </div>
                {repairOrder.completed_at && (
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">تاريخ الإكمال</span>
                    <span className="font-medium">{formatRepairDate(repairOrder.completed_at)}</span>
                  </div>
                )}
                {repairOrder.issue_description && (
                  <div className="flex flex-col py-1 border-b">
                    <span className="text-muted-foreground mb-1">وصف العطل</span>
                    <span className="font-medium text-sm">{repairOrder.issue_description}</span>
                  </div>
                )}
                {repairOrder.repair_notes && (
                  <div className="flex flex-col py-1 border-b">
                    <span className="text-muted-foreground mb-1">ملاحظات</span>
                    <span className="font-medium text-sm">{repairOrder.repair_notes}</span>
                  </div>
                )}
                {repairOrder.repair_location && (
                  <div className="flex flex-col py-1 border-b">
                    <span className="text-muted-foreground mb-1">مكان التصليح</span>
                    <span className="font-medium text-sm">{repairOrder.repair_location.name}</span>
                    {repairOrder.repair_location.address && (
                      <span className="text-xs text-muted-foreground">{repairOrder.repair_location.address}</span>
                    )}
                  </div>
                )}
                {repairOrder.custom_location && (
                  <div className="flex flex-col py-1 border-b">
                    <span className="text-muted-foreground mb-1">مكان التصليح</span>
                    <span className="font-medium text-sm">{repairOrder.custom_location}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">السعر الكلي</span>
                  <span className="font-medium">{repairOrder.total_price.toLocaleString()} دج</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">المبلغ المدفوع</span>
                  <span className="font-medium">{repairOrder.paid_amount.toLocaleString()} دج</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">المبلغ المتبقي</span>
                  <span className="font-medium">{(repairOrder.total_price - repairOrder.paid_amount).toLocaleString()} دج</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">تاريخ التحديثات</h3>
              {repairOrder.history && repairOrder.history.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {repairOrder.history.map((entry, index) => (
                    <div key={entry.id} className="border rounded-md p-3 bg-card">
                      <div className="flex items-center justify-between mb-1">
                        <Badge 
                          variant="outline" 
                          className={`${statusConfig[entry.status]?.color || 'bg-gray-100 text-gray-800'} flex items-center`}
                        >
                          {statusConfig[entry.status]?.icon || <Clock className="h-4 w-4 mr-1" />}
                          {statusConfig[entry.status]?.label || entry.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(new Date(entry.created_at))}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-sm mt-2 bg-muted/50 p-2 rounded-sm">{entry.notes}</p>
                      )}
                      {entry.users?.name && (
                        <div className="text-xs text-muted-foreground mt-2">
                          بواسطة: {entry.users.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground border rounded-md">
                  لا يوجد تحديثات سابقة
                </div>
              )}
              
              {repairOrder.images && repairOrder.images.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">صور الجهاز</h3>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {repairOrder.images.map(image => (
                      <div key={image.id} className="relative group overflow-hidden rounded-md">
                        <img
                          src={image.image_url}
                          alt={image.description || 'صورة الجهاز'}
                          className="w-full h-32 object-cover rounded-md"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="text-white text-center p-2">
                            <div className="text-xs">
                              {image.image_type === 'before' ? 'قبل التصليح' : 'بعد التصليح'}
                            </div>
                            {image.description && (
                              <div className="text-sm mt-1">{image.description}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
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
              خدمات التصليح والصيانة
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">تتبع طلبية التصليح الخاصة بك</h1>
            <p className="text-xl text-muted-foreground mb-6">ادخل رمز التتبع أو رقم الطلبية أو رقم الهاتف للاطلاع على حالة طلبية التصليح</p>
          </motion.div>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="container py-16">
        <div className="max-w-2xl mx-auto">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>تتبع طلبية التصليح</CardTitle>
              <CardDescription>
                أدخل رمز التتبع أو رقم الطلبية أو رقم الهاتف للبحث
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="رمز التتبع / رقم الطلبية / رقم الهاتف"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    className="pl-9"
                    onKeyDown={(e) => e.key === 'Enter' && handleTrackRepair()}
                  />
                </div>
                <Button 
                  onClick={() => handleTrackRepair()} 
                  disabled={isLoading}
                  className="gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      جارٍ البحث...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      بحث
                    </>
                  )}
                </Button>
              </div>
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* نتيجة البحث */}
          {repairOrder && renderRepairResult()}
        </div>
      </div>
    </>
  );
};

export default PublicRepairTracking;
