import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import CustomizableStoreFooter from '@/components/store/CustomizableStoreFooter';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import performanceTracking from '@/lib/performance-tracking';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getDefaultFooterSettings, mergeFooterSettings } from '@/lib/footerSettings';

interface StoreLayoutProps {
  children: React.ReactNode;
}

const StoreLayout: React.FC<StoreLayoutProps> = ({ children }) => {
  const { currentOrganization } = useTenant();
  const { currentSubdomain } = useAuth();
  const { t } = useTranslation();
  const [categories, setCategories] = useState<any[]>([]);
  const [footerSettings, setFooterSettings] = useState<any>(null);
  const location = useLocation();
  
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

  // إعدادات افتراضية للفوتر باستخدام الدالة المشتركة
  const storeName = currentOrganization?.name || 'متجر stockiha';
  const storeData = { organization_details: currentOrganization };
  
  const defaultFooterSettings = getDefaultFooterSettings(storeName, storeData, t);

  // دمج الإعدادات المخصصة مع الافتراضية
  const finalFooterSettings = mergeFooterSettings(defaultFooterSettings, footerSettings);

  // تتبع أداء الصفحة
  useEffect(() => {
    // تسجيل وقت تحميل الصفحة عند اكتمال التحميل
    const trackPagePerformance = () => {
      performanceTracking.trackPageLoad(
        location.pathname,
        currentOrganization?.id,
        window.location.hostname.split('.')[0]
      );
    };
    
    // Track on initial load
    window.addEventListener('load', trackPagePerformance);
    
    // Track on component mount if the page is already loaded
    if (document.readyState === 'complete') {
      trackPagePerformance();
    }
    
    return () => {
      window.removeEventListener('load', trackPagePerformance);
    };
  }, [location.pathname, currentOrganization?.id]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* استخدام مكون Navbar المستخدم في باقي صفحات المتجر */}
      <Navbar categories={categories} />
      
      {/* محتوى الصفحة مع إضافة المساحة المناسبة للنافبار الثابت */}
      <main className="flex-1 pt-16">
        {children}
      </main>
      
      {/* تذييل الصفحة الجديد */}
      <CustomizableStoreFooter 
        {...finalFooterSettings}
      />
    </div>
  );
};

export default StoreLayout;
