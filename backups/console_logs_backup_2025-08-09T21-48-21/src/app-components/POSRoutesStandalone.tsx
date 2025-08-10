import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// جلب الحمايات المطلوبة لنقطة البيع فقط
import ProtectedRoute from '../components/auth/ProtectedRoute';
import PermissionGuard from '../components/auth/PermissionGuard';
import ConditionalRoute from '../components/ConditionalRoute';

// تحميل صفحة POS فقط عند الحاجة
import * as LazyRoutes from './LazyRoutes';

export const PageLoader = ({ message }: { message?: string }) => (
  <div className="flex items-center justify-center min-h-[50vh] bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">
        {message || 'جاري التحميل...'}
      </p>
    </div>
  </div>
);

const POSRoutesStandalone = () => (
  <Routes>
    <Route
      path="/pos"
      element={
        <ProtectedRoute>
          <ConditionalRoute appId="pos-system">
            <PermissionGuard requiredPermissions={["accessPOS"]}>
              <Suspense fallback={<PageLoader message="جاري تحميل نقطة البيع..." />}> 
                <LazyRoutes.POSOptimized />
              </Suspense>
            </PermissionGuard>
          </ConditionalRoute>
        </ProtectedRoute>
      }
    />
  </Routes>
);

export default POSRoutesStandalone;


