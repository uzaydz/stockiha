import React, { memo, useCallback } from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import { useNavigate, useLocation } from 'react-router-dom';

interface ProductFormPermissionDeniedProps {
  message?: string;
}

const ProductFormPermissionDenied: React.FC<ProductFormPermissionDeniedProps> = memo(({
  message = 'ليس لديك الصلاحية لإنشاء أو تعديل المنتجات',
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ⚡ تحديد مسار العودة الذكي بناءً على المصدر
  const getReturnPath = useCallback(() => {
    const locationState = location.state as any;
    
    // أولوية 1: استخدام returnTo من location.state إذا كان موجوداً
    if (locationState?.returnTo) {
      return locationState.returnTo;
    }
    
    // أولوية 2: استخدام from من location.state
    const referrer = locationState?.from || '';
    
    // أولوية 3: التحقق من المسار الحالي
    const currentPath = location.pathname;
    
    if (
      currentPath.includes('/pos-') ||
      currentPath.includes('/pos-advanced') ||
      currentPath.includes('/product-operations') ||
      referrer.includes('/pos-') ||
      referrer.includes('/pos-advanced') ||
      referrer.includes('/product-operations')
    ) {
      return '/dashboard/product-operations/products';
    }

    return '/dashboard/products';
  }, [location]);

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-destructive">عدم وجود صلاحية</h3>
          <p className="text-muted-foreground">{message}</p>
          <p className="text-sm text-muted-foreground">
            يرجى التواصل مع مدير النظام للحصول على صلاحية manageProducts أو addProducts
          </p>
        </div>
        <Button onClick={() => navigate(getReturnPath())}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          العودة إلى المنتجات
        </Button>
      </div>
    </Layout>
  );
});

ProductFormPermissionDenied.displayName = 'ProductFormPermissionDenied';

export default ProductFormPermissionDenied;
