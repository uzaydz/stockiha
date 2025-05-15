import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import Navbar from '@/components/Navbar';
import { 
  LazyLoad, 
  LazyStoreBanner, 
  LazyProductCategories, 
  LazyFeaturedProducts,
  LazyCustomerTestimonials,
  LazyStoreAbout,
  LazyStoreContact,
  LazyStoreFooter,
  LazyComponentPreview
} from './LazyStoreComponents';
import StoreTracking from './StoreTracking';
import StoreServices from './StoreServices';
import { Category, StoreComponent, StoreData } from '@/api/store';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { getOrganizationSettings } from '@/lib/api/settings';
import { OrganizationSettings } from '@/types/settings';
import { getFullStoreData } from '@/api/store';
import SkeletonLoader from './SkeletonLoader';
import themeLoader, { initializeTheme, updateTheme } from '@/lib/themeLoader';
import { getSupabaseClient } from '@/lib/supabase';
import { getProductCategories } from '@/api/store';
import { forceReloadStoreData } from '@/api/storeDataService';
import { Helmet } from 'react-helmet-async';

// تعريف ComponentType لتجنب الخطأ في الاستيراد
type ComponentType = 'Hero' | 'CategorySection' | 'ProductCategories' | 'FeaturedProducts' | 'CustomerTestimonials' | 'About' | 'countdownoffers';

interface StorePageProps {
  storeData?: Partial<StoreData>;
}

const StorePage = ({ storeData: initialStoreData = {} }: StorePageProps) => {
  const { currentSubdomain } = useAuth();
  const { currentOrganization } = useTenant();
  const [storeSettings, setStoreSettings] = useState<OrganizationSettings | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [storeData, setStoreData] = useState<Partial<StoreData>>(initialStoreData);
  const dataFetchAttempted = useRef(false);
  const forceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // استخراج اسم المتجر من البيانات
  const storeName = storeData?.name || storeSettings?.site_name || currentSubdomain || 'المتجر الإلكتروني';
  
  // التحقق من وجود مكونات مخصصة
  const hasCustomComponents = storeData?.components && storeData.components.length > 0;

  // Set up a safety timeout to force exit loading state
  useEffect(() => {
    // Force exit loading state after 5 seconds to prevent infinite loading
    forceTimerRef.current = setTimeout(() => {
      if (dataLoading) {
        console.log("Force exiting loading state after timeout");
        setDataLoading(false);
      }
    }, 5000);
    
    return () => {
      if (forceTimerRef.current) {
        clearTimeout(forceTimerRef.current);
      }
    };
  }, []);

  // تحويل الفئات العادية إلى فئات موسعة المطلوبة لمكون ProductCategories
  const getExtendedCategories = () => {
    if (!storeData.categories || storeData.categories.length === 0) {
      return [];
    }
    
    // تحويل الفئات إلى النوع المطلوب
    return storeData.categories.map(category => {
      // استخدام التحويل القوي للوصول إلى الخصائص
      const category_any = category as any;
      
      return {
        ...category,
        imageUrl: category_any.image_url || '',
        productsCount: category_any.product_count || 0,
        icon: 'folder', // قيمة افتراضية متوافقة مع النوع المطلوب
        color: 'from-blue-500 to-indigo-600' // تدرج لوني افتراضي
      };
    });
  };

  // تطبيق الثيم المحفوظ عند أول تحميل للمكون
  useEffect(() => {
    if (currentSubdomain) {
      initializeTheme(currentSubdomain);
    }
  }, [currentSubdomain]);
  
  // التحقق من النطاق المخصص
  const checkCustomDomain = async () => {
    try {
      const hostname = window.location.hostname;
      if (hostname.includes('localhost')) return null;
      
      const supabase = getSupabaseClient();
      
      // استخدام استعلام مباشر بدلاً من RPC للتوافق مع TypeScript
      const { data: orgData, error } = await supabase
        .from('organizations')
        .select('id, name, domain, subdomain, settings')
        .eq('domain', hostname)
        .maybeSingle();
      
      if (error) {
        console.error('خطأ في البحث عن المؤسسة بالنطاق المخصص:', error);
        return null;
      }
      
      if (orgData) {
        console.log('تم العثور على نطاق مخصص:', hostname, 'للمؤسسة:', orgData.name);
        
        // حفظ معرف المنظمة في localStorage للاستخدام عند إعادة تحميل الصفحة
        localStorage.setItem('bazaar_organization_id', orgData.id);
        localStorage.setItem('bazaar_current_subdomain', orgData.subdomain);
        
        // تحميل بيانات المتجر
        try {
          // تحميل بيانات المتجر
          const storeData = await getFullStoreData(orgData.subdomain);
          
          if (storeData) {
            console.log('تم تحميل بيانات المتجر بنجاح للنطاق المخصص، عدد الفئات:', storeData.categories?.length || 0);
            setStoreData(storeData);
            
            // التعامل مع إعدادات المتجر
            const settings = (storeData as any).settings;
            if (settings) {
              setStoreSettings(settings as OrganizationSettings);
            }
            
            // تحميل الفئات إذا كانت غير موجودة
            if (!storeData.categories || storeData.categories.length === 0) {
              console.log('جاري تحميل الفئات مباشرة لمعرف المؤسسة:', orgData.id);
              try {
                const categoriesData = await getProductCategories(orgData.id);
                if (categoriesData && categoriesData.length > 0) {
                  console.log('تم تحميل الفئات بنجاح:', categoriesData.length);
                  storeData.categories = categoriesData;
                  setStoreData({ ...storeData });
                }
              } catch (catError) {
                console.error('خطأ في تحميل الفئات:', catError);
              }
            }
          }
        } catch (storeError) {
          console.error('خطأ في تحميل بيانات المتجر للنطاق المخصص:', storeError);
        }
        
        return orgData;
      }
    } catch (error) {
      console.error('خطأ في التحقق من النطاق المخصص:', error);
    }
    return null;
  };
  
  // تحميل بيانات المتجر
  useEffect(() => {
    const loadStoreData = async () => {
      if (dataFetchAttempted.current) return;
      dataFetchAttempted.current = true;
      
      try {
        // التحقق من النطاق المخصص أولاً
        const customDomainOrg = await checkCustomDomain();
        if (customDomainOrg) {
          setDataLoading(false);
          return;
        }
        
        // استخدام النطاق الفرعي المخزن في حالة عدم وجود نطاق مخصص
        const savedSubdomain = localStorage.getItem('bazaar_current_subdomain');
        
        if (savedSubdomain || currentSubdomain) {
          const subdomainToUse = savedSubdomain || currentSubdomain;
          console.log('استخدام النطاق الفرعي لتحميل البيانات:', subdomainToUse);
          const data = await getFullStoreData(subdomainToUse);
          if (data) {
            setStoreData(data);
            
            // التعامل مع إعدادات المتجر
            const settings = (data as any).settings;
            if (settings) {
              setStoreSettings(settings as OrganizationSettings);
            }
          }
        }
      } catch (error) {
        console.error('خطأ في تحميل بيانات المتجر:', error);
      } finally {
        setDataLoading(false);
      }
    };
    
    loadStoreData();
  }, [currentSubdomain]);
  
  // ضبط عنوان الصفحة عند التحميل
  useEffect(() => {
    // استخدام اسم المتجر من الإعدادات إذا كان متاحاً
    document.title = `${storeName} - المتجر الإلكتروني`;
  }, [storeName]);

  console.log("StorePage render state:", { dataLoading, hasData: Object.keys(storeData).length > 0 });

  // إضافة زر إعادة تحميل البيانات للحالات الطارئة
  const handleReload = async () => {
    try {
      const savedSubdomain = localStorage.getItem('bazaar_current_subdomain');
      if (savedSubdomain) {
        setDataLoading(true);
        const { data } = await forceReloadStoreData(savedSubdomain);
        if (data) {
          setStoreData(data);
          alert('تم إعادة تحميل البيانات بنجاح');
        }
      }
    } catch (error) {
      console.error('خطأ في إعادة تحميل البيانات:', error);
    } finally {
      setDataLoading(false);
    }
  };

  if (hasCustomComponents) {
    return (
      <>
        <Helmet>
          <title>{storeName}</title>
        </Helmet>
        <div className="flex flex-col min-h-screen bg-background relative">
          {/* زر إعادة التحميل */}
          <Button 
            variant="outline" 
            size="sm" 
            className="fixed bottom-4 right-4 z-50 bg-primary/10 hover:bg-primary/20"
            onClick={handleReload}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            إعادة تحميل
          </Button>
          
          <div className="flex-1">
            {/* عرض المكونات المخصصة إذا كانت موجودة */}
            {/* استخدام Navbar العادي بدلاً من StoreNavbar غير المعرف */}
            <header className="bg-background/50 backdrop-blur-sm border-b sticky top-0 z-30">
              <Navbar />
            </header>
            
            <main className="flex-1">
              <div>
                {dataLoading ? (
                  // عرض هياكل تحميل للمكونات المخصصة إذا كان التحميل جاريًا
                  Array.from({ length: storeData.components?.length || 3 }).map((_, index) => (
                     <SkeletonLoader type="products" key={`skel-comp-${index}`} />
                  ))
                ) : (
                  // عرض المكونات الفعلية بعد انتهاء التحميل
                  storeData.components
                    ?.filter(comp => comp.is_active && comp.component_type !== 'seo_settings')
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((component) => (
                      <LazyLoad key={component.id}>
                        <LazyComponentPreview
                          component={{
                            id: component.id,
                            type: component.component_type as ComponentType,
                            settings: component.settings,
                            isActive: component.is_active,
                            orderIndex: component.order_index
                          }} 
                        />
                      </LazyLoad>
                    ))
                )}
              </div>
            </main>
            
            <footer className="bg-muted/30 text-foreground py-4 border-t">
              <div className="container text-center text-xs">
                {storeName} © {new Date().getFullYear()} - منصة بازار
              </div>
            </footer>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background/95">
      {/* مكون تتبع البكسل */}
      <StoreTracking />
      
      {/* استخدام النافبار العام بدون تمرير الفئات */}
      <Navbar />
      
      <main className="flex-1">
        {/* البانر الرئيسي */}
        {dataLoading ? (
          <SkeletonLoader type="banner" />
        ) : (
          <LazyLoad>
            <LazyStoreBanner />
          </LazyLoad>
        )}
        
        {/* شريط التصفية السريع */}
        <div className="bg-gradient-to-r from-background/95 via-background/90 to-background/95 backdrop-blur-lg z-10 border-b border-border/20 sticky top-0">
          <div className="container px-4 mx-auto">
            <div className="flex items-center justify-between py-4 overflow-x-auto">
              <div className="flex items-center gap-8">
                <Link to="/products" className="text-sm font-medium whitespace-nowrap hover:text-primary transition-all duration-300 hover:scale-105 relative group">
                  جميع المنتجات
                  <span className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rtl:origin-right"></span>
                </Link>
                <Link to="/new-arrivals" className="text-sm font-medium whitespace-nowrap hover:text-primary transition-all duration-300 hover:scale-105 relative group">
                  وصل حديثاً
                  <span className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rtl:origin-right"></span>
                </Link>
                <Link to="/offers" className="text-sm font-medium whitespace-nowrap hover:text-primary transition-all duration-300 hover:scale-105 relative group">
                  العروض
                  <span className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rtl:origin-right"></span>
                </Link>
                <Link to="/best-sellers" className="text-sm font-medium whitespace-nowrap hover:text-primary transition-all duration-300 hover:scale-105 relative group">
                  الأكثر مبيعاً
                  <span className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rtl:origin-right"></span>
                </Link>
              </div>
              
              <Link to="/products" className="text-sm font-medium text-primary/90 hover:text-primary whitespace-nowrap hidden md:flex items-center group px-4 py-1.5 rounded-full bg-primary/10 hover:bg-primary/15 transition-all duration-300 border border-primary/20 hover:border-primary/30">
                تسوق الآن
                <ArrowRight className="h-4 w-4 mr-1 group-hover:translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:-translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
        
        {/* الفئات */}
        {dataLoading ? (
          <SkeletonLoader type="categories" />
        ) : (
          storeData.categories && storeData.categories.length > 0 && (
            <LazyLoad>
              <LazyProductCategories 
                useRealCategories={false} // تعطيل جلب الفئات الحقيقية من داخل المكون
                categories={getExtendedCategories() as any} // استخدام any لتجنب أخطاء TypeScript
              />
            </LazyLoad>
          )
        )}
        
        {/* المنتجات المميزة */}
        {dataLoading ? (
          <SkeletonLoader type="products" />
        ) : (
          storeData.products && storeData.products.length > 0 && (
            <LazyLoad>
              <LazyFeaturedProducts
                products={storeData.products}
                organizationId={currentOrganization?.id}
                title="أحدث المنتجات"
              />
            </LazyLoad>
          )
        )}
        
        {/* بانر ترويجي */}
        <section className="py-20 bg-gradient-to-b from-background to-primary/5 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 opacity-40">
            <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full filter blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/20 rounded-full filter blur-3xl"></div>
            <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-purple-500/20 rounded-full filter blur-3xl"></div>
          </div>
          
          <div className="container px-4 mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-12">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                viewport={{ once: true }}
                className="md:w-1/2"
              >
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent">تسوق براحة واستمتع بتجربة فريدة</h2>
                <p className="text-muted-foreground mb-8 text-lg">نوفر لك تشكيلة واسعة من المنتجات عالية الجودة بأسعار تنافسية، مع خدمة توصيل سريعة وآمنة لجميع أنحاء البلاد.</p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" className="px-8 py-6 rounded-xl shadow-md hover:shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all duration-300 text-base">تسوق الآن</Button>
                  <Button size="lg" variant="outline" className="px-8 py-6 rounded-xl border-primary/30 hover:border-primary/50 transition-all duration-300 text-base group">
                    تواصل معنا
                    <ArrowRight className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                  </Button>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                viewport={{ once: true }}
                className="md:w-1/2"
              >
                <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-xl shadow-primary/10 border border-white/20 transform md:rotate-1 hover:rotate-0 transition-all duration-500">
                  <img 
                    src="https://images.unsplash.com/photo-1607083206968-13611e3d76db?q=80&w=2115" 
                    alt="تسوق أونلاين" 
                    className="w-full h-full object-cover transition-all duration-700 hover:scale-105"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>
        
        {/* قسم آراء العملاء */}
        {dataLoading ? (
          <SkeletonLoader type="testimonials" />
        ) : (
          <LazyLoad>
            <LazyCustomerTestimonials
              organizationId={currentOrganization?.id}
            />
          </LazyLoad>
        )}
        
        {/* الخدمات */}
        <StoreServices 
          services={storeData.services}
        />
        
        {/* من نحن */}
        {dataLoading ? (
          <SkeletonLoader type="about" />
        ) : (
          <LazyLoad>
            <LazyStoreAbout
              title={storeSettings?.site_name ? `عن ${storeSettings.site_name}` : `عن ${storeName}`}
              subtitle={storeSettings?.site_name ? `${storeSettings.site_name} - متجر متميز` : `${storeName} - متجر متميز`}
              description={storeData?.description}
            />
          </LazyLoad>
        )}
        
        {/* نموذج الاتصال */}
        <LazyLoad>
          <LazyStoreContact
            title="تواصل معنا"
            description="نحن هنا للإجابة على استفساراتك ومساعدتك في أي وقت"
            contactInfo={storeData?.contactInfo}
          />
        </LazyLoad>
      </main>
      
      {/* تذييل المتجر */}
      <LazyLoad>
        <LazyStoreFooter
          storeName={storeSettings?.site_name || storeName}
          logoUrl={storeSettings?.logo_url || storeData?.logoUrl}
        />
      </LazyLoad>
    </div>
  );
};

export default StorePage; 