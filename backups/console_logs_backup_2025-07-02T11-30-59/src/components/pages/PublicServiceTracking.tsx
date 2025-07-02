import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { ServiceStatus, ServiceBooking, ServiceProgress } from '@/types';
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
import { AlertCircle, CheckCircle, Clock, Search, XCircle, ArrowRight, Copy, Check, ChevronLeft, ChevronRight, Wrench, Phone } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';

// تكوين حالات الخدمة
const statusConfig = {
  pending: {
    label: 'قيد الانتظار',
    color: 'bg-yellow-100 text-yellow-800',
    icon: <Clock className="h-4 w-4 mr-1" />,
  },
  in_progress: {
    label: 'قيد التنفيذ',
    color: 'bg-blue-100 text-blue-800',
    icon: <Clock className="h-4 w-4 mr-1" />,
  },
  completed: {
    label: 'مكتملة',
    color: 'bg-green-100 text-green-800',
    icon: <CheckCircle className="h-4 w-4 mr-1" />,
  },
  cancelled: {
    label: 'ملغاة',
    color: 'bg-red-100 text-red-800',
    icon: <XCircle className="h-4 w-4 mr-1" />,
  },
  delayed: {
    label: 'مؤجلة',
    color: 'bg-purple-100 text-purple-800',
    icon: <AlertCircle className="h-4 w-4 mr-1" />,
  },
};

// نوع البيانات المستردة من الاستعلام
interface ServiceTrackingResult {
  id: string;
  service_id: string;
  service_name: string;
  price: number;
  scheduled_date?: string;
  notes?: string;
  status: ServiceStatus;
  assigned_to?: string;
  completed_at?: string;
  customer_name?: string;
  customer_phone?: string;
  order_id: string;
  progress?: ServiceProgress[];
  order?: {
    id: string;
    created_at: string;
  };
  public_tracking_code?: string;
}

// نوع خدمة للواجهة العامة
interface PublicService {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  estimatedTime: string;
  image?: string;
  isPriceDynamic: boolean;
}

const PublicServiceTracking: React.FC = () => {
  const [activeTab, setActiveTab] = useState('services');
  const [trackingCode, setTrackingCode] = useState('');
  const [serviceResult, setServiceResult] = useState<ServiceTrackingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [progressHistory, setProgressHistory] = useState<ServiceProgress[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { currentOrganization } = useTenant();
  const { currentSubdomain } = useAuth();

  // استرجاع قائمة الخدمات
  useEffect(() => {
    const fetchServices = async () => {
      setIsLoadingServices(true);
      try {
        // حصول على معرف المؤسسة
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
        
        // إذا لم يتم العثور على معرف المؤسسة، عرض خطأ
        if (!organizationId) {
          setServices([]);
          return;
        }
        
        // استعلام الخدمات باستخدام معرف المؤسسة
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('is_available', true)
          .eq('organization_id', organizationId)
          .order('price', { ascending: true });

        if (error) {
          throw error;
        }

        // تحويل البيانات إلى نموذج PublicService
        const formattedServices = data.map(service => ({
          id: service.id,
          name: service.name,
          description: service.description,
          price: service.price,
          category: service.category,
          estimatedTime: service.estimated_time,
          image: service.image,
          isPriceDynamic: service.is_price_dynamic || false
        }));

        setServices(formattedServices);
      } catch (err) {
        setServices([]);
      } finally {
        setIsLoadingServices(false);
      }
    };

    fetchServices();
  }, [currentOrganization, currentSubdomain]);

  // الخدمات المعروضة في الصفحة الحالية
  const currentServices = useMemo(() => {
    const firstItemIndex = (currentPage - 1) * itemsPerPage;
    return services.slice(firstItemIndex, firstItemIndex + itemsPerPage);
  }, [services, currentPage]);

  // حساب عدد الصفحات
  const totalPages = Math.ceil(services.length / itemsPerPage);

  // التنقل بين الصفحات
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // دالة للبحث عن خدمة باستخدام كود التتبع أو رقم الهاتف
  const handleTrackService = async () => {
    if (!trackingCode.trim()) {
      setError('يرجى إدخال رمز التتبع أو رقم الهاتف للبحث عن خدمتك');
      return;
    }

    setIsLoading(true);
    setError('');
    setServiceResult(null);
    setProgressHistory([]);

    try {
      let serviceData: any = null;
      let serviceError: any = null;

      // حصول على معرف المؤسسة للتحقق
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
      const isPhoneNumber = /^[0-9+\-\s()]+$/.test(trackingCode.trim());
      
      if (isPhoneNumber) {
        // البحث برقم الهاتف
        const { data: phoneSearchData, error: phoneSearchError } = await supabase
          .from('service_bookings')
          .select(`
            *,
            orders:order_id (id, created_at, organization_id)
          `)
          .eq('customer_phone', trackingCode.trim())
          .order('created_at', { ascending: false });

        if (!phoneSearchError && phoneSearchData && phoneSearchData.length > 0) {
          // فلترة الخدمات التي تنتمي للمؤسسة الحالية
          const orgServices = organizationId ? 
            phoneSearchData.filter(s => s.orders && s.orders.organization_id === organizationId) : 
            phoneSearchData;
            
          if (orgServices.length > 0) {
            // اختر أحدث خدمة
            serviceData = orgServices[0];
          } else {
            setError('لم يتم العثور على خدمات مرتبطة بهذا الرقم في المتجر الحالي');
            return;
          }
        } else {
          setError('لم يتم العثور على خدمات مرتبطة بهذا الرقم');
          return;
        }
      } else {
        // البحث بكود التتبع (الكود الأصلي)
      // 1. أولا، محاولة البحث المباشر باستخدام كود التتبع العام
      const { data: trackingCodeData, error: trackingCodeError } = await supabase
        .from('service_bookings')
        .select(`
          *,
          orders:order_id (id, created_at, organization_id)
        `)
        .eq('public_tracking_code', trackingCode)
        .single();

      if (!trackingCodeError && trackingCodeData) {
        // التحقق من أن الخدمة تنتمي للمؤسسة الحالية
        if (organizationId && trackingCodeData.orders && trackingCodeData.orders.organization_id !== organizationId) {
          setError('الخدمة المطلوبة غير موجودة أو لا تنتمي للمتجر الحالي');
          return;
        }
        serviceData = trackingCodeData;
      } else {
        // 2. محاولة البحث باستخدام معرف الخدمة الرئيسي
        const { data: directIdData, error: directIdError } = await supabase
          .from('service_bookings')
          .select(`
            *,
            orders:order_id (id, created_at, organization_id)
          `)
          .eq('id', trackingCode)
          .single();

        if (!directIdError && directIdData) {
          // التحقق من أن الخدمة تنتمي للمؤسسة الحالية
          if (organizationId && directIdData.orders && directIdData.orders.organization_id !== organizationId) {
            setError('الخدمة المطلوبة غير موجودة أو لا تنتمي للمتجر الحالي');
            return;
          }
          serviceData = directIdData;
        } else {
          // 3. إذا لم يتم العثور على الخدمة، استخدم استراتيجيات بحث أخرى
          // البحث باستخدام تنسيق SRV-XXXX-XXXX (للتوافقية مع الخدمات القديمة)
          if (trackingCode.match(/^SRV-\d{4}-\d{4}$/)) {
            const { data: srvServiceData, error: srvError } = await supabase
              .from('service_bookings')
              .select(`
                *,
                orders:order_id (id, created_at, organization_id)
              `)
              .eq('id', trackingCode)
              .single();
              
            if (!srvError && srvServiceData) {
              // التحقق من أن الخدمة تنتمي للمؤسسة الحالية
              if (organizationId && srvServiceData.orders && srvServiceData.orders.organization_id !== organizationId) {
                setError('الخدمة المطلوبة غير موجودة أو لا تنتمي للمتجر الحالي');
                return;
              }
              serviceData = srvServiceData;
            } else {
              // البحث عن معرّفات UUID التي تبدأ بنفس الأحرف
              // هذا للتوافق مع الخدمات القديمة التي تم تحويل معرّفاتها يدويًا
              const searchParts = trackingCode.replace('SRV-', '').split('-');
              if (searchParts.length === 2) {
                const searchPattern = `${searchParts[0]}${searchParts[1]}%`;
                
                const { data: uuidServices, error: uuidError } = await supabase
                  .from('service_bookings')
                  .select(`
                    *,
                    orders:order_id (id, created_at, organization_id)
                  `)
                  .ilike('id', searchPattern)
                  .limit(10);
                
                if (!uuidError && uuidServices && uuidServices.length > 0) {
                  // فلترة الخدمات التي تنتمي للمؤسسة الحالية
                  const orgServices = organizationId ? 
                    uuidServices.filter(s => s.orders && s.orders.organization_id === organizationId) : 
                    uuidServices;
                    
                  if (orgServices.length > 0) {
                    // اختر أول خدمة متطابقة
                    serviceData = orgServices[0];
                  } else {
                    setError('الخدمة المطلوبة غير موجودة أو لا تنتمي للمتجر الحالي');
                    return;
                  }
                }
              }
            }
          }
          // استراتيجية للبحث عن الطلبات بتنسيق POS-XXXXXXXX
          else if (trackingCode.startsWith('POS-')) {
            // نحاول عدة طرق للبحث عن خدمة مرتبطة بمعرف الطلب
            const orderNumber = trackingCode.slice(4); // إزالة "POS-"
            
            // جلب جميع الخدمات المضافة مؤخرًا
            let query = supabase
              .from('service_bookings')
              .select(`
                *,
                orders:order_id (id, created_at, organization_id)
              `)
              .order('created_at', { ascending: false })
              .limit(100);
              
            // أضف شرط المؤسسة إذا كان متاحًا
            if (organizationId) {
              query = query.eq('orders.organization_id', organizationId);
            }
            
            const { data: recentServices, error: recentServicesError } = await query;
            
            if (!recentServicesError && recentServices && recentServices.length > 0) {
              // البحث يدويًا في النتائج عن خدمة مرتبطة بالطلب
              const matchingService = recentServices.find(service => 
                service.order_id && (
                  service.order_id.includes(orderNumber) || 
                  service.order_id.includes(trackingCode)
                )
              );
              
              if (matchingService) {
                serviceData = matchingService;
                }
              }
            }
          }
        }
      }

      // إذا وجدنا الخدمة، قم بإعداد النتيجة
      if (serviceData) {
        // 4. جلب تاريخ التحديثات للخدمة التي تم العثور عليها
        const { data: progressData, error: progressError } = await supabase
          .from('service_progress')
          .select('*')
          .eq('service_booking_id', serviceData.id)
          .order('timestamp', { ascending: false });

        if (progressError) {
        } else if (progressData) {
          // تحويل تنسيق البيانات للتوافق مع واجهة ServiceProgress
          const formattedProgress: ServiceProgress[] = progressData.map(item => ({
            id: item.id,
            serviceBookingId: item.service_booking_id,
            status: item.status as ServiceStatus,
            note: item.note || undefined,
            timestamp: new Date(item.timestamp),
            createdBy: item.created_by
          }));
          setProgressHistory(formattedProgress);
        }

        setServiceResult(serviceData as ServiceTrackingResult);
      } else {
        setError(isPhoneNumber ? 'لم يتم العثور على خدمات مرتبطة بهذا الرقم' : 'لم يتم العثور على خدمة بهذا الرمز');
      }
    } catch (err) {
      setError('حدث خطأ أثناء البحث عن الخدمة');
    } finally {
      setIsLoading(false);
    }
  };

  // تنسيق عرض تاريخ الخدمة
  const formatServiceDate = (dateString: string | undefined): string => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) + ' ' + date.toLocaleTimeString('en-US', {
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

  // عرض نتيجة البحث عن الخدمة
  const renderServiceResult = () => {
    if (!serviceResult) return null;

    return (
      <Card className="mt-6 overflow-hidden shadow-lg border-border/50">
        <CardHeader className="bg-primary/5 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl mb-1">
                {serviceResult.service_name}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                رمز التتبع: 
                <span className="font-mono font-medium bg-primary/10 px-2 py-0.5 rounded-sm">{serviceResult.public_tracking_code || serviceResult.id}</span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6 rounded-full" 
                  onClick={() => copyTrackingCode(serviceResult.public_tracking_code || serviceResult.id)}
                  title="نسخ رمز التتبع"
                >
                  {isCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </CardDescription>
            </div>
            <Badge 
              variant="outline" 
              className={`${statusConfig[serviceResult.status].color} flex items-center`}
            >
              {statusConfig[serviceResult.status].icon}
              {statusConfig[serviceResult.status].label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">معلومات الخدمة</h3>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">العميل</span>
                  <span className="font-medium">{serviceResult.customer_name || 'غير محدد'}</span>
                </div>
                {serviceResult.customer_phone && (
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">رقم الهاتف</span>
                    <span className="font-medium">{serviceResult.customer_phone}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">تاريخ الاستلام</span>
                  <span className="font-medium">{formatServiceDate(serviceResult.order?.created_at)}</span>
                </div>
                {serviceResult.scheduled_date && (
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">موعد التسليم المتوقع</span>
                    <span className="font-medium">{formatServiceDate(serviceResult.scheduled_date)}</span>
                  </div>
                )}
                {serviceResult.completed_at && (
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">تاريخ الإكمال</span>
                    <span className="font-medium">{formatServiceDate(serviceResult.completed_at)}</span>
                  </div>
                )}
                {serviceResult.notes && (
                  <div className="flex flex-col py-1 border-b">
                    <span className="text-muted-foreground mb-1">ملاحظات</span>
                    <span className="font-medium text-sm">{serviceResult.notes}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">تاريخ التحديثات</h3>
              {progressHistory.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {progressHistory.map((progress, index) => (
                    <div key={progress.id} className="border rounded-md p-3 bg-card">
                      <div className="flex items-center justify-between mb-1">
                        <Badge 
                          variant="outline" 
                          className={`${statusConfig[progress.status].color} flex items-center`}
                        >
                          {statusConfig[progress.status].icon}
                          {statusConfig[progress.status].label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(progress.timestamp)}
                        </span>
                      </div>
                      {progress.note && (
                        <p className="text-sm mt-2 bg-muted/50 p-2 rounded-sm">{progress.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground border rounded-md">
                  لا يوجد تحديثات سابقة
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
              خدمات الإصلاح والصيانة
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">خدمات صيانة وإصلاح احترافية</h1>
            <p className="text-xl text-muted-foreground mb-6">نقدم مجموعة متكاملة من خدمات الصيانة والإصلاح مع ضمان الجودة وسرعة الإنجاز</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button size="lg" onClick={() => setActiveTab('services')} className="rounded-full">
                استعرض الخدمات
              </Button>
              <Button size="lg" onClick={() => setActiveTab('tracking')} variant="outline" className="rounded-full">
                <Search className="h-4 w-4 mr-2" />
                تتبع طلب صيانة
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="container py-16">
        <Tabs defaultValue="services" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="services" className="text-lg py-3">الخدمات المتاحة</TabsTrigger>
            <TabsTrigger value="tracking" className="text-lg py-3">تتبع خدمتك</TabsTrigger>
          </TabsList>
          
          <TabsContent value="services" className="space-y-8">
            {isLoadingServices ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">جاري تحميل الخدمات...</p>
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Wrench className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-xl">لا توجد خدمات متاحة حالياً</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {currentServices.map((service) => (
                    <motion.div
                      key={service.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5 }}
                    >
                      <Card className="overflow-hidden h-full transition-all hover:shadow-md border-border/60 group">
                        {service.image ? (
                          <div className="h-48 overflow-hidden">
                            <img 
                              src={service.image} 
                              alt={service.name} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>
                        ) : (
                          <div className="h-48 bg-muted flex items-center justify-center">
                            <Wrench className="h-12 w-12 text-muted-foreground/40" />
                          </div>
                        )}
                        <CardHeader className="pb-2">
                          <CardTitle>{service.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {service.description || 'لا يوجد وصف متاح لهذه الخدمة.'}
                          </p>
                          
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                الوقت المقدر:
                              </span>
                              <span className="font-medium">{service.estimatedTime || 'غير محدد'}</span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">السعر:</span>
                              <span className="font-bold text-lg text-primary">
                                {service.isPriceDynamic ? 'سعر مفتوح' : `${service.price} دج`}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button 
                            className="w-full group-hover:bg-primary group-hover:text-white transition-colors" 
                            variant="outline"
                            onClick={() => {
                              document.querySelector('.contact-section')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                          >
                            طلب الخدمة
                            <ArrowRight className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1" />
                          </Button>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))}
                </div>
                
                {/* إضافة التصفح */}
                {services.length > itemsPerPage && (
                  <div className="flex items-center justify-center mt-10">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                        <span className="sr-only">الصفحة السابقة</span>
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let pageNum;
                          
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={i}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              className="w-8 h-8 p-0"
                              onClick={() => goToPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                        
                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <>
                            <span className="mx-1">...</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-8 h-8 p-0"
                              onClick={() => goToPage(totalPages)}
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">الصفحة التالية</span>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="tracking" className="space-y-8">
            <Card className="border-border/60 shadow-lg overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-2xl">تتبع حالة خدمتك</CardTitle>
                <CardDescription>
                  أدخل رمز التتبع الخاص بخدمتك أو رقم الهاتف المسجل لمعرفة حالتها الحالية وتفاصيل الإصلاح
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                      type="text"
                      placeholder="أدخل رمز التتبع أو رقم الهاتف..."
                      className="pl-10"
                      value={trackingCode}
                      onChange={(e) => setTrackingCode(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleTrackService} disabled={isLoading} className="md:w-auto w-full">
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                        جاري البحث...
                      </>
                    ) : 'تتبع الخدمة'}
                  </Button>
                </div>
                
                {error && (
                  <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
                
                {renderServiceResult()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* قسم الاتصال */}
      <section className="bg-muted/30 py-16 contact-section">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto mb-12"
          >
            <Badge variant="outline" className="bg-primary/10 text-primary font-medium mb-4 px-3 py-1">
              تواصل معنا
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">هل تحتاج إلى مساعدة؟</h2>
            <p className="text-muted-foreground text-lg">
              فريقنا جاهز لمساعدتك والإجابة على جميع استفساراتك حول خدمات الصيانة والإصلاح
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="border-border/60 h-full">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>اتصل بنا</CardTitle>
                  <CardDescription>متاحون للرد على استفساراتكم على مدار الساعة</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-medium text-lg">+966 12 345 6789</p>
                  <p className="text-muted-foreground">support@example.com</p>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="border-border/60 h-full">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>ساعات العمل</CardTitle>
                  <CardDescription>متاحون طوال أيام الأسبوع لخدمتكم</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">السبت - الخميس</p>
                  <p className="text-muted-foreground mb-2">9:00 صباحاً - 9:00 مساءً</p>
                  <p className="font-medium">الجمعة</p>
                  <p className="text-muted-foreground">2:00 ظهراً - 9:00 مساءً</p>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="md:col-span-2 lg:col-span-1"
            >
              <Card className="border-border/60 h-full">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Wrench className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>خدمة سريعة</CardTitle>
                  <CardDescription>نقدم خدمة صيانة سريعة وفعالة</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">نحن نسعى دائمًا لتقديم خدمة صيانة سريعة مع الحفاظ على الجودة العالية في الأداء</p>
                  <Button onClick={() => setActiveTab('services')} variant="outline" className="w-full">تصفح خدمات الصيانة</Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export default PublicServiceTracking;
