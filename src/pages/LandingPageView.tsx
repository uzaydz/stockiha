import React, { useEffect, useState, useRef, lazy, Suspense, startTransition } from 'react';
import { useParams, Navigate } from 'react-router-dom';
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
import { sanitizeHTML } from '@/utils/security';
import { useSingleLandingPageFetch } from '@/hooks/useLandingPageFetch';

// تحميل كسول للمكونات الثقيلة لتسريع التحميل الأولي
const EnhancedImageComponent = lazy(() => import('@/components/landing-page/ImageComponent'));
const LandingPageFormRenderer = lazy(() => import('@/components/landing/LandingPageFormRenderer'));
const BeforeAfterComponent = lazy(() => import('@/components/landing/BeforeAfterComponent'));
const ProductBenefitsComponent = lazy(() => import('@/components/landing-page/ProductBenefitsComponent'));
const GuaranteesComponent = lazy(() => import('@/components/landing-page/GuaranteesComponent'));
const ProductHeroComponent = lazy(() => import('@/components/landing-page/ProductHeroComponent'));
const ProblemSolutionComponent = lazy(() => import('@/components/landing-page/ProblemSolutionComponent'));
const WhyChooseUsComponent = lazy(() => import('@/components/landing-page/WhyChooseUsComponent'));

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
          dangerouslySetInnerHTML={{ __html: sanitizeHTML(settings.content || '<p>أدخل المحتوى النصي هنا...</p>') }}
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
  const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iI2YzZjRmNiIvPjxwYXRoIGQ9Ik0zMTAuNSAzMTkuNUwzNjUuNSAyNzVMMzc0LjUgMjgzLjVMNDAwIDMwM0w0NjkgMjQ5LjVMNDk2LjUgMjc1TDUyNS41IDI0Ni41TDUzNC41IDI2My41TDYwMCAzMzAuNUw0MDAgMzgwTDMxMC41IDMxOS41WiIgZmlsbD0iI2UyZThmMCIvPjxjaXJjbGUgY3g9IjM0NyIgY3k9IjI0NiIgcj0iMTgiIGZpbGw9IiNlMmU4ZjAiLz48cGF0aCBkPSJNMjM4LjUgMzQ5LjVDMjM4LjUgMzQ5LjUgMjYwLjUgMzA1IDMwMi41IDI5NC41QzM0NC41IDI4NCA0MDAuNSAzMTMgNDAwLjUgMzEzTDIzOC41IDM1NS41VjM0OS41WiIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGxlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZpbGw9IiM5NDk0OTQiPsuS2YjYsdiqPC90ZXh0Pjwvc3ZnPg==';
  
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
            />
          </div>
        </div>
      </div>
    </section>
  );
};

// مكون الميزات
const FeaturesComponent: React.FC<{ settings: Record<string, any> }> = ({ settings }) => {
  const features = settings.features || [
    { title: 'ميزة 1', description: 'وصف الميزة الأولى' },
    { title: 'ميزة 2', description: 'وصف الميزة الثانية' },
    { title: 'ميزة 3', description: 'وصف الميزة الثالثة' }
  ];
  
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">{settings.title || 'ميزاتنا'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent>
                <h3 className="text-xl font-semibold mb-4">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

// مكون التوصيات
const TestimonialComponent: React.FC<{ settings: Record<string, any> }> = ({ settings }) => {
  const testimonials = settings.testimonials || [
    { name: 'أحمد محمد', role: 'عميل سعيد', content: 'تجربة رائعة مع المنتج!' },
    { name: 'فاطمة علي', role: 'عميلة سعيدة', content: 'أوصي به بشدة!' }
  ];
  
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">{settings.title || 'آراء العملاء'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-6">
              <CardContent>
                <p className="text-lg mb-4 italic">"{testimonial.content}"</p>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-muted-foreground text-sm">{testimonial.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

// تعريف الأنواع
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

// مكون placeholder للمكونات غير المعرفة
const ComponentPlaceholder = ({ type }: { type: string }) => (
  <div className="p-8 text-center border-2 border-dashed border-muted-foreground/20 rounded-lg">
    <p className="text-muted-foreground">مكون {type} غير معرّف</p>
  </div>
);

/**
 * صفحة عرض صفحة الهبوط - محسنة باستخدام RPC واحد
 * 
 * التحسينات المطبقة:
 * - استخدام RPC واحد لجلب البيانات بدلاً من استدعاءات متعددة
 * - تحسين الأداء من 3+ استدعاءات HTTP إلى استدعاء واحد
 * - تقليل وقت التحميل وتحسين تجربة المستخدم
 */
const LandingPageView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { currentOrganization } = useTenant();
  const { reloadOrganizationTheme } = useTheme();
  
  // استخدام الـ hook الجديد لجلب البيانات في استدعاء واحد
  const { 
    landingPage: fetchedLandingPage, 
    components: fetchedComponents, 
    isLoading, 
    error: fetchError 
  } = useSingleLandingPageFetch(slug);
  
  // تحويل البيانات إلى التنسيق المطلوب
  const [landingPage, setLandingPage] = useState<LandingPage | null>(null);
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
      // تجاهل الأخطاء
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
            reloadOrganizationTheme();
          }
        }, { timeout: 1000 });
      } else {
        setTimeout(() => {
          if (!themeLoaded.current) {
            reloadOrganizationTheme();
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
  
  // تحويل البيانات من الـ hook إلى التنسيق المطلوب
  useEffect(() => {
    if (fetchedLandingPage && fetchedComponents) {
      // تحويل المكونات إلى التنسيق المطلوب
      const formattedComponents = fetchedComponents.map(comp => ({
        id: comp.id,
        type: comp.type,
        isActive: comp.is_active,
        position: comp.position,
        settings: comp.settings || {}
      }));
      
      // إنشاء كائن الصفحة مع المكونات
      const completePage: LandingPage = {
        id: fetchedLandingPage.id,
        organization_id: fetchedLandingPage.organization_id,
        name: fetchedLandingPage.name,
        slug: fetchedLandingPage.slug,
        title: fetchedLandingPage.title || '',
        description: fetchedLandingPage.description || '',
        keywords: fetchedLandingPage.keywords || '',
        is_published: fetchedLandingPage.is_published,
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

    }
  }, [fetchedLandingPage, fetchedComponents]);
  
  // معالجة الأخطاء من الـ hook
  useEffect(() => {
    if (fetchError) {
      setError(fetchError);
    }
  }, [fetchError]);
  
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
  
  // رسالة التحميل - مع تحسين تجربة المستخدم
  if (isLoading && !hasInitialData.current) {
    return (
      <div className="flex flex-col min-h-screen bg-background animate-in fade-in duration-300">
        <Navbar />
        <div className="container py-12 pt-24">
          <div className="w-full animate-pulse space-y-6">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // عرض الخطأ
  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <div className="container py-12 pt-24">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>خطأ في جلب صفحة الهبوط</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>الخطأ:</strong> {error}</p>
                <p><strong>الرابط المطلوب:</strong> {slug}</p>
                <p><strong>حالة التحميل:</strong> {isLoading ? 'جاري التحميل...' : 'تم الانتهاء'}</p>
                <p><strong>البيانات المستلمة:</strong> {fetchedLandingPage ? 'نعم' : 'لا'}</p>
                <p><strong>عدد المكونات:</strong> {fetchedComponents?.length || 0}</p>
              </div>
            </AlertDescription>
          </Alert>
          <div className="mt-4 space-x-2">
            <Button asChild>
              <a href="/">العودة للصفحة الرئيسية</a>
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              إعادة المحاولة
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // إذا لم تكن الصفحة موجودة
  if (!landingPage) {
    // عرض رسالة خطأ واضحة بدلاً من التوجيه التلقائي إلى 404
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <div className="container py-12 pt-24">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>صفحة الهبوط غير موجودة</AlertTitle>
            <AlertDescription>
              عذراً، صفحة الهبوط "{slug}" غير موجودة في قاعدة البيانات. 
              يرجى التحقق من أن الصفحة تم إنشاؤها وأن الرابط صحيح.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button asChild>
              <a href="/">العودة للصفحة الرئيسية</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // إذا لم تكن الصفحة منشورة
  if (!landingPage.is_published) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <div className="container py-12 pt-24">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>صفحة غير منشورة</AlertTitle>
            <AlertDescription>هذه الصفحة غير متاحة للعرض العام.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Helmet>
        <title>{landingPage.title || landingPage.name}</title>
        <meta name="description" content={landingPage.description} />
        <meta name="keywords" content={landingPage.keywords} />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="pt-16">
          {/* عرض المكونات */}

          {landingPage.components.map((component) => (
            <div
              key={component.id}
              data-component-id={component.id}
              className="component-wrapper"
            >
              <LandingPageComponentRenderer 
                component={component} 
                landingPage={landingPage}
              />
            </div>
          ))}
        </main>
      </div>
    </>
  );
};

// مكون عرض المكونات
const LandingPageComponentRenderer: React.FC<{ 
  component: LandingPageComponent;
  landingPage: LandingPage;
}> = ({ component, landingPage }) => {

  if (!component.isActive) return null;
  
  const { type, settings } = component;
  
  switch (type) {
    case 'hero':
      return <HeroComponent settings={settings} />;
    case 'features':
      return <FeaturesComponent settings={settings} />;
    case 'testimonials':
      return <TestimonialComponent settings={settings} />;
    case 'text':
      return <TextComponent settings={settings} />;
    case 'beforeAfter':
      return (
        <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}>
          <BeforeAfterComponent settings={settings} />
        </Suspense>
      );
    case 'ctaButton':
      return (
        <Suspense fallback={<div className="h-16 bg-muted animate-pulse rounded-lg" />}>
          <CtaButtonComponent settings={settings} />
        </Suspense>
      );
    case 'productBenefits':
      return (
        <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}>
          <ProductBenefitsComponent settings={settings} />
        </Suspense>
      );
    case 'guarantees':
      return (
        <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}>
          <GuaranteesComponent settings={settings} />
        </Suspense>
      );
    case 'productHero':
      return (
        <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}>
          <ProductHeroComponent settings={settings} />
        </Suspense>
      );
    case 'problemSolution':
      return (
        <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}>
          <ProblemSolutionComponent settings={settings} />
        </Suspense>
      );
    case 'whyChooseUs':
      return (
        <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}>
          <WhyChooseUsComponent settings={settings} />
        </Suspense>
      );
    case 'form':

      return (
        <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}>
          <LandingPageFormRenderer 
            fields={settings.fields || []}
            title={settings.title}
            subtitle={settings.description}
            submitButtonText={settings.submitButtonText || 'إرسال الطلب'}
            formId={settings.formId}
            productId={settings.productId}
          />
        </Suspense>
      );
    case 'image':
      return (
        <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}>
          <EnhancedImageComponent settings={settings} />
        </Suspense>
      );
    default:
      return <ComponentPlaceholder type={type} />;
  }
};

export default LandingPageView;
