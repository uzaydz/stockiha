import React, { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '@/components/Navbar';
import CustomizableStoreFooter from '@/components/store/CustomizableStoreFooter';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';

import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getDefaultFooterSettings, mergeFooterSettings } from '@/lib/footerSettings';
import { useSharedStoreData } from '@/hooks/useSharedStoreData';

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
  const trackedPathRef = useRef<string | null>(null);
  const trackedOnceRef = useRef<boolean>(false);
  
  // استخدم بيانات الـ RPC الموحّدة عندما تكون متاحة لتقليل الاستدعاءات
  const { categories: sharedCategories, footerSettings: sharedFooterSettings } = useSharedStoreData({
    includeCategories: true,
    includeProducts: false,
    includeFeaturedProducts: true, // ✅ إصلاح: تفعيل المنتجات المميزة لضمان ظهورها في البانر
    enabled: true
  } as any);
  
  // تهيئة الفئات وإعدادات الفوتر من البيانات المشتركة أولاً
  useEffect(() => {
    if (sharedCategories && sharedCategories.length > 0) {
      setCategories(sharedCategories);
    }
    if (sharedFooterSettings) {
      setFooterSettings(sharedFooterSettings);
    }
  }, [sharedCategories, sharedFooterSettings]);

  // كخطة بديلة فقط إذا لم تتوفر بيانات مشتركة
  useEffect(() => {
    if (!currentOrganization?.id) return;
    if ((sharedCategories?.length ?? 0) > 0 && sharedFooterSettings) return;

    const fetchFallback = async () => {
      try {
        const supabase = getSupabaseClient();
        if ((sharedCategories?.length ?? 0) === 0) {
          const { data: categoriesData } = await supabase
            .from('product_categories')
            .select('*')
            .eq('organization_id', currentOrganization.id)
            .eq('is_active', true)
            .order('name', { ascending: true });
          if (categoriesData) setCategories(categoriesData);
        }
        if (!sharedFooterSettings) {
          const { data: storeSettings } = await supabase
            .from('store_settings')
            .select('settings')
            .eq('organization_id', currentOrganization.id)
            .eq('component_type', 'footer')
            .eq('is_active', true)
            .maybeSingle();
          if (storeSettings?.settings) setFooterSettings(storeSettings.settings);
        }
      } catch (_) {}
    };

    fetchFallback();
  }, [currentOrganization?.id, sharedCategories, sharedFooterSettings]);

  // إعدادات افتراضية للفوتر باستخدام الدالة المشتركة
  const storeName = currentOrganization?.name || 'متجر stockiha';
  const storeData = { organization_details: currentOrganization };
  
  const defaultFooterSettings = getDefaultFooterSettings(storeName, storeData, t);

  // دمج الإعدادات المخصصة مع الافتراضية
  const finalFooterSettings = mergeFooterSettings(defaultFooterSettings, footerSettings);

  // تتبع أداء الصفحة - مرة واحدة لكل مسار
  useEffect(() => {
    const currentPath = location.pathname;
    if (trackedPathRef.current === currentPath && trackedOnceRef.current) {
      return;
    }
    trackedPathRef.current = currentPath;
    trackedOnceRef.current = true;
    // تتبع الأداء تم إزالته
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
