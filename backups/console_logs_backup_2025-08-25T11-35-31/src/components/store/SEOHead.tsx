import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSharedStoreData } from '@/hooks/useSharedStoreData';

interface SEOHeadProps {
  seoSettings?: any;
  storeName?: string;
  organizationId?: string;
  customCSS?: string;
  customJSHeader?: string;
  useGlobalFallback?: boolean;
}

const SEOHead: React.FC<SEOHeadProps> = ({ 
  seoSettings, 
  storeName, 
  organizationId,
  customCSS, 
  customJSHeader,
  useGlobalFallback = true
}) => {
  // 🔒 استخدام البيانات من useSharedStoreData بدلاً من الاستدعاءات المنفصلة
  const { organizationSettings, seoMeta, isLoading: sharedLoading } = useSharedStoreData({
    includeSeoMeta: true,
    includeFooterSettings: true,
    enabled: useGlobalFallback
  });

  // دمج الإعدادات مع البيانات المشتركة
  const finalSeoSettings = React.useMemo(() => {
    const base = {
      title: seoSettings?.title || seoMeta?.title || organizationSettings?.site_name || `${storeName || 'متجر إلكتروني'} - متجر إلكتروني`,
      description: seoSettings?.description || seoMeta?.description || organizationSettings?.seo_meta_description || `متجر ${storeName || 'متجر إلكتروني'} - أفضل المنتجات بأفضل الأسعار`,
      keywords: seoSettings?.keywords || seoMeta?.keywords || organizationSettings?.meta_keywords || `${storeName || 'متجر إلكتروني'}, متجر إلكتروني, تسوق أونلاين`,
      ogImage: seoSettings?.ogImage || seoSettings?.default_image_url || seoMeta?.image || organizationSettings?.logo_url || '',
      siteName: seoMeta?.site_name || organizationSettings?.site_name || storeName || 'متجر إلكتروني',
      canonicalUrl: seoMeta?.url || window.location.href,
      enable_open_graph: seoSettings?.enable_open_graph !== false,
      enable_twitter_cards: seoSettings?.enable_twitter_cards !== false
    };

    return base;
  }, [seoSettings, seoMeta, organizationSettings, storeName]);

  if (sharedLoading) {
    return (
      <Helmet>
        <title>{storeName || 'متجر إلكتروني'}</title>
        <meta name="description" content="جاري التحميل..." />
      </Helmet>
    );
  }

  return (
    <>
      {/* إعدادات SEO المحسنة */}
      <Helmet>
        <title>{finalSeoSettings.title}</title>
        <meta name="description" content={finalSeoSettings.description} />
        {finalSeoSettings.keywords && <meta name="keywords" content={finalSeoSettings.keywords} />}
        
        {/* Open Graph Tags - محسنة للنطاقات المخصصة */}
        {finalSeoSettings.enable_open_graph && (
          <>
            <meta property="og:title" content={finalSeoSettings.title} />
            <meta property="og:description" content={finalSeoSettings.description} />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={finalSeoSettings.canonicalUrl} />
            {finalSeoSettings.ogImage && <meta property="og:image" content={finalSeoSettings.ogImage} />}
            <meta property="og:site_name" content={finalSeoSettings.siteName} />
            <meta property="og:locale" content="ar_SA" />
          </>
        )}
        
        {/* Twitter Cards - محسنة */}
        {finalSeoSettings.enable_twitter_cards && (
          <>
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={finalSeoSettings.title} />
            <meta name="twitter:description" content={finalSeoSettings.description} />
            {finalSeoSettings.ogImage && <meta name="twitter:image" content={finalSeoSettings.ogImage} />}
            <meta name="twitter:site" content={`@${finalSeoSettings.siteName}`} />
          </>
        )}
        
        {/* إعدادات SEO إضافية */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content={finalSeoSettings.siteName} />
        <link rel="canonical" href={finalSeoSettings.canonicalUrl} />
        
        {/* Schema.org Markup */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Store",
            "name": finalSeoSettings.siteName,
            "description": finalSeoSettings.description,
            "url": finalSeoSettings.canonicalUrl,
            ...(finalSeoSettings.ogImage && { "image": finalSeoSettings.ogImage })
          })}
        </script>
      </Helmet>
      
      {/* CSS مخصص */}
      {customCSS && (
        <style dangerouslySetInnerHTML={{ __html: customCSS }} />
      )}
      
      {/* JavaScript مخصص للرأس */}
      {customJSHeader && (
        <script dangerouslySetInnerHTML={{ __html: customJSHeader }} />
      )}
    </>
  );
};

export default SEOHead;
