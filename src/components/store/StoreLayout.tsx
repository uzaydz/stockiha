import React, { useEffect, useRef, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { LazyStoreFooter } from './LazyStoreComponents';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface StoreLayoutProps {
  children: React.ReactNode;
  categories: any[];
  footerSettings: any;
  centralOrgId: string | null;
  storeName: string;
  customJSFooter?: string;
}

const StoreLayout: React.FC<StoreLayoutProps> = React.memo(({
  children,
  categories,
  footerSettings,
  centralOrgId,
  storeName,
  customJSFooter
}) => {
  // تتبع عدد التحديثات
  const renderCount = useRef(0);
  renderCount.current += 1;

  // تتبع التغييرات في البيانات
  const previousData = useRef<any>({});
  
  // تحسين: استخدام useMemo للبيانات المستقرة
  const memoizedCategories = useMemo(() => {
    return categories?.map(cat => ({
      ...cat,
      product_count: cat.product_count || 0
    })) || [];
  }, [categories]);

  const memoizedFooterSettings = useMemo(() => {
    return footerSettings;
  }, [footerSettings]);

  useEffect(() => {
    
    // تتبع التغييرات في البيانات
    const currentData = {
      categoriesCount: categories?.length || 0,
      centralOrgId,
      storeName,
      hasFooterSettings: !!footerSettings,
      hasCustomJS: !!customJSFooter
    };

    const prev = previousData.current;
    
    if (prev.categoriesCount !== currentData.categoriesCount) {
    }
    
    if (prev.centralOrgId !== currentData.centralOrgId) {
    }
    
    if (prev.storeName !== currentData.storeName) {
    }
    
    if (prev.hasFooterSettings !== currentData.hasFooterSettings) {
    }
    
    if (prev.hasCustomJS !== currentData.hasCustomJS) {
    }
    
    previousData.current = currentData;
    
    // تسجيل stack trace عند التحديث المتكرر
    if (renderCount.current > 3) {
    }
  }, [categories, centralOrgId, storeName, footerSettings, customJSFooter]);

  // تسجيل البيانات الحالية

  // فحص البيانات من مصادر مختلفة قبل عرض رسالة "المتجر غير موجود"
  const windowEarlyData = (window as any).__EARLY_STORE_DATA__;
  const windowSharedData = (window as any).__SHARED_STORE_DATA__;
  const windowCurrentStoreData = (window as any).__CURRENT_STORE_DATA__;
  
  const hasOrganizationData = !!(
    windowEarlyData?.data?.organization_details ||
    windowSharedData?.organization ||
    windowCurrentStoreData?.organization
  );
  
  const hasOrganizationSettings = !!(
    windowEarlyData?.data?.organization_settings ||
    windowSharedData?.organizationSettings ||
    windowCurrentStoreData?.organizationSettings
  );
  
  // إذا لم يتم العثور على المؤسسة في أي مصدر
  if (!centralOrgId && !hasOrganizationData && !hasOrganizationSettings) {
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

  return (
    <div className="flex flex-col min-h-screen bg-background relative">
      {/* النافبار */}
      <Navbar categories={memoizedCategories} />
      
      {/* المحتوى الرئيسي */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* الفوتر */}
      <LazyStoreFooter {...memoizedFooterSettings} />
      
      {/* JavaScript مخصص للتذييل */}
      {customJSFooter && (
        <script dangerouslySetInnerHTML={{ __html: customJSFooter }} />
      )}
    </div>
  );
});

export default StoreLayout;
