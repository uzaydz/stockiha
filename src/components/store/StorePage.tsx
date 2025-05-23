import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import Navbar from '@/components/Navbar';
import type { NavbarProps } from '@/components/Navbar';
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
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import SkeletonLoader, { SkeletonLoaderProps } from './SkeletonLoader';
import themeLoader, { initializeTheme, updateTheme } from '@/lib/themeLoader';
import { getSupabaseClient } from '@/lib/supabase';
import { 
  getStoreDataFast, 
  forceReloadStoreData, 
  StoreInitializationData, 
  OrganizationSettings, 
  Product as StoreProduct
} from '@/api/storeDataService';
import { Helmet } from 'react-helmet-async';
import { StoreComponent, ComponentType } from '@/types/store-editor';

interface StorePageProps {
  storeData?: Partial<StoreInitializationData>;
}

const StorePage = ({ storeData: initialStoreData = {} }: StorePageProps) => {
  const { currentSubdomain } = useAuth();
  const { currentOrganization } = useTenant();
  const [storeSettings, setStoreSettings] = useState<OrganizationSettings | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [storeData, setStoreData] = useState<Partial<StoreInitializationData> | null>(initialStoreData && Object.keys(initialStoreData).length > 0 ? initialStoreData : null);
  const [dataError, setDataError] = useState<string | null>(null);
  const dataFetchAttempted = useRef(false);
  const forceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const storeNameFromDetails = storeData?.organization_details?.name;
  const storeNameFromSettings = storeSettings?.site_name;
  const storeName = storeNameFromDetails || storeNameFromSettings || currentSubdomain || 'المتجر الإلكتروني';
  
  const [customComponents, setCustomComponents] = useState<StoreComponent[]>(
    initialStoreData?.store_layout_components || []
  );

  useEffect(() => {
    if (dataLoading) {
      forceTimerRef.current = setTimeout(() => {
        if (dataLoading) {
          console.warn('[StorePage] Data loading timeout reached.');
          setDataLoading(false);
          if (!storeData && !dataError) {
            setDataError("استغرق تحميل بيانات المتجر وقتًا طويلاً.");
          }
        }
      }, 10000);
    } else if (forceTimerRef.current) {
      clearTimeout(forceTimerRef.current);
      forceTimerRef.current = null;
    }
    
    return () => {
      if (forceTimerRef.current) {
        clearTimeout(forceTimerRef.current);
      }
    };
  }, [dataLoading, storeData, dataError]);

  const getExtendedCategories = () => {
    if (!storeData?.categories || storeData.categories.length === 0) {
      console.log('[StorePage] getExtendedCategories: No storeData.categories or empty.');
      return [];
    }
    console.log('[StorePage] getExtendedCategories: storeData.categories BEFORE extending:', JSON.parse(JSON.stringify(storeData.categories)));
    const extended = storeData.categories.map(category => ({
      ...category,
      imageUrl: category.image_url || '',
      productsCount: category.product_count || 0,
      icon: category.icon || 'folder', 
      color: 'from-blue-500 to-indigo-600' 
    }));
    console.log('[StorePage] getExtendedCategories: categories AFTER extending:', JSON.parse(JSON.stringify(extended)));
    return extended;
  };

  useEffect(() => {
    if (currentSubdomain) {
      initializeTheme(currentSubdomain);
    }
  }, [currentSubdomain]);
  
  const checkCustomDomainAndLoadData = async () => {
    try {
      const hostname = window.location.hostname;
      if (hostname.includes('localhost') || !currentSubdomain) {
        return false; 
      }
      
      const supabase = getSupabaseClient();
      const { data: orgData, error } = await supabase
        .from('organizations')
        .select('id, name, domain, subdomain')
        .eq('domain', hostname)
        .neq('subdomain', currentSubdomain)
        .maybeSingle();
      
      if (error) {
        console.warn('[StorePage] خطأ في البحث عن المؤسسة بالنطاق المخصص:', error.message);
        return false;
      }
      
      if (orgData && orgData.subdomain) {
        localStorage.setItem('bazaar_organization_id', orgData.id);
        localStorage.setItem('bazaar_current_subdomain', orgData.subdomain);
        return orgData.subdomain;
      }
    } catch (error: any) {
      console.warn('[StorePage] خطأ في التحقق من النطاق المخصص:', error.message);
    }
    return false;
  };
  
  useEffect(() => {
    const loadStoreData = async () => {
      if (dataFetchAttempted.current && !(initialStoreData && Object.keys(initialStoreData).length > 0) ) return;
      if (!(initialStoreData && Object.keys(initialStoreData).length > 0)) {
        dataFetchAttempted.current = true;
        setDataLoading(true);
      }
      setDataError(null);

      let subdomainToUse = currentSubdomain;

      const customDomainSubdomain = await checkCustomDomainAndLoadData();
      if (typeof customDomainSubdomain === 'string') {
        subdomainToUse = customDomainSubdomain;
      }

      if (!subdomainToUse) {
        console.warn("[StorePage] No subdomain available to fetch data.");
        if (!(initialStoreData && Object.keys(initialStoreData).length > 0)) setDataLoading(false);
        setDataError("لم يتم تحديد المتجر. يرجى التحقق من الرابط.");
        return;
      }
      
      try {
        const result = await getStoreDataFast(subdomainToUse);

        if (result.data?.error) {
          console.error('[StorePage] Error fetching store data from RPC:', result.data.error);
          setDataError(result.data.error);
          setStoreData(null); 
          setStoreSettings(null);
          setCustomComponents([]);
        } else if (result.data) {
          setStoreData(result.data);
          setStoreSettings(result.data.organization_settings || null);
          setCustomComponents(result.data.store_layout_components || []);
          if (result.data.organization_settings) {
            updateTheme(subdomainToUse, result.data.organization_settings);
          }
        } else {
          console.warn('[StorePage] No data returned from getStoreDataFast for subdomain:', subdomainToUse);
          setDataError("لم يتم العثور على بيانات للمتجر أو قد تكون البيانات فارغة.");
          setStoreData(null);
          setStoreSettings(null);
          setCustomComponents([]);
        }
      } catch (error: any) {
        console.error('[StorePage] Exception while loading store data:', error);
        setDataError(error.message || "خطأ غير معروف أثناء تحميل البيانات.");
        setStoreData(null);
        setStoreSettings(null);
        setCustomComponents([]);
      } finally {
        if (!(initialStoreData && Object.keys(initialStoreData).length > 0)) setDataLoading(false);
      }
    };
    
    if (initialStoreData && Object.keys(initialStoreData).length > 0) {
        setStoreData(initialStoreData);
        setStoreSettings(initialStoreData.organization_settings || null);
        setCustomComponents(initialStoreData.store_layout_components || []);
        setDataLoading(false); 
        dataFetchAttempted.current = true;
        if (initialStoreData.organization_settings && currentSubdomain) {
            updateTheme(currentSubdomain, initialStoreData.organization_settings);
        }
    } else {
        loadStoreData();
    }

  }, [currentSubdomain, initialStoreData]);
  
  useEffect(() => {
    document.title = `${storeName} - المتجر الإلكتروني`;
  }, [storeName]);

  const handleReload = async () => {
    const subdomainToReload = localStorage.getItem('bazaar_current_subdomain') || currentSubdomain;
    if (subdomainToReload) {
      setDataLoading(true);
      setDataError(null);
      dataFetchAttempted.current = false;
      try {
        const result = await forceReloadStoreData(subdomainToReload);
        if (result.data?.error) {
          console.error('[StorePage] Error on force reload:', result.data.error);
          setDataError(result.data.error);
          setStoreData(null);
          setStoreSettings(null);
          setCustomComponents([]);
        } else if (result.data) {
          setStoreData(result.data);
          setStoreSettings(result.data.organization_settings || null);
          setCustomComponents(result.data.store_layout_components || []);
          if (result.data.organization_settings) {
            updateTheme(subdomainToReload, result.data.organization_settings);
          }
        } else {
          setDataError("فشل إعادة تحميل البيانات.");
          setStoreData(null);
          setStoreSettings(null);
          setCustomComponents([]);
        }
      } catch (error: any) {
        console.error('[StorePage] Exception on force reload:', error);
        setDataError(error.message || "خطأ غير معروف أثناء إعادة التحميل.");
        setStoreData(null);
        setStoreSettings(null);
        setCustomComponents([]);
      } finally {
        setDataLoading(false);
      }
    }
  };

  const hasCustomComponents = customComponents && customComponents.length > 0;

  if (dataLoading && (!storeData || Object.keys(storeData).length === 0)) {
    return <SkeletonLoader type="banner" />;
  }

  if (dataError && !storeData?.organization_details?.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">حدث خطأ</h1>
        <p className="text-muted-foreground mb-4">{dataError}</p>
        <Button onClick={handleReload}>
          <RefreshCw className="w-4 h-4 mr-2" />
          حاول مرة أخرى
        </Button>
      </div>
    );
  }
  
  if (!dataLoading && !storeData?.organization_details?.id && !dataError) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">المتجر غير موجود</h1>
        <p className="text-muted-foreground mb-4">
          لم نتمكن من العثور على المتجر المطلوب. يرجى التحقق من الرابط أو المحاولة لاحقًا.
        </p>
        <Link to="/">
          <Button>العودة إلى الصفحة الرئيسية</Button>
        </Link>
      </div>
    );
  }

  const defaultStoreComponents: StoreComponent[] = [
    { id: 'banner-default', type: 'hero', settings: { title: storeName, subtitle: storeData?.organization_details?.description || 'أفضل المنتجات بأفضل الأسعار' }, isActive: true, orderIndex: 0 },
    { id: 'categories-default', type: 'product_categories', settings: { title: 'تسوق حسب الفئة'}, isActive: true, orderIndex: 1 },
    { id: 'featured-default', type: 'featured_products', settings: { title: 'منتجات مميزة' }, isActive: true, orderIndex: 2 },
    { id: 'services-default', type: 'services', settings: {}, isActive: true, orderIndex: 3 },
    { id: 'testimonials-default', type: 'testimonials', settings: {}, isActive: true, orderIndex: 4 },
    { id: 'about-default', type: 'about', settings: { title: `عن ${storeName}`, content: storeData?.organization_details?.description || 'مرحباً بك في متجرنا.' }, isActive: true, orderIndex: 5 },
    { id: 'contact-default', type: 'contact', settings: { email: storeData?.organization_details?.contact_email }, isActive: true, orderIndex: 6 },
  ];

  const componentsToRender = hasCustomComponents ? customComponents : defaultStoreComponents;
  const navBarProps: NavbarProps = {
  };

  return (
    <>
      <Helmet>
        <title>{storeSettings?.seo_store_title || storeName}</title>
        {storeSettings?.seo_meta_description && <meta name="description" content={storeSettings.seo_meta_description} />}
      </Helmet>
      {storeSettings?.custom_js_header && (
        <script dangerouslySetInnerHTML={{ __html: storeSettings.custom_js_header }} />
      )}
      {storeSettings?.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: storeSettings.custom_css }} />
      )}
      <div className="flex flex-col min-h-screen bg-background relative">
        <Button 
          variant="outline" 
          size="sm" 
          className="fixed bottom-4 right-4 z-[100] bg-primary/10 hover:bg-primary/20 print:hidden"
          onClick={handleReload}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          إعادة تحميل
        </Button>
        
        <header className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-50 print:hidden">
          <Navbar {...navBarProps} />
        </header>
        
        <main className="flex-1">
          {dataLoading && (!storeData || Object.keys(storeData).length === 0) && <SkeletonLoader type="banner" />}
          {!dataLoading && dataError && !storeData?.organization_details?.id && (
             <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4 text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">حدث خطأ</h1>
              <p className="text-muted-foreground mb-4">{dataError}</p>
              <Button onClick={handleReload}><RefreshCw className="w-4 h-4 mr-2" />حاول مرة أخرى</Button>
            </div>
          )}
          {!dataLoading && !dataError && !storeData?.organization_details?.id && (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4 text-center">
              <h1 className="text-2xl font-bold mb-4">المتجر غير موجود</h1>
              <p className="text-muted-foreground mb-4">لم نتمكن من العثور على المتجر. يرجى التحقق من الرابط.</p>
              <Link to="/"><Button>العودة للرئيسية</Button></Link>
            </div>
          )}

          {storeData?.organization_details && (
            <>
              {storeSettings?.maintenance_mode && (
                <div className="container py-10 text-center">
                  <h1 className="text-3xl font-bold mb-4">المتجر تحت الصيانة</h1>
                  <p className="text-xl text-muted-foreground">
                    {storeSettings.maintenance_message || 'نحن نقوم ببعض التحديثات وسنعود قريبًا. شكرًا لصبركم!'}
                  </p>
                </div>
              )}
              {!storeSettings?.maintenance_mode && (
                <>
                  { storeSettings && <StoreTracking /> }
                  {componentsToRender.map((component, index) => {
                    let categoriesForProps: any[] = [];
                    if (component.type === 'product_categories') {
                      categoriesForProps = getExtendedCategories();
                      console.log(`[StorePage] Preparing to render 'product_categories' (ID: ${component.id}). Categories prop will be:`, JSON.parse(JSON.stringify(categoriesForProps)));
                      console.log(`[StorePage] storeData.categories at this point:`, JSON.parse(JSON.stringify(storeData?.categories)));
                      console.log(`[StorePage] All categories (passed to allCategories prop):`, JSON.parse(JSON.stringify(storeData?.categories)));
                    }

                    return (
                      <LazyLoad key={component.id || `component-${index}`}>
                        {(component.type === 'hero') && (
                          <LazyStoreBanner heroData={component.settings as any} />
                        )}
                        {(component.type === 'product_categories') && storeData.categories && (
                          <LazyProductCategories 
                            {...(component.settings as any)} 
                            categories={categoriesForProps}
                            allCategories={storeData.categories} 
                          />
                        )}
                        {(component.type === 'featured_products') && storeData.featured_products && (
                          <LazyFeaturedProducts 
                            {...(component.settings as any)} 
                            products={storeData.featured_products as StoreProduct[]} 
                            organizationId={storeData.organization_details?.id} 
                          />
                        )}
                        {(component.type === 'testimonials') && (
                          <LazyCustomerTestimonials {...(component.settings as any)} organizationId={storeData?.organization_details?.id}/>
                        )}
                        {(component.type === 'about') && (
                          <LazyStoreAbout {...(component.settings as any)} storeName={storeName} />
                        )}
                        {(component.type === 'contact') && (
                          <LazyStoreContact {...(component.settings as any)} email={storeData.organization_details?.contact_email} />
                        )}
                         {(component.type === 'services') && (
                          <StoreServices {...(component.settings as any)} />
                        )}
                        {(component.type === 'countdownoffers') && (
                           <LazyComponentPreview component={{ ...component, type: component.type as ComponentType }} />
                        )}
                      </LazyLoad>
                    );
                  })}
                </>
              )}
            </>
          )}
        </main>
        <LazyStoreFooter storeName={storeName} />
      </div>
      {storeSettings?.custom_js_footer && (
        <script dangerouslySetInnerHTML={{ __html: storeSettings.custom_js_footer }} />
      )}
    </>
  );
};

export default StorePage; 