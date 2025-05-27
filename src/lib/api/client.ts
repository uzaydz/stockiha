import axios from 'axios';
import { toast } from '@/components/ui/use-toast';

// استخدام عنوان Supabase API كبديل إذا لم يتم توفير VITE_API_BASE_URL
const apiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
// إزالة "/" من نهاية apiBase إذا كان موجوداً
const formattedBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
// تحديد BASE_URL النهائي
const BASE_URL = formattedBase || '';

// التعرف على ما إذا كانت القاعدة المستخدمة هي Supabase
const isSupabaseUrl = BASE_URL.includes('supabase');

// Create an API client instance with global configuration
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // إلغاء إرسال الكوكيز لتجنب مشكلة CORS مع Supabase
  withCredentials: !isSupabaseUrl, // تعطيل withCredentials إذا كان العنوان هو Supabase
});

// إضافة معترضات لمعالجة الأخطاء بشكل موحد
apiClient.interceptors.request.use(
  (config) => {

    // إضافة التوكن المناسب استناداً إلى نوع الواجهة
    if (isSupabaseUrl) {
      // إضافة مفتاح Supabase إذا كنا نستخدم Supabase
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (anonKey) {
        config.headers['apikey'] = anonKey;
        config.headers['Authorization'] = `Bearer ${anonKey}`;
      }
    } else {
      // استخدام التوكن العادي للواجهات غير Supabase
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    
    return response;
  },
  (error) => {
    const { response } = error;
    
    if (response) {
      
      // معالجة أخطاء الاستجابة
      switch (response.status) {
        case 401:
          // انتهت صلاحية الجلسة، تسجيل خروج المستخدم
          localStorage.removeItem('authToken');
          window.location.href = '/login?session=expired';
          break;
        case 403:
          toast({
            title: 'ليس لديك صلاحية',
            description: 'ليس لديك صلاحية للوصول إلى هذا المورد',
            variant: 'destructive',
          });
          break;
        case 404:
          toast({
            title: 'لم يتم العثور على المورد',
            description: 'المورد المطلوب غير موجود',
            variant: 'destructive',
          });
          break;
        case 500:
          toast({
            title: 'خطأ في الخادم',
            description: 'حدث خطأ أثناء معالجة طلبك. الرجاء المحاولة مرة أخرى لاحقًا',
            variant: 'destructive',
          });
          break;
        default:
          toast({
            title: 'خطأ',
            description: response.data?.message || 'حدث خطأ غير متوقع',
            variant: 'destructive',
          });
      }
    } else {
      
      // خطأ في الاتصال بالخادم
      toast({
        title: 'خطأ في الاتصال',
        description: 'فشل الاتصال بالخادم. الرجاء التحقق من اتصالك بالإنترنت',
        variant: 'destructive',
      });
    }
    
    return Promise.reject(error);
  }
);
