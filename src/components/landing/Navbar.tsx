import { useState, useEffect, useRef, Suspense, startTransition } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { flushSync } from 'react-dom';
import { useSupabase } from '@/context/SupabaseContext';
import { useTenant } from '@/context/TenantContext';

/**
 * مكون شريط التنقل المحسن للصفحات
 * محدث بتقنيات 2024-2025 للظهور الفوري والأداء العالي
 */
const Navbar = () => {
  const { supabase } = useSupabase();
  const { currentOrganization } = useTenant();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [siteName, setSiteName] = useState<string>('متجرشامل');
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // استراتيجية التخزين المؤقت للبيانات المسترجعة
  const cacheKey = useRef<string>(`navbar_data_${window.location.hostname}`);
  
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

  // تحميل البيانات من التخزين المحلي أولاً ثم تحديثها من السيرفر
  useEffect(() => {
    // استرجاع البيانات من ذاكرة التخزين المؤقت أولاً للعرض الفوري
    const cachedData = localStorage.getItem(cacheKey.current);
    if (cachedData) {
      try {
        const { siteName: cachedName, logo } = JSON.parse(cachedData);
        startTransition(() => {
          if (cachedName) setSiteName(cachedName);
          if (logo) setOrgLogo(logo);
          setIsLoaded(true);
        });
      } catch (e) {
        console.error('خطأ في تحليل البيانات المخزنة مؤقتًا:', e);
      }
    }

    // تحميل البيانات الحديثة من السيرفر
    const fetchOrganizationData = async () => {
      try {
        // تحقق من وجود معرف المؤسسة أو النطاق الفرعي
        const hostname = window.location.hostname;
        if (hostname === 'localhost') return;

        let query;
        // التحقق مما إذا كان الهوست هو نطاق مخصص أو سابدومين
        if (hostname.split('.').length > 2) {
          // سابدومين مثل: mystore.example.com
          const currentSubdomain = hostname.split('.')[0];
          console.log('استخدام النطاق الفرعي للبحث:', currentSubdomain);
          
          // استخدام دالة get_organization_info_by_subdomain للبحث بواسطة النطاق الفرعي
          query = supabase.rpc('get_organization_info_by_subdomain', {
            p_subdomain: currentSubdomain
          });
        } else {
          // نطاق مخصص مثل: example.com
          console.log('استخدام النطاق المخصص للبحث:', hostname);
          
          // استخدام دالة get_organization_info_by_domain للبحث بواسطة النطاق المخصص
          query = supabase.rpc('get_organization_info_by_domain', {
            p_domain: hostname
          });
        }

        // تنفيذ الاستعلام
        const { data: orgData, error } = await query;

        if (!error && orgData) {
          // تحديث البيانات باستخدام startTransition لتجنب تجميد الواجهة
          startTransition(() => {
            if (orgData.name) setSiteName(orgData.name);
            if (orgData.logo_url) setOrgLogo(orgData.logo_url);
            
            // تخزين البيانات في التخزين المحلي لتسريع التحميل في المرات القادمة
            localStorage.setItem(cacheKey.current, JSON.stringify({
              siteName: orgData.name,
              logo: orgData.logo_url
            }));
          });
        }
      } catch (err) {
        console.error('خطأ في تحميل بيانات المؤسسة:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    
    // استخدام requestIdleCallback لتحميل البيانات الحقيقية في وقت الخمول
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => fetchOrganizationData(), { timeout: 1000 });
    } else {
      // للمتصفحات التي لا تدعم requestIdleCallback
      setTimeout(fetchOrganizationData, 100);
    }
  }, [supabase]);

  // تتبع التمرير لتغيير مظهر شريط التنقل - مع تحسين الأداء
  useEffect(() => {
    // استخدام passive listener لتحسين الأداء
    const handleScroll = () => {
      // استخدام requestAnimationFrame لتحسين الأداء وتجنب تجميد واجهة المستخدم
      requestAnimationFrame(() => {
        if (window.scrollY > 10) {
          if (!isScrolled) {
            applyViewTransition(() => setIsScrolled(true));
          }
        } else if (isScrolled) {
          applyViewTransition(() => setIsScrolled(false));
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isScrolled]);

  // تبديل حالة القائمة مع تأثيرات انتقالية سلسة
  const toggleMenu = () => {
    applyViewTransition(() => setIsMenuOpen(prev => !prev));
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-3 ${
        isScrolled ? 'bg-background/80 backdrop-blur-md shadow-sm' : 'bg-transparent'
      }`}
      style={{ 
        viewTransitionName: 'navbar-header',
        contentVisibility: 'auto'
      }}
    >
      <div className="container px-4 mx-auto">
        <div className="flex items-center justify-between">
          {/* الشعار - مع تحميل فوري */}
          <Link 
            to="/" 
            className="flex items-center"
            style={{ viewTransitionName: 'site-logo' }}
          >
            {orgLogo ? (
              <div className="h-10 w-10 flex items-center justify-center mr-2 overflow-hidden">
                <img 
                  src={orgLogo} 
                  alt="شعار الموقع" 
                  className="h-full w-auto object-contain transform-gpu"
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                  style={{
                    viewTransitionName: 'site-logo-image',
                    contentVisibility: 'auto',
                    transform: 'translateZ(0)',
                  }}
                />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mr-2 transform-gpu" style={{ viewTransitionName: 'site-logo-fallback' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" className="text-primary" />
                  <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" className="text-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            <span 
              className="text-xl font-bold text-foreground transform-gpu animate-in fade-in slide-in-from-left duration-300"
              style={{ viewTransitionName: 'site-name' }}
            >
              {siteName.includes('متجر') ? siteName : <><span>متجر</span><span className="text-primary">{siteName}</span></>}
            </span>
          </Link>

          {/* عناصر القائمة الرئيسية - تحسين عرض العناصر باستخدام CSS containment */}
          <div 
            className="hidden md:flex items-center space-x-6 space-x-reverse"
            style={{ contentVisibility: 'auto', contain: 'content' }}
          >
            <Link 
              to="/"
              className="font-medium transition-colors hover:text-primary transform-gpu animate-in fade-in slide-in-from-top duration-300"
            >
              الرئيسية
            </Link>
            
            <div className="relative group">
              <button className="flex items-center font-medium transition-colors hover:text-primary gap-1 transform-gpu animate-in fade-in slide-in-from-top duration-300" style={{ animationDelay: '50ms' }}>
                <span>المميزات</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </button>
              
              <div className="absolute top-full right-0 mt-2 w-64 rounded-md border border-border bg-card shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 will-change-transform">
                <div className="p-2 space-y-1">
                  <Link 
                    to="/features/pos"
                    className="block px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    نقاط البيع
                  </Link>
                  <Link 
                    to="/features/online-store"
                    className="block px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    المتجر الإلكتروني
                  </Link>
                  <Link 
                    to="/features/advanced-analytics"
                    className="block px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    التقارير والتحليلات
                  </Link>
                  <Link 
                    to="/features"
                    className="block px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    كل المميزات
                  </Link>
                </div>
              </div>
            </div>
            
            <Link 
              to="/pricing"
              className="font-medium transition-colors hover:text-primary transform-gpu animate-in fade-in slide-in-from-top duration-300"
              style={{ animationDelay: '100ms' }}
            >
              الأسعار
            </Link>
            
            <Link 
              to="/contact"
              className="font-medium transition-colors hover:text-primary transform-gpu animate-in fade-in slide-in-from-top duration-300"
              style={{ animationDelay: '150ms' }}
            >
              تواصل معنا
            </Link>
          </div>

          {/* زر تبديل الوضع الليلي والنهاري وأزرار تسجيل الدخول للشاشات الكبيرة */}
          <div className="hidden md:flex items-center space-x-2 space-x-reverse">
            <ThemeToggle />
            
            <Link to="/login">
              <Button variant="outline" size="sm" className="animate-in fade-in slide-in-from-right duration-300">تسجيل الدخول</Button>
            </Link>
            
            <Link to="/tenant/signup">
              <Button size="sm" className="animate-in fade-in slide-in-from-right duration-300" style={{ animationDelay: '50ms' }}>تسجيل مؤسسة مجاناً</Button>
            </Link>
          </div>

          {/* زر القائمة للشاشات الصغيرة */}
          <div className="flex items-center md:hidden space-x-2 space-x-reverse">
            <ThemeToggle />
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleMenu}
              aria-label="القائمة"
              className="transform-gpu"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5 animate-in zoom-in-95 duration-300" />
              ) : (
                <Menu className="h-5 w-5 animate-in zoom-in-95 duration-300" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* القائمة المنسدلة للهاتف المحمول - مع تحسينات العرض */}
      <div 
        className={`md:hidden fixed inset-x-0 top-[60px] bg-background border-b border-border transition-all duration-300 ease-in-out z-40 view-transition-menu-mobile ${isMenuOpen ? 'h-[calc(100vh-60px)] overflow-y-auto' : 'h-0 overflow-hidden'}`}
        style={{ viewTransitionName: 'mobile-menu' }}
      >
        <div className="container px-4 pt-5 pb-8 transform-gpu">
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground mb-2 animate-in fade-in slide-in-from-top duration-300">التنقل الرئيسي</div>
              <Link 
                to="/"
                className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted transition-colors animate-in fade-in slide-in-from-right duration-300"
                onClick={toggleMenu}
              >
                الرئيسية
              </Link>
              
              <div className="space-y-1 mr-2 mt-1 mb-1">
                <div className="px-3 py-1 text-sm font-medium text-muted-foreground animate-in fade-in slide-in-from-right duration-300" style={{ animationDelay: '50ms' }}>المميزات</div>
                <Link 
                  to="/features/pos"
                  className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted transition-colors animate-in fade-in slide-in-from-right duration-300"
                  onClick={toggleMenu}
                  style={{ animationDelay: '100ms' }}
                >
                  نقاط البيع
                </Link>
                <Link 
                  to="/features/online-store"
                  className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted transition-colors animate-in fade-in slide-in-from-right duration-300"
                  onClick={toggleMenu}
                  style={{ animationDelay: '150ms' }}
                >
                  المتجر الإلكتروني
                </Link>
                <Link 
                  to="/features/advanced-analytics"
                  className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted transition-colors animate-in fade-in slide-in-from-right duration-300"
                  onClick={toggleMenu}
                  style={{ animationDelay: '200ms' }}
                >
                  التقارير والتحليلات
                </Link>
                <Link 
                  to="/features"
                  className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted transition-colors animate-in fade-in slide-in-from-right duration-300"
                  onClick={toggleMenu}
                  style={{ animationDelay: '250ms' }}
                >
                  كل المميزات
                </Link>
              </div>
              
              <Link 
                to="/pricing"
                className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted transition-colors animate-in fade-in slide-in-from-right duration-300"
                onClick={toggleMenu}
                style={{ animationDelay: '300ms' }}
              >
                الأسعار
              </Link>
              
              <Link 
                to="/contact"
                className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted transition-colors animate-in fade-in slide-in-from-right duration-300"
                onClick={toggleMenu}
                style={{ animationDelay: '350ms' }}
              >
                تواصل معنا
              </Link>
            </div>

            <div className="flex flex-col space-y-2 pt-4 border-t border-border mt-2">
              <Link 
                to="/login"
                className="w-full"
                onClick={toggleMenu}
              >
                <Button variant="outline" className="w-full animate-in fade-in slide-in-from-bottom duration-300" style={{ animationDelay: '400ms' }}>تسجيل الدخول</Button>
              </Link>
              
              <Link 
                to="/tenant/signup"
                className="w-full"
                onClick={toggleMenu}
              >
                <Button className="w-full animate-in fade-in slide-in-from-bottom duration-300" style={{ animationDelay: '450ms' }}>تسجيل مؤسسة مجاناً</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar; 