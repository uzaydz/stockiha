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
    console.log(`🔄 [StoreLayout] Categories memoization - count: ${categories?.length || 0}`);
    return categories?.map(cat => ({
      ...cat,
      product_count: cat.product_count || 0
    })) || [];
  }, [categories]);

  const memoizedFooterSettings = useMemo(() => {
    console.log(`🔄 [StoreLayout] Footer settings memoization`);
    return footerSettings;
  }, [footerSettings]);

  useEffect(() => {
    console.log(`🔄 [StoreLayout] Render #${renderCount.current} - تحديث StoreLayout`);
    
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
      console.log(`📊 [StoreLayout] Categories changed: ${prev.categoriesCount} → ${currentData.categoriesCount}`);
    }
    
    if (prev.centralOrgId !== currentData.centralOrgId) {
      console.log(`🏢 [StoreLayout] CentralOrgId changed: ${prev.centralOrgId} → ${currentData.centralOrgId}`);
    }
    
    if (prev.storeName !== currentData.storeName) {
      console.log(`🏪 [StoreLayout] StoreName changed: ${prev.storeName} → ${currentData.storeName}`);
    }
    
    if (prev.hasFooterSettings !== currentData.hasFooterSettings) {
      console.log(`👣 [StoreLayout] FooterSettings changed: ${prev.hasFooterSettings} → ${currentData.hasFooterSettings}`);
    }
    
    if (prev.hasCustomJS !== currentData.hasCustomJS) {
      console.log(`📜 [StoreLayout] CustomJS changed: ${prev.hasCustomJS} → ${currentData.hasCustomJS}`);
    }
    
    previousData.current = currentData;
    
    // تسجيل stack trace عند التحديث المتكرر
    if (renderCount.current > 3) {
      console.warn(`⚠️ [StoreLayout] تحديث متكرر (#${renderCount.current}) - Stack trace:`);
      console.trace();
    }
  }, [categories, centralOrgId, storeName, footerSettings, customJSFooter]);

  // تسجيل البيانات الحالية
  console.log(`📋 [StoreLayout] Current props:`, {
    categoriesCount: categories?.length || 0,
    centralOrgId,
    storeName,
    hasFooterSettings: !!footerSettings,
    hasCustomJS: !!customJSFooter,
    renderCount: renderCount.current
  });

  // إذا لم يتم العثور على المؤسسة
  if (!centralOrgId) {
    console.log(`❌ [StoreLayout] No centralOrgId - showing error page`);
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

  console.log(`✅ [StoreLayout] Rendering normal layout`);

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