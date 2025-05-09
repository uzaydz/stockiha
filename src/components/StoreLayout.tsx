import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import StoreFooter from '@/components/store/StoreFooter';
import { useTenant } from '@/context/TenantContext';
import { getProductCategories } from '@/api/store';
import { useState } from 'react';
import { Category } from '@/api/store';
import performanceTracking from '@/lib/performance-tracking';
import { useLocation } from 'react-router-dom';

interface StoreLayoutProps {
  children: React.ReactNode;
}

const StoreLayout = ({ children }: StoreLayoutProps) => {
  const { currentOrganization } = useTenant();
  const [categories, setCategories] = useState<Category[]>([]);
  const location = useLocation();
  
  // جلب فئات المنتجات من قاعدة البيانات
  useEffect(() => {
    const fetchCategories = async () => {
      if (!currentOrganization?.id) return;

      try {
        const categoriesData = await getProductCategories(currentOrganization.id);
        if (categoriesData && categoriesData.length > 0) {
          setCategories(categoriesData);
        }
      } catch (err) {
        console.error('Error fetching product categories:', err);
      }
    };

    fetchCategories();
  }, [currentOrganization?.id]);

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
      
      {/* محتوى الصفحة */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* تذييل الصفحة */}
      <StoreFooter 
        storeName={currentOrganization?.name || 'متجر stockiha'} 
        logoUrl={currentOrganization?.logo_url} 
        description={currentOrganization?.description || 'متجر إلكتروني متكامل لبيع المنتجات والخدمات'}
      />
    </div>
  );
};

export default StoreLayout; 