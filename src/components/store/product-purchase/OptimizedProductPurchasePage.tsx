import React from 'react';
import { ProductPageRequestOptimizer, useOptimizedProvinces, useOptimizedShippingProviders } from './ProductPageRequestOptimizer';
import OrderForm from '../OrderForm';

interface OptimizedProductPurchasePageProps {
  organizationId: string;
  productId: string;
  // باقي الخصائص...
}

// مكون نموذج الطلب المحسن الذي يستخدم البيانات المُجمعة
const OptimizedOrderForm: React.FC<{ productId: string }> = ({ productId }) => {
  // استخدام البيانات المحسنة بدلاً من طلبات منفصلة
  const { provinces } = useOptimizedProvinces();
  const { providers } = useOptimizedShippingProviders();

  // باقي منطق النموذج...
  return (
    <div>
      <h3>نموذج الطلب المحسن</h3>
      <p>الولايات المتاحة: {provinces.length}</p>
      <p>شركات الشحن: {providers.length}</p>
      {/* هنا يمكن دمج OrderForm الأصلي مع البيانات المحسنة */}
    </div>
  );
};

// الصفحة الرئيسية المحسنة
export const OptimizedProductPurchasePage: React.FC<OptimizedProductPurchasePageProps> = ({
  organizationId,
  productId
}) => {
  return (
    <ProductPageRequestOptimizer 
      organizationId={organizationId} 
      productId={productId}
    >
      <div className="optimized-product-page">
        <h2>صفحة شراء المنتج المحسنة</h2>
        
        {/* مكونات أخرى يمكنها استخدام نفس البيانات */}
        <OptimizedOrderForm productId={productId} />
        
        {/* أي مكونات أخرى تحتاج لنفس البيانات */}
      </div>
    </ProductPageRequestOptimizer>
  );
};

export default OptimizedProductPurchasePage;
