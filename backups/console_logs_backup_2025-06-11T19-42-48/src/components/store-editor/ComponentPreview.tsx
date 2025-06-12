import React from 'react';
import { useTenant } from '@/context/TenantContext';
import { StoreComponent } from '@/types/store-editor';
import StoreBanner from '@/components/store/StoreBanner';
import CategorySection from '@/components/store/CategorySection';
import ProductCategories from '@/components/store/ProductCategories';
import FeaturedProducts from '@/components/store/FeaturedProducts';
import CustomerTestimonials from '@/components/store/CustomerTestimonials';
import StoreAbout from '@/components/store/StoreAbout';
import CountdownOffersSection from '@/components/store/CountdownOffersSection';

interface ComponentPreviewProps {
  component: StoreComponent;
}

/**
 * يعرض معاينة لمكون المتجر بناءً على نوعه وإعداداته
 */
const ComponentPreview: React.FC<ComponentPreviewProps> = ({ component }) => {
  const { currentOrganization } = useTenant();
  
  // لا نعرض المكونات غير النشطة
  if (!component.isActive) {
    return null;
  }

  const { type, settings } = component;

  // تحويل البيانات من تنسيق المحرر إلى تنسيق مكون العرض
  // تحويل النوع إلى حروف صغيرة لمعالجة حالات الأحرف المختلفة
  const normalizedType = type.toLowerCase();
  
  switch (normalizedType) {
    case 'hero':
      return <StoreBanner heroData={settings} />;
      
    case 'categorysection':
      return <CategorySection {...settings} />;
      
    case 'categories':
      return <ProductCategories {...settings} />;
      
    case 'productcategories':
      return <ProductCategories {...settings} />;
      
    case 'featuredproducts':
      return <FeaturedProducts {...settings} organizationId={currentOrganization?.id} />;
      
    case 'featured_products':
      return <FeaturedProducts {...settings} organizationId={currentOrganization?.id} />;
      
    case 'customertestimonials':
      return <CustomerTestimonials {...settings} organizationId={currentOrganization?.id} />;
      
    case 'about':
      return <StoreAbout {...settings} />;
      
    case 'countdownoffers':
      return <CountdownOffersSection {...settings} />;
      
    default:
      return <div className="p-4 border rounded-md my-2 text-center">مكون غير معروف: {type}</div>;
  }
};

export default ComponentPreview;
