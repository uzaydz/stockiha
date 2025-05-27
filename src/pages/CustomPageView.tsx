import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCustomPageBySlug } from '@/lib/customPages';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Clock, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import CustomizableStoreFooter from '@/components/store/CustomizableStoreFooter';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';

interface CustomPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  meta_description?: string;
  created_at: string;
  updated_at: string;
}

// دالة لتحويل الأرقام للعربية الهندية
const toArabicNumbers = (text: string): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return text.replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
};

// دالة لتنسيق التاريخ بالعربية
const formatArabicDate = (dateString: string): string => {
  const date = new Date(dateString);
  const arabicMonth = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  
  const day = toArabicNumbers(date.getDate().toString());
  const month = arabicMonth[date.getMonth()];
  const year = toArabicNumbers(date.getFullYear().toString());
  
  return `${day} ${month} ${year}`;
};

const CustomPageView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useTenant();
  const { currentSubdomain } = useAuth();
  const [page, setPage] = useState<CustomPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [footerSettings, setFooterSettings] = useState<any>(null);

  // جلب فئات المنتجات من قاعدة البيانات
  useEffect(() => {
    const fetchCategories = async () => {
      if (!currentOrganization?.id) return;
      
      try {
        const supabase = getSupabaseClient();
        const { data: categoriesData, error } = await supabase
          .from('product_categories')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (!error && categoriesData) {
          setCategories(categoriesData);
        }
      } catch (error) {
      }
    };

    const fetchFooterSettings = async () => {
      if (!currentOrganization?.id) return;
      
      try {
        const supabase = getSupabaseClient();
        const { data: storeSettings, error } = await supabase
          .from('store_settings')
          .select('settings')
          .eq('organization_id', currentOrganization.id)
          .eq('component_type', 'footer')
          .eq('is_active', true)
          .maybeSingle();

        if (!error && storeSettings?.settings) {
          setFooterSettings(storeSettings.settings);
        }
      } catch (error) {
      }
    };

    fetchCategories();
    fetchFooterSettings();
  }, [currentOrganization?.id]);

  useEffect(() => {
    const fetchPage = async () => {
      if (!slug) {
        setError('معرف الصفحة غير صحيح');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const pageData = await getCustomPageBySlug(slug);
        
        if (pageData) {
          setPage(pageData);
          setError(null);
        } else {
          setError('الصفحة غير موجودة');
        }
      } catch (err) {
        setError('حدث خطأ أثناء تحميل الصفحة');
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  const handleReload = () => {
    window.location.reload();
  };

  // إعدادات افتراضية للفوتر
  const defaultFooterSettings = {
    storeName: currentOrganization?.name || 'متجر stockiha',
    logoUrl: currentOrganization?.logo_url,
    description: currentOrganization?.description || 'متجر إلكتروني متكامل لبيع المنتجات والخدمات',
    showSocialLinks: true,
    showContactInfo: true,
    showFeatures: true,
    showNewsletter: true,
    showPaymentMethods: true,
    socialLinks: [
      { platform: 'facebook' as const, url: 'https://facebook.com' },
      { platform: 'instagram' as const, url: 'https://instagram.com' }
    ],
    contactInfo: {
      phone: '+213 123 456 789',
      email: 'info@store.com',
      address: '123 شارع المتجر، الجزائر العاصمة، الجزائر'
    },
    footerSections: [
      {
        id: '1',
        title: 'روابط سريعة',
        links: [
          { id: '1-1', text: 'الصفحة الرئيسية', url: '/', isExternal: false },
          { id: '1-2', text: 'المنتجات', url: '/products', isExternal: false },
          { id: '1-3', text: 'اتصل بنا', url: '/contact', isExternal: false }
        ]
      },
      {
        id: '2',
        title: 'خدمة العملاء',
        links: [
          { id: '2-1', text: 'مركز المساعدة', url: '/help', isExternal: false },
          { id: '2-2', text: 'سياسة الشحن', url: '/shipping-policy', isExternal: false },
          { id: '2-3', text: 'الأسئلة الشائعة', url: '/faq', isExternal: false }
        ]
      }
    ],
    features: [
      {
        id: '1',
        icon: 'Truck',
        title: 'شحن سريع',
        description: 'توصيل مجاني للطلبات +5000 د.ج'
      },
      {
        id: '2',
        icon: 'CreditCard',
        title: 'دفع آمن',
        description: 'طرق دفع متعددة 100% آمنة'
      },
      {
        id: '3',
        icon: 'Heart',
        title: 'ضمان الجودة',
        description: 'منتجات عالية الجودة معتمدة'
      },
      {
        id: '4',
        icon: 'ShieldCheck',
        title: 'دعم 24/7',
        description: 'مساعدة متوفرة طول اليوم'
      }
    ],
    newsletterSettings: {
      enabled: true,
      title: 'النشرة البريدية',
      description: 'اشترك في نشرتنا البريدية للحصول على آخر العروض والتحديثات.',
      placeholder: 'البريد الإلكتروني',
      buttonText: 'اشتراك'
    },
    paymentMethods: ['visa', 'mastercard', 'paypal'],
    legalLinks: [
      { id: 'legal-1', text: 'شروط الاستخدام', url: '/terms', isExternal: false },
      { id: 'legal-2', text: 'سياسة الخصوصية', url: '/privacy', isExternal: false }
    ]
  };

  // دمج الإعدادات المخصصة مع الافتراضية
  const finalFooterSettings = footerSettings ? { ...defaultFooterSettings, ...footerSettings } : defaultFooterSettings;

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        {/* النافبار الثابت */}
        <Navbar categories={categories} />
        
        {/* المحتوى مع إضافة المساحة للنافبار الثابت */}
        <main className="flex-1 container mx-auto px-4 py-8 pt-24">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded-lg w-3/4 mb-4"></div>
              <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
                <div className="h-4 bg-muted rounded w-4/6"></div>
              </div>
            </div>
          </div>
        </main>
        <CustomizableStoreFooter {...finalFooterSettings} />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Helmet>
          <title>صفحة غير موجودة | {currentOrganization?.name || 'المتجر'}</title>
        </Helmet>
        
        {/* النافبار الثابت */}
        <Navbar categories={categories} />

        {/* المحتوى مع إضافة المساحة للنافبار الثابت */}
        <main className="flex-1 container mx-auto px-4 py-16 pt-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="mb-8">
              <div className="w-24 h-24 mx-auto mb-6 bg-destructive/10 rounded-full flex items-center justify-center">
                <span className="text-4xl">⚠️</span>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-4">صفحة غير موجودة</h1>
              <p className="text-lg text-muted-foreground mb-8">
                {error || 'الصفحة المطلوبة غير موجودة أو تم حذفها'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="font-medium">
                <Link to="/">
                  <ArrowRight className="w-4 h-4 ml-2" />
                  العودة للصفحة الرئيسية
                </Link>
              </Button>
              
              <Button variant="outline" size="lg" onClick={handleReload}>
                <RefreshCw className="w-4 h-4 ml-2" />
                إعادة المحاولة
              </Button>
            </div>

            {slug && (
              <div className="mt-8 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>المسار المطلوب:</strong> /page/{toArabicNumbers(slug)}
                </p>
              </div>
            )}
          </motion.div>
        </main>

        <CustomizableStoreFooter {...finalFooterSettings} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Helmet>
        <title>{page.title} | {currentOrganization?.name || 'المتجر'}</title>
        {page.meta_description && <meta name="description" content={page.meta_description} />}
        <meta property="og:title" content={page.title} />
        {page.meta_description && <meta property="og:description" content={page.meta_description} />}
        <meta property="og:type" content="article" />
      </Helmet>

      {/* زر إعادة التحميل */}
      <Button 
        variant="outline" 
        size="sm" 
        className="fixed bottom-4 right-4 z-[100] bg-primary/10 hover:bg-primary/20 print:hidden"
        onClick={handleReload}
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        إعادة تحميل
      </Button>

      {/* النافبار الثابت */}
      <Navbar categories={categories} />

      {/* المحتوى مع إضافة المساحة للنافبار الثابت */}
      <main className="flex-1 pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* رأس الصفحة */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 print:hidden">
                <Link to="/" className="hover:text-primary transition-colors">
                  الصفحة الرئيسية
                </Link>
                <ArrowRight className="w-4 h-4" />
                <span>{page.title}</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
                {page.title}
              </h1>

              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>تاريخ النشر: {formatArabicDate(page.created_at)}</span>
                </div>
                
                {page.updated_at !== page.created_at && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>آخر تحديث: {formatArabicDate(page.updated_at)}</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* محتوى الصفحة */}
            <motion.article 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="prose prose-lg max-w-none"
            >
              <div className="bg-card border border-border/40 rounded-lg p-8 shadow-sm">
                <div 
                  className="text-foreground leading-relaxed whitespace-pre-wrap text-base"
                  style={{ 
                    lineHeight: '1.8',
                    fontSize: '16px'
                  }}
                >
                  {toArabicNumbers(page.content)}
                </div>
              </div>
            </motion.article>

            {/* زر العودة */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-12 print:hidden"
            >
              <Button asChild variant="outline" size="lg" className="font-medium">
                <Link to="/">
                  <ArrowRight className="w-4 h-4 ml-2" />
                  العودة للصفحة الرئيسية
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </main>

      <CustomizableStoreFooter {...finalFooterSettings} />
    </div>
  );
};

export default CustomPageView;
