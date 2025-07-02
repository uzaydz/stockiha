import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { HelmetProvider } from "react-helmet-async";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ProductPageProvider } from '@/context/ProductPageContext';
import queryClient from "@/lib/config/queryClient";
import i18n from '@/i18n';

interface ProductPageLayoutProps {
  children: ReactNode;
  organizationId?: string;
  subdomain?: string;
  hostname?: string;
}

/**
 * Layout محسن لصفحات المنتجات
 * يحتوي على الحد الأدنى من providers المطلوبة
 * لتجنب تحميل بيانات غير ضرورية مثل POS والتحليلات
 */
export const ProductPageLayout: React.FC<ProductPageLayoutProps> = ({
  children,
  organizationId,
  subdomain,
  hostname
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ProductPageProvider
          organizationId={organizationId}
          subdomain={subdomain}
          hostname={hostname}
        >
          <I18nextProvider i18n={i18n}>
            <HelmetProvider>
              <div className="min-h-screen bg-gray-50">
                {children}
              </div>
              <Toaster />
              <Sonner />
            </HelmetProvider>
          </I18nextProvider>
        </ProductPageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default ProductPageLayout; 