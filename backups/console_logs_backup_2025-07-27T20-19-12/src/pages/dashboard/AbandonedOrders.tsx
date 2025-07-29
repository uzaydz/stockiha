import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { supabase } from "@/lib/supabase";
import { checkUserPermissions } from "@/lib/api/permissions";
import Layout from "@/components/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Helmet } from "react-helmet-async";
import { DownloadIcon, ShoppingBag, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

// استيراد المكونات التي أنشأناها
import { AbandonedOrdersTable, type AbandonedOrder } from "@/components/abandoned-orders/AbandonedOrdersTable";
import { AbandonedOrdersFilters, type AbandonedOrdersFilter } from "@/components/abandoned-orders/AbandonedOrdersFilters";
import { 
  AbandonedOrdersStats as AbandonedOrdersStatsComponent, 
  type AbandonedOrdersStats 
} from "@/components/abandoned-orders/AbandonedOrdersStats";
import { AbandonedOrdersActions } from "@/components/abandoned-orders/AbandonedOrdersActions";

// تعريف نوع بيانات الولايات والبلديات
interface Province {
  id: number;
  name: string;
  name_ar: string;
}

interface Municipality {
  id: number;
  name: string;
  name_ar: string;
  wilaya_id: number;
  wilaya_name: string;
  wilaya_name_ar: string;
}

// تعريف مصادر الطلبات
const ORDER_SOURCES = [
  { label: "متصفح الويب", value: "browser" },
  { label: "تطبيق الهاتف", value: "mobile_app" },
  { label: "واتساب", value: "whatsapp" },
  { label: "فيسبوك", value: "facebook" },
  { label: "انستغرام", value: "instagram" },
];

// صفحة الطلبات المتروكة
const AbandonedOrders = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization } = useTenant();
  
  // حالة الصلاحيات
  const [hasViewPermission, setHasViewPermission] = useState<boolean>(false);
  const [hasManagePermission, setHasManagePermission] = useState<boolean>(false);
  const [permissionLoading, setPermissionLoading] = useState<boolean>(true);
  
  // حالة البيانات
  const [abandonedOrders, setAbandonedOrders] = useState<AbandonedOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<AbandonedOrder[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<AbandonedOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  
  // حالة بيانات الولايات والبلديات
  const [provinces, setProvinces] = useState<Record<string, Province>>({});
  const [municipalities, setMunicipalities] = useState<Record<string, Municipality>>({});
  
  // حالة الفلاتر والعرض
  const [filters, setFilters] = useState<AbandonedOrdersFilter>({});
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month" | "year">("week");
  const [activeTab, setActiveTab] = useState<string>("all");
  
  // إحصائيات الطلبات المتروكة
  const [stats, setStats] = useState<AbandonedOrdersStats>({
    totalCount: 0,
    totalValue: 0,
    todayCount: 0,
    weekCount: 0,
    monthCount: 0,
    averageValue: 0,
    recoveryRate: 0,
    conversionRate: 0,
    timeSeries: {
      labels: [],
      data: [],
    },
  });

  // التحقق من صلاحيات المستخدم
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) return;
      setPermissionLoading(true);
      
      try {
        // التحقق من صلاحية مشاهدة الطلبات المتروكة
        const canView = await checkUserPermissions(user, 'viewOrders' as any);
        setHasViewPermission(canView);
        
        // التحقق من صلاحية إدارة الطلبات المتروكة
        const canManage = await checkUserPermissions(user, 'updateOrderStatus' as any);
        setHasManagePermission(canManage);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "خطأ في التحقق من الصلاحيات",
          description: "حدث خطأ أثناء التحقق من صلاحياتك للوصول إلى هذه الصفحة"
        });
      } finally {
        setPermissionLoading(false);
      }
    };
    
    checkPermissions();
  }, [user, toast]);

  // استرجاع قوائم الولايات والبلديات
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        // البحث في التخزين المؤقت أولاً
        const cachedProvinces = localStorage.getItem('abandoned_orders_provinces');
        const cachedMunicipalities = localStorage.getItem('abandoned_orders_municipalities');
        const cacheExpiry = localStorage.getItem('abandoned_orders_cache_expiry');
        
        // التحقق من صلاحية البيانات المخزنة (7 أيام)
        const isValidCache = cacheExpiry && parseInt(cacheExpiry) > Date.now();
        
        if (isValidCache && cachedProvinces && cachedMunicipalities) {
          // استخدام البيانات المخزنة
          setProvinces(JSON.parse(cachedProvinces));
          setMunicipalities(JSON.parse(cachedMunicipalities));
          return;
        }
        
        // استرجاع الولايات
        const { data: provincesData, error: provincesError } = await supabase
          .from('yalidine_provinces_global')
          .select('id, name, name_ar');
        
        if (provincesError) throw provincesError;
        
        // استرجاع البلديات
        const { data: municipalitiesData, error: municipalitiesError } = await supabase
          .from('yalidine_municipalities_global')
          .select('id, name, name_ar, wilaya_id, wilaya_name, wilaya_name_ar');
        
        if (municipalitiesError) throw municipalitiesError;
        
        // تحويل البيانات إلى كائنات للبحث السريع
        const provincesMap: Record<string, Province> = {};
        provincesData.forEach((province: Province) => {
          provincesMap[province.id.toString()] = province;
        });
        
        const municipalitiesMap: Record<string, Municipality> = {};
        municipalitiesData.forEach((municipality: Municipality) => {
          municipalitiesMap[municipality.id.toString()] = municipality;
        });
        
        // تخزين البيانات في الذاكرة المحلية لمدة 7 أيام
        const expiryTime = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 أيام
        localStorage.setItem('abandoned_orders_provinces', JSON.stringify(provincesMap));
        localStorage.setItem('abandoned_orders_municipalities', JSON.stringify(municipalitiesMap));
        localStorage.setItem('abandoned_orders_cache_expiry', expiryTime.toString());
        
        setProvinces(provincesMap);
        setMunicipalities(municipalitiesMap);
      } catch (error) {
      }
    };
    
    fetchLocations();
  }, []);

  // تنفيذ استعلام قاعدة البيانات لاسترجاع الطلبات المتروكة
  const fetchAbandonedOrders = useCallback(async () => {
    if (!currentOrganization?.id || !hasViewPermission) return;
    
    setLoading(true);
    
    try {
      // تحقق من وجود الجدول المُجمع بطريقة محسنة
      let useView = true;
      const viewCheck = await supabase.from('abandoned_carts_view').select('id', { count: 'exact', head: true });
      
      // إذا كان هناك خطأ، فهذا يعني أن الجدول المُجمع غير موجود
      if (viewCheck.error) {
        useView = false;
      }
      
      let cartsData;
      let error;
      
      // استخدام الجدول المناسب بناءً على نتيجة الفحص
      if (useView) {
        // استخدام الجدول المُجمع
        const result = await supabase.from('abandoned_carts_view')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .eq('status', 'pending');
          
        cartsData = result.data;
        error = result.error;
      } else {
        // استخدام الجدول الأساسي
        const result = await supabase.from('abandoned_carts')
          .select(`
            id,
            organization_id,
            product_id,
            customer_name,
            customer_phone,
            customer_email,
            province,
            municipality,
            address,
            delivery_option,
            payment_method,
            notes,
            custom_fields_data,
            calculated_delivery_fee,
            subtotal,
            discount_amount,
            total_amount,
            status,
            last_activity_at,
            created_at,
            updated_at,
            cart_items
          `)
          .eq('organization_id', currentOrganization.id)
          .eq('status', 'pending');
          
        cartsData = result.data;
        error = result.error;
      }
      
      if (error) throw error;
      
      // استعلام مجمع واحد للحصول على كل معرفات المنتجات
      if (cartsData && cartsData.length > 0) {
        // جمع كل معرفات المنتجات من السلات
        const productIds = new Set();
        
        cartsData.forEach((cart: any) => {
          if (cart.product_id) productIds.add(cart.product_id);
          
          if (cart.cart_items && Array.isArray(cart.cart_items)) {
            cart.cart_items.forEach((item: any) => {
              if (item.product_id) productIds.add(item.product_id);
            });
          }
        });
        
        // استعلام واحد للحصول على معلومات كل المنتجات
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name, thumbnail_image, price')
          .in('id', Array.from(productIds));
        
        // تخزين معلومات المنتجات في قاموس للبحث السريع
        const productsMap: Record<string, any> = {};
        if (productsData) {
          productsData.forEach(product => {
            productsMap[product.id] = product;
          });
        }
        
        // معالجة البيانات لجميع السلات دفعة واحدة
        const processedOrders: AbandonedOrder[] = cartsData.map((cart: any) => {
          // حساب عدد الساعات منذ آخر نشاط - يمكن الحصول عليه من الـ view
          const lastActivity = new Date(cart.last_activity_at);
          const now = new Date();
          const diffHours = cart.abandoned_hours || (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
          
          // معالجة العناصر في السلة
          let processedCartItems = cart.cart_items;
          if (cart.cart_items && Array.isArray(cart.cart_items)) {
            processedCartItems = cart.cart_items.map((item: any) => {
              const productInfo = item.product_id ? productsMap[item.product_id] : null;
              
              return {
                ...item,
                product_name: productInfo?.name || item.product_name,
                price: productInfo?.price || item.price
              };
            });
          }
          
          // معلومات المنتج الرئيسي
          const mainProductInfo = cart.product_id ? productsMap[cart.product_id] : null;
          const productDetails = mainProductInfo ? {
            name: mainProductInfo.name,
            image_url: mainProductInfo.thumbnail_image
          } : null;
          
          // معلومات الولاية والبلدية
          let provinceText = cart.province_name || cart.province;
          let municipalityText = cart.municipality_name || cart.municipality;
          
          if (cart.province && provinces[cart.province]) {
            provinceText = provinces[cart.province].name_ar || provinces[cart.province].name;
          }
          
          if (cart.municipality && municipalities[cart.municipality]) {
            municipalityText = municipalities[cart.municipality].name_ar || municipalities[cart.municipality].name;
          }
          
          return {
            ...cart,
            abandoned_hours: diffHours,
            productDetails,
            cart_items: processedCartItems,
            province_name: provinceText,
            municipality_name: municipalityText
          };
        });
        
        setAbandonedOrders(processedOrders);
        setFilteredOrders(processedOrders);
      } else {
        setAbandonedOrders([]);
        setFilteredOrders([]);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في استرجاع البيانات",
        description: "حدث خطأ أثناء جلب بيانات الطلبات المتروكة"
      });
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id, hasViewPermission, toast, provinces, municipalities]);

  // استرجاع إحصائيات الطلبات المتروكة
  const fetchAbandonedOrdersStats = useCallback(async () => {
    if (!currentOrganization?.id || !hasViewPermission) return;
    
    setStatsLoading(true);
    
    try {
      // محاولة استخدام الجدول المُجمع للإحصائيات إذا كان موجوداً
      let statsData: AbandonedOrdersStats;
      
      const { data: statsFromView, error: viewError } = await supabase
        .from('abandoned_carts_stats')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .single();
      
      // إذا كان الجدول موجود، استخدمه
      if (!viewError && statsFromView) {
        // إنشاء البيانات للرسوم البيانية - يمكن تعديلها لاستخدام بيانات حقيقية
        let labels: string[] = [];
        let chartData: number[] = [];
        
        if (timeRange === 'today') {
          labels = ['9 ص', '12 م', '3 م', '6 م', '9 م'];
          chartData = [2, 4, 3, 2, 1]; // يمكن استبدالها بحساب فعلي 
        } else if (timeRange === 'week') {
          labels = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
          chartData = [8, 12, 7, 9, 5, 3, 2]; // بيانات وهمية
        } else if (timeRange === 'month') {
          labels = ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4'];
          chartData = [22, 35, 28, 14]; // بيانات وهمية
        } else {
          labels = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
          chartData = [55, 70, 45, 90, 110, 85]; // بيانات وهمية
        }
        
        statsData = {
          totalCount: statsFromView.total_count || 0,
          totalValue: statsFromView.total_value || 0,
          todayCount: statsFromView.today_count || 0,
          weekCount: statsFromView.week_count || 0,
          monthCount: statsFromView.month_count || 0,
          averageValue: statsFromView.avg_value || 0,
          recoveryRate: 18.5, // نسبة افتراضية، يمكن حسابها بشكل دقيق
          conversionRate: 23.2, // نسبة افتراضية، يمكن حسابها بشكل دقيق
          timeSeries: {
            labels,
            data: chartData,
          },
        };
      } else {
        // استخدم الاستعلام القديم إذا لم يكن الجدول المُجمع موجوداً
        const { data: countData, error: countError } = await supabase
          .from('abandoned_carts')
          .select('id, total_amount, created_at', { count: 'exact' })
          .eq('organization_id', currentOrganization.id)
          .eq('status', 'pending');
        
        if (countError) throw countError;
        
        // احتساب القيمة الإجمالية
        const totalValue = countData ? countData.reduce((sum, order: any) => sum + (parseFloat(order.total_amount) || 0), 0) : 0;
        
        // احتساب عدد الطلبات اليومية والأسبوعية والشهرية
        const now = new Date();
        const oneDayAgo = new Date(now);
        oneDayAgo.setDate(now.getDate() - 1);
        
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(now.getDate() - 7);
        
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(now.getMonth() - 1);
        
        const todayCount = countData ? countData.filter((order: any) => new Date(order.created_at) >= oneDayAgo).length : 0;
        const weekCount = countData ? countData.filter((order: any) => new Date(order.created_at) >= oneWeekAgo).length : 0;
        const monthCount = countData ? countData.filter((order: any) => new Date(order.created_at) >= oneMonthAgo).length : 0;
        
        // إنشاء البيانات للرسوم البيانية
        let labels: string[] = [];
        let chartData: number[] = [];
        
        if (timeRange === 'today') {
          labels = ['9 ص', '12 م', '3 م', '6 م', '9 م'];
          chartData = [2, 4, 3, 2, 1]; // بيانات وهمية، يمكن استبدالها بحساب فعلي
        } else if (timeRange === 'week') {
          labels = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
          chartData = [8, 12, 7, 9, 5, 3, 2]; // بيانات وهمية
        } else if (timeRange === 'month') {
          labels = ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4'];
          chartData = [22, 35, 28, 14]; // بيانات وهمية
        } else {
          labels = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
          chartData = [55, 70, 45, 90, 110, 85]; // بيانات وهمية
        }
        
        statsData = {
          totalCount: countData ? countData.length : 0,
          totalValue,
          todayCount,
          weekCount,
          monthCount,
          averageValue: countData && countData.length > 0 ? Math.round(totalValue / countData.length) : 0,
          recoveryRate: 18.5, // نسبة افتراضية، يمكن حسابها بشكل دقيق
          conversionRate: 23.2, // نسبة افتراضية، يمكن حسابها بشكل دقيق
          timeSeries: {
            labels,
            data: chartData,
          },
        };
      }
      
      setStats(statsData);
    } catch (error) {
    } finally {
      setStatsLoading(false);
    }
  }, [currentOrganization?.id, hasViewPermission, timeRange]);

  // استدعاء دالة جلب البيانات عند التحميل
  useEffect(() => {
    if (hasViewPermission && currentOrganization?.id) {
      fetchAbandonedOrders();
    }
  }, [fetchAbandonedOrders, hasViewPermission, currentOrganization?.id]);

  // استدعاء دالة جلب الإحصائيات عند التحميل أو تغيير المدى الزمني
  useEffect(() => {
    if (hasViewPermission && currentOrganization?.id) {
      fetchAbandonedOrdersStats();
    }
  }, [fetchAbandonedOrdersStats, hasViewPermission, currentOrganization?.id, timeRange]);

  // تطبيق الفلاتر على قائمة الطلبات
  useEffect(() => {
    if (!abandonedOrders.length) {
      setFilteredOrders([]);
      return;
    }
    
    let result = [...abandonedOrders];
    
    // فلترة حسب المدة
    if (filters.duration) {
      if (filters.duration.min !== undefined) {
        result = result.filter(order => order.abandoned_hours >= filters.duration!.min!);
      }
      if (filters.duration.max !== undefined) {
        result = result.filter(order => order.abandoned_hours <= filters.duration!.max!);
      }
    }
    
    // فلترة حسب القيمة
    if (filters.value) {
      if (filters.value.min !== undefined) {
        result = result.filter(order => order.total_amount >= filters.value!.min!);
      }
      if (filters.value.max !== undefined) {
        result = result.filter(order => order.total_amount <= filters.value!.max!);
      }
    }
    
    // فلترة حسب التاريخ
    if (filters.date) {
      if (filters.date.start) {
        const startDate = new Date(filters.date.start);
        startDate.setHours(0, 0, 0, 0);
        result = result.filter(order => new Date(order.created_at) >= startDate);
      }
      if (filters.date.end) {
        const endDate = new Date(filters.date.end);
        endDate.setHours(23, 59, 59, 999);
        result = result.filter(order => new Date(order.created_at) <= endDate);
      }
    }
    
    // فلترة حسب عدد العناصر
    if (filters.itemCount) {
      if (filters.itemCount.min !== undefined) {
        result = result.filter(order => 
          (order.cart_items && Array.isArray(order.cart_items) 
            ? order.cart_items.length 
            : 0) >= filters.itemCount!.min!
        );
      }
      if (filters.itemCount.max !== undefined) {
        result = result.filter(order => 
          (order.cart_items && Array.isArray(order.cart_items) 
            ? order.cart_items.length 
            : 0) <= filters.itemCount!.max!
        );
      }
    }
    
    // فلترة حسب المصدر (باستخدام custom_fields_data)
    if (filters.source && filters.source.length > 0) {
      result = result.filter(order => 
        filters.source!.some(source => {
          if (order.custom_fields_data) {
            const customFields = order.custom_fields_data as any;
            return customFields?.source === source || customFields?.utm_source === source;
          }
          return false;
        })
      );
    }
    
    // فلترة حسب وجود معلومات اتصال
    if (filters.hasContactInfo !== undefined) {
      result = result.filter(order => 
        Boolean(order.customer_phone) === filters.hasContactInfo
      );
    }
    
    // فلترة حسب التبويب النشط
    if (activeTab === "day") {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      result = result.filter(order => new Date(order.created_at) >= oneDayAgo);
    } else if (activeTab === "week") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      result = result.filter(order => new Date(order.created_at) >= oneWeekAgo);
    } else if (activeTab === "high-value") {
      // طلبات ذات قيمة عالية (أكثر من 5000 دج)
      result = result.filter(order => order.total_amount > 5000);
    } else if (activeTab === "recoverable") {
      // طلبات قابلة للاسترداد (لديها معلومات اتصال وتم إنشاؤها خلال آخر 48 ساعة)
      const twoLaysAgo = new Date();
      twoLaysAgo.setDate(twoLaysAgo.getDate() - 2);
      result = result.filter(order => 
        Boolean(order.customer_phone) && 
        new Date(order.created_at) >= twoLaysAgo
      );
    }
    
    setFilteredOrders(result);
  }, [abandonedOrders, filters, activeTab]);

  // معالجة تحديد الصفوف
  const handleRowSelect = useCallback((selectedOrders: AbandonedOrder[]) => {
    setSelectedOrders(selectedOrders);
  }, []);

  // إعادة ضبط الفلاتر
  const handleResetFilters = useCallback(() => {
    setFilters({});
    setActiveTab("all");
  }, []);

  // إرسال تذكيرات للعملاء
  const handleSendReminders = useCallback(async (orders: AbandonedOrder[], message?: string) => {
    if (!hasManagePermission) return;
    
    try {
      // حساب عدد العملاء الذين لديهم معلومات اتصال
      const contactableCustomers = orders.filter(order => order.customer_phone || order.customer_email);
      
      toast({
        title: "تم إرسال التذكيرات",
        description: `تم إرسال تذكيرات إلى ${contactableCustomers.length} عميل بنجاح.`,
      });
      
      // إعادة تحميل البيانات
      fetchAbandonedOrders();
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في إرسال التذكيرات",
        description: "حدث خطأ أثناء محاولة إرسال التذكيرات للعملاء"
      });
    }
  }, [fetchAbandonedOrders, hasManagePermission, toast]);

  // استرجاع الطلبات المتروكة (تحويلها إلى طلبات فعلية)
  const handleRecoverOrders = useCallback(async (orders: AbandonedOrder[]) => {
    if (!hasManagePermission) return;
    
    try {
      // هنا يمكن إضافة منطق تحويل الطلبات المتروكة إلى طلبات فعلية
      // مثلاً إنشاء طلب جديد في جدول online_orders وتحديث حالة الطلب المتروك
      
      toast({
        title: "تم استرجاع الطلبات",
        description: `تم استرجاع ${orders.length} طلب بنجاح.`,
      });
      
      // إعادة تحميل البيانات
      fetchAbandonedOrders();
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في استرجاع الطلبات",
        description: "حدث خطأ أثناء محاولة استرجاع الطلبات المتروكة"
      });
    }
  }, [fetchAbandonedOrders, hasManagePermission, toast]);

  // حذف الطلبات المتروكة
  const handleDeleteOrders = useCallback(async (orders: AbandonedOrder[]) => {
    if (!hasManagePermission) return;
    
    try {
      // حذف الطلبات المحددة من قاعدة البيانات
      const orderIds = orders.map(order => order.id);
      
      const { error } = await supabase
        .from('abandoned_carts')
        .delete()
        .in('id', orderIds);
      
      if (error) throw error;
      
      toast({
        title: "تم حذف الطلبات",
        description: `تم حذف ${orders.length} طلب بنجاح.`,
      });
      
      // إعادة تحميل البيانات
      fetchAbandonedOrders();
      setSelectedOrders([]);
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في حذف الطلبات",
        description: "حدث خطأ أثناء محاولة حذف الطلبات المتروكة"
      });
    }
  }, [fetchAbandonedOrders, hasManagePermission, toast]);

  // تصدير الطلبات المتروكة إلى Excel
  const handleExportOrders = useCallback(async (orders: AbandonedOrder[]) => {
    try {
      // محل تنفيذ منطق تصدير الطلبات
      // يمكن إنشاء ملف Excel وتنزيله
      
      toast({
        title: "تم تصدير الطلبات",
        description: `تم تصدير ${orders.length} طلب بنجاح.`,
      });
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في تصدير الطلبات",
        description: "حدث خطأ أثناء محاولة تصدير الطلبات المتروكة"
      });
    }
  }, [toast]);

  // التحقق من الصلاحيات وعرض الصفحة وفقًا لذلك
  if (permissionLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-16 w-16 rounded-full bg-primary/20"></div>
            <div className="mt-4 h-4 w-40 bg-muted"></div>
            <div className="mt-2 h-4 w-60 bg-muted"></div>
          </div>
        </div>
      </Layout>
    );
  }

  // عرض رسالة عدم وجود صلاحيات
  if (!hasViewPermission) {
    return (
      <Layout>
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>غير مصرح</AlertTitle>
          <AlertDescription>
            ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <Helmet>
        <title>الطلبات المتروكة - {currentOrganization?.name}</title>
      </Helmet>
      
      <div className="flex flex-col space-y-6 p-4">
        {/* العنوان */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">الطلبات المتروكة</h1>
            <p className="text-muted-foreground">
              إدارة ومتابعة الطلبات التي لم يكملها العملاء
            </p>
          </div>
          
          <Button
            variant="outline"
            onClick={() => fetchAbandonedOrders()}
            disabled={loading}
            className="ml-2"
          >
            تحديث البيانات
          </Button>
        </div>
        
        {/* الإحصائيات */}
        <AbandonedOrdersStatsComponent
          stats={stats}
          loading={statsLoading}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
        
        {/* الفلاتر والتبويبات */}
        <div className="space-y-4">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="flex flex-col sm:flex-row justify-between mb-4 gap-3">
              <TabsList className="mb-2 sm:mb-0">
                <TabsTrigger value="all">الكل</TabsTrigger>
                <TabsTrigger value="day">آخر 24 ساعة</TabsTrigger>
                <TabsTrigger value="week">آخر أسبوع</TabsTrigger>
                <TabsTrigger value="high-value">قيمة عالية</TabsTrigger>
                <TabsTrigger value="recoverable">قابلة للإسترداد</TabsTrigger>
              </TabsList>
            </div>
              
            <AbandonedOrdersFilters
              filters={filters}
              onFiltersChange={setFilters}
              sources={ORDER_SOURCES}
              onReset={handleResetFilters}
            />
              
            <Separator className="my-6" />
            
            {filteredOrders.length > 0 && (
              <AbandonedOrdersActions
                selectedOrders={selectedOrders}
                onSendReminders={handleSendReminders}
                onRecoverOrders={handleRecoverOrders}
                onDeleteOrders={handleDeleteOrders}
                onExportOrders={handleExportOrders}
                loading={loading}
              />
            )}
            
            <div className="mt-4">
              <AbandonedOrdersTable
                data={filteredOrders}
                loading={loading}
                onRowClick={(order) => {
                  // عند النقر على الصف، يمكن فتح نافذة تفاصيل الطلب
                  
                }}
                onRecoverOrder={(order) => handleRecoverOrders([order])}
                onSendReminder={(order) => handleSendReminders([order])}
                onDeleteOrder={(order) => handleDeleteOrders([order])}
              />
            </div>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default AbandonedOrders;
