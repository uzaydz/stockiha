import React, { useEffect, useState, useRef, lazy, Suspense, startTransition } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useSupabase } from '@/context/SupabaseContext';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  RadioGroup,
  RadioGroupItem
} from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTenant } from '@/context/TenantContext';
import { flushSync } from 'react-dom';
import Navbar from '@/components/Navbar';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/context/ThemeContext';
import TestimonialsComponent from '@/components/landing-page/TestimonialsComponent';
import CtaButtonComponent from '@/components/landing-page/CtaButtonComponent';

// تحميل كسول للمكونات الثقيلة لتسريع التحميل الأولي
const EnhancedImageComponent = lazy(() => import('@/components/landing-page/ImageComponent'));
const FormComponent = lazy(() => import('@/components/landing/FormComponent'));
const BeforeAfterComponent = lazy(() => import('@/components/landing/BeforeAfterComponent'));

// تعريف مكونات داخلية بدلاً من استيرادها (لأنها غير موجودة)
// مكون النص
const TextComponent: React.FC<{ settings: Record<string, any> }> = ({ settings }) => {
  const textStyle = {
    color: settings.textColor || '#333333',
    padding: settings.padding || '20px',
    textAlign: settings.alignment || 'right',
  } as React.CSSProperties;
  
  return (
    <section className="py-8 transform-gpu animate-in fade-in duration-300">
      <div className="container mx-auto px-4">
        <div 
          className="prose prose-lg max-w-none mx-auto rtl"
          style={textStyle}
          dangerouslySetInnerHTML={{ __html: settings.content || '<p>أدخل المحتوى النصي هنا...</p>' }}
        />
      </div>
    </section>
  );
};

// مكون البطاقة الرئيسية
const HeroComponent: React.FC<{ settings: Record<string, any> }> = ({ settings }) => {
  const backgroundStyle = {
    backgroundColor: settings.backgroundColor || '#ffffff',
    color: settings.textColor || '#000000',
  };
  
  // صورة بديلة محلية بدلاً من استخدام خدمة خارجية
  const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iI2YzZjRmNiIvPjxwYXRoIGQ9Ik0zMTAuNSAzMTkuNUwzNjUuNSAyNzVMMzc0LjUgMjgzLjVMNDAwIDMwM0w0NjkgMjQ5LjVMNDk2LjUgMjc1TDUyNS41IDI0Ni41TDUzNC41IDI2My41TDYwMCAzMzAuNUw0MDAgMzgwTDMxMC41IDMxOS41WiIgZmlsbD0iI2UyZThmMCIvPjxjaXJjbGUgY3g9IjM0NyIgY3k9IjI0NiIgcj0iMTgiIGZpbGw9IiNlMmU4ZjAiLz48cGF0aCBkPSJNMjM4LjUgMzQ5LjVDMjM4LjUgMzQ5LjUgMjYwLjUgMzA1IDMwMi41IDI5NC41QzM0NC41IDI4NCA0MDAuNSAzMTMgNDAwLjUgMzEzTDIzOC41IDM1NS41VjM0OS41WiIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmaWxsPSIjOTQ5NDk0Ij7LktmI2LHYqTwvdGV4dD48L3N2Zz4=';
  
  return (
    <section className="py-16 transform-gpu animate-in fade-in slide-in-from-bottom duration-300" style={backgroundStyle}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-center md:text-right">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 animate-in slide-in-from-right duration-300">
              {settings.title || 'عنوان ترويجي'}
            </h1>
            <p className="text-lg mb-8 max-w-xl mx-auto md:mx-0 animate-in slide-in-from-right duration-300 delay-100">
              {settings.subtitle || 'نص ثانوي للتوضيح والشرح بمزيد من التفاصيل عن المنتج أو الخدمة المقدمة.'}
            </p>
            {settings.buttonText && (
              <a 
                href={settings.buttonLink || '#'} 
                className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors animate-in slide-in-from-right duration-300 delay-200"
              >
                {settings.buttonText}
              </a>
            )}
          </div>
          <div className="flex-1 transform-gpu will-change-transform animate-in fade-in slide-in-from-left duration-300 delay-150">
            <img 
              src={settings.imageUrl || fallbackImage} 
              alt={settings.title || 'صورة ترويجية'} 
              className="max-w-full rounded-lg shadow-md" 
              fetchPriority="high"
              loading="eager"
              decoding="async"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2VlZWVlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmaWxsPSIjOTk5OTk5Ij5JbWFnZTwvdGV4dD48L3N2Zz4=';
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

// مكون المميزات
const FeaturesComponent: React.FC<{ settings: Record<string, any> }> = ({ settings }) => {
  const features = settings.features || [
    { title: 'ميزة 1', description: 'وصف الميزة', icon: 'star' },
    { title: 'ميزة 2', description: 'وصف الميزة', icon: 'check' },
    { title: 'ميزة 3', description: 'وصف الميزة', icon: 'heart' },
  ];
  
  // حساب عدد الأعمدة
  const cols = settings.columnsCount || 3;
  const colClass = `grid-cols-1 md:grid-cols-${Math.min(cols, 3)} lg:grid-cols-${Math.min(cols, 4)}`;
  
  return (
    <section className="py-16 bg-muted/30 transform-gpu animate-in fade-in duration-300">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 animate-in slide-in-from-bottom duration-300">
          {settings.title || 'المميزات'}
        </h2>
        
        <div className={`grid ${colClass} gap-8 content-visibility-auto`}>
          {features.map((feature: any, index: number) => (
            <div 
              key={index} 
              className="bg-card rounded-lg p-6 shadow-sm transform-gpu will-change-transform animate-in fade-in-50 slide-in-from-bottom-4 duration-300" 
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4 mx-auto">
                <span className="text-xl">✓</span>
              </div>
              <h3 className="text-xl font-semibold text-center mb-3">{feature.title}</h3>
              <p className="text-center text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// مكون الشهادات
const TestimonialComponent: React.FC<{ settings: Record<string, any> }> = ({ settings }) => {
  const testimonials = settings.items || [
    { author: 'اسم العميل', quote: 'اقتباس إيجابي عن المنتج', avatar: null, rating: 5 },
  ];
  
  return (
    <section 
      className="py-16 transform-gpu animate-in fade-in duration-300" 
      style={{ 
        backgroundColor: settings.backgroundColor || '#f0f7ff',
        contentVisibility: 'auto',
        contain: 'content'
      }}
    >
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 animate-in slide-in-from-bottom duration-300">
          {settings.title || 'آراء العملاء'}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial: any, index: number) => (
            <div 
              key={index} 
              className="bg-white rounded-lg p-6 shadow-md transform-gpu animate-in fade-in slide-in-from-bottom duration-300" 
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < (testimonial.rating || 5) ? 'text-yellow-400' : 'text-gray-300'}>
                    ★
                  </span>
                ))}
              </div>
              <p className="italic mb-6 text-muted-foreground">"{testimonial.quote}"</p>
              <div className="flex items-center">
                {testimonial.avatar ? (
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.author} 
                    className="w-10 h-10 rounded-full mr-3"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                    <span className="text-primary font-medium">
                      {testimonial.author.charAt(0)}
                    </span>
                  </div>
                )}
                <span className="font-medium">{testimonial.author}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

interface LandingPageComponent {
  id: string;
  type: string;
  isActive: boolean;
  position: number;
  settings: Record<string, any>;
}

interface LandingPage {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  title: string;
  description: string;
  keywords: string;
  is_published: boolean;
  components: LandingPageComponent[];
}

// كاتش للتحميل
const ComponentPlaceholder = ({ type }: { type: string }) => (
  <div className="w-full py-8 animate-pulse">
    <div className="container mx-auto px-4">
      <div className="flex flex-col items-center justify-center space-y-4">
        <Skeleton className={`h-8 w-1/3 mx-auto rounded-md ${type === 'hero' ? 'h-16 w-1/2' : ''}`} />
        <Skeleton className="h-24 w-full max-w-3xl mx-auto rounded-md" />
        {type === 'form' && <Skeleton className="h-64 w-full max-w-md mx-auto rounded-md" />}
        {type === 'beforeAfter' && (
          <div className="w-full max-w-3xl mx-auto">
            <Skeleton className="h-64 w-full rounded-md" />
          </div>
        )}
      </div>
    </div>
  </div>
);

/**
 * عرض صفحة الهبوط - محسن مع تقنيات 2024-2025
 * - التخزين المؤقت للبيانات
 * - التحميل المتدرج والكسول
 * - الرسوم المتحركة وانتقالات العرض
 * - تحسين أداء الصفحة
 */
const LandingPageView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { supabase } = useSupabase();
  const { currentOrganization } = useTenant();
  const { reloadOrganizationTheme } = useTheme();
  
  const [landingPage, setLandingPage] = useState<LandingPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleComponents, setVisibleComponents] = useState<string[]>([]);
  
  // مرجع للتخزين المؤقت
  const cacheKey = useRef<string>(`landing_page_${slug}`);
  const componentObserver = useRef<IntersectionObserver | null>(null);
  const hasInitialData = useRef<boolean>(false);
  const themeLoaded = useRef<boolean>(false);
  
  // دالة مساعدة لتطبيق ألوان المتجر من الكاش مباشرة
  const applyStoredThemeColors = () => {
    try {
      // فحص وجود بيانات الألوان في التخزين المؤقت
      const themeData = localStorage.getItem(`org_theme_${window.location.hostname}`);
      
      if (themeData) {
        const { primary, secondary, timestamp } = JSON.parse(themeData);
        
        // التحقق من أن البيانات حديثة (أقل من 24 ساعة)
        if (timestamp && (Date.now() - timestamp) < (24 * 60 * 60 * 1000)) {
          // تطبيق الألوان مباشرة من التخزين المؤقت
          if (primary) {
            document.documentElement.style.setProperty('--primary', primary);
            document.documentElement.style.setProperty('--primary-foreground', '0 0% 100%');
          }
          
          if (secondary) {
            document.documentElement.style.setProperty('--secondary', secondary);
            document.documentElement.style.setProperty('--secondary-foreground', '0 0% 100%');
          }
          
          themeLoaded.current = true;
          return true;
        }
      }
    } catch (e) {
    }
    
    return false;
  };
  
  // تطبيق ألوان المتجر فورًا من التخزين المؤقت
  useEffect(() => {
    // محاولة تطبيق الألوان من التخزين المؤقت
    if (!themeLoaded.current) {
      applyStoredThemeColors();
    }
    
    // تحميل ألوان الثيم من الخادم في الخلفية
    if (currentOrganization?.id) {
      // استخدام requestIdleCallback لتحميل الألوان بدون إبطاء الواجهة
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          if (!themeLoaded.current) {
            reloadOrganizationTheme(currentOrganization.id);
          }
        }, { timeout: 1000 });
      } else {
        setTimeout(() => {
          if (!themeLoaded.current) {
            reloadOrganizationTheme(currentOrganization.id);
          }
        }, 100);
      }
    }
  }, [currentOrganization?.id, reloadOrganizationTheme]);
  
  // استراتيجية View Transitions API للتغييرات المرئية
  const applyViewTransition = (callback: () => void) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        flushSync(() => {
          callback();
        });
      });
    } else {
      callback();
    }
  };
  
  // التحقق من التخزين المؤقت أولاً للعرض الفوري
  useEffect(() => {
    const cachedData = localStorage.getItem(cacheKey.current);
    if (cachedData && !hasInitialData.current) {
      try {
        const parsedData = JSON.parse(cachedData);
        if (parsedData && parsedData.expiry > Date.now()) {
          startTransition(() => {
            setLandingPage(parsedData.data);
            hasInitialData.current = true;
          });
          // نستمر في العرض سريعاً حتى لو كانت البيانات مخزنة مؤقتاً
          setIsLoading(false);
        }
      } catch (e) {
      }
    }
  }, [slug]);
  
  // تهيئة مراقب العناصر المرئية
  useEffect(() => {
    // إنشاء مراقب للعناصر المرئية لتتبع ظهور المكونات
    componentObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const componentId = entry.target.getAttribute('data-component-id');
            if (componentId) {
              setVisibleComponents(prev => {
                if (!prev.includes(componentId)) {
                  return [...prev, componentId];
                }
                return prev;
              });
              // إلغاء مراقبة العنصر بعد ظهوره
              componentObserver.current?.unobserve(entry.target);
            }
          }
        });
      },
      { threshold: 0.1, rootMargin: '100px 0px' }
    );
    
    return () => {
      componentObserver.current?.disconnect();
    };
  }, []);
  
  // جلب بيانات صفحة الهبوط
  useEffect(() => {
    const fetchLandingPage = async () => {
      if (!slug) return;
      
      // لا داعي لعرض التحميل إذا كان لدينا بيانات مخزنة مؤقتاً
      if (!hasInitialData.current) {
      setIsLoading(true);
      }
      setError(null);
      
      try {
        // استخدام استعلام SQL بدلاً من RPC مع تحسينات الأداء
        const pagePromise = supabase
          .from('landing_pages')
          .select('id, organization_id, name, slug, title, description, keywords, is_published')
          .eq('slug', slug)
          .eq('is_deleted', false)
          .single();
          
        const componentsPromise = supabase
          .from('landing_page_components')
          .select('id, type, is_active, position, settings')
          .eq('landing_page_id', (await pagePromise).data?.id || '')
          .eq('is_active', true)
          .order('position');
          
        // تنفيذ الاستعلامات بالتوازي
        const [pageResult, componentsResult] = await Promise.all([
          pagePromise,
          componentsPromise
        ]);
        
        const { data: pageData, error: pageError } = pageResult;
        
        if (pageError) throw pageError;
        
        if (!pageData) {
          applyViewTransition(() => {
          setError('الصفحة غير موجودة أو غير منشورة');
          setLandingPage(null);
          setIsLoading(false);
          });
          return;
        }
        
        const { data: componentsData, error: componentsError } = componentsResult;
        
        if (componentsError) throw componentsError;
        
        // تحويل المكونات إلى التنسيق المطلوب
        const formattedComponents = componentsData.map(comp => ({
          id: comp.id,
          type: comp.type,
          isActive: comp.is_active,
          position: comp.position,
          settings: comp.settings || {}
        }));
        
        // إنشاء كائن الصفحة مع المكونات
        const completePage: LandingPage = {
          ...pageData,
          components: formattedComponents
        };
        
        // تطبيق التغييرات بتقنية View Transitions API
        applyViewTransition(() => {
        setLandingPage(completePage);
          
          // تخزين البيانات في التخزين المحلي (صالحة لمدة 5 دقائق)
          localStorage.setItem(cacheKey.current, JSON.stringify({
            data: completePage,
            expiry: Date.now() + (5 * 60 * 1000) // 5 دقائق
          }));
        });
      } catch (error) {
        applyViewTransition(() => {
        setError('حدث خطأ أثناء تحميل الصفحة');
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    // استخدام requestIdleCallback لتحميل البيانات الحقيقية في وقت الخمول إذا كانت البيانات مخزنة مؤقتاً
    if (hasInitialData.current) {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => fetchLandingPage(), { timeout: 2000 });
      } else {
        setTimeout(fetchLandingPage, 200);
      }
    } else {
    fetchLandingPage();
    }
  }, [slug, supabase]);
  
  // رسالة التحميل - مع تحسين تجربة المستخدم
  if (isLoading && !hasInitialData.current) {
    return (
      <div className="flex flex-col min-h-screen bg-background animate-in fade-in duration-300">
        <Navbar />
        <div className="container py-12 pt-24">
          <div className="w-full animate-pulse space-y-6">
            {/* هيكل تحميل لصفحة الهبوط */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <Skeleton className="h-16 w-2/3 md:w-1/2 rounded-md" />
              <Skeleton className="h-8 w-full md:w-2/3 rounded-md" />
              <Skeleton className="h-60 w-full md:w-3/4 rounded-md" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-40 w-full rounded-md" />
                  <Skeleton className="h-6 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-1/2 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // رسالة الخطأ
  if (error && !landingPage) {
    return (
      <div className="flex flex-col min-h-screen bg-background animate-in fade-in duration-300">
        <Navbar />
        <div className="container py-12 pt-24">
          <Alert variant="destructive" className="animate-in slide-in-from-top duration-300">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertTitle>خطأ</AlertTitle>
            <AlertDescription>
              {error || 'الصفحة غير موجودة أو غير منشورة'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }
  
  // إذا الصفحة غير منشورة، قم بتوجيه المستخدم إلى الصفحة الرئيسية
  if (landingPage && !landingPage.is_published) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <>
      <Helmet>
        <title>{landingPage?.title || 'صفحة الهبوط'}</title>
        <meta name="description" content={landingPage?.description || ''} />
        {landingPage?.keywords && <meta name="keywords" content={landingPage.keywords} />}
      </Helmet>
      
      <div className="flex flex-col min-h-screen bg-background view-transition-page">
        <Navbar />
        <div className="flex-grow landing-page-container pt-16">
          {landingPage?.components
            .filter(component => component.isActive)
            .sort((a, b) => a.position - b.position)
            .map((component, index) => (
              <div 
                key={component.id} 
                data-component-id={component.id}
                ref={el => {
                  if (el && componentObserver.current) {
                    componentObserver.current.observe(el);
                  }
                }}
                className="landing-page-component animate-in fade-in slide-in-from-bottom-8"
                style={{ 
                  contentVisibility: 'auto',
                  animationDelay: `${index * 100}ms`,
                  viewTransitionName: `component-${component.id}`,
                  contain: 'content',
                  animationPlayState: visibleComponents.includes(component.id) ? 'running' : 'paused',
                  opacity: visibleComponents.includes(component.id) ? 1 : 0,
                  transform: visibleComponents.includes(component.id) ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'opacity 0.5s ease, transform 0.5s ease'
                }}
              >
                <Suspense fallback={<ComponentPlaceholder type={component.type} />}>
                  <LandingPageComponentRenderer 
                component={component} 
              />
                </Suspense>
              </div>
            ))}
        </div>
      </div>
    </>
  );
};

// مكون لعرض مكونات صفحة الهبوط المختلفة
const LandingPageComponentRenderer: React.FC<{ component: LandingPageComponent }> = ({ component }) => {
  // اختر المكون المناسب بناءً على النوع
  switch (component.type) {
    case 'hero':
      return <HeroComponent settings={component.settings} />;
    case 'form':
      return <FormComponent settings={component.settings} />;
    case 'text':
      return <TextComponent settings={component.settings} />;
    case 'image':
      return <EnhancedImageComponent settings={component.settings} />;
    case 'features':
      return <FeaturesComponent settings={component.settings} />;
    case 'testimonial':
      return <TestimonialComponent settings={component.settings} />;
    case 'testimonials':
      // استخدام الإعدادات الموجودة مع المكون، مع توفير قيم افتراضية للحقول المطلوبة
      const defaultSettings = {
        title: component.settings.title || 'آراء العملاء',
        subtitle: component.settings.subtitle || 'تعرف على آراء عملائنا',
        backgroundColor: component.settings.backgroundColor || '#f8f9fa',
        textColor: component.settings.textColor || '#333333',
        accentColor: component.settings.accentColor || '#4f46e5',
        cardsBackgroundColor: component.settings.cardsBackgroundColor || '#ffffff',
        cardsTextColor: component.settings.cardsTextColor || '#333333',
        layout: component.settings.layout || 'grid',
        columns: component.settings.columns || 3,
        showRatings: component.settings.showRatings !== undefined ? component.settings.showRatings : true,
        showAvatars: component.settings.showAvatars !== undefined ? component.settings.showAvatars : true,
        avatarSize: component.settings.avatarSize || 'medium',
        animation: component.settings.animation || 'none',
        items: component.settings.items || [],
        useDbTestimonials: component.settings.useDbTestimonials || false,
        organizationId: component.settings.organizationId || null,
      };
      return <TestimonialsComponent settings={defaultSettings} />;
    case 'beforeAfter':
      return <BeforeAfterComponent settings={component.settings} />;
    case 'ctaButton':
      return <CtaButtonComponent settings={component.settings} />;
    default:
      return (
        <div className="p-4 text-center text-muted-foreground">
          مكون غير معروف: {component.type}
        </div>
      );
  }
};

export default LandingPageView;
