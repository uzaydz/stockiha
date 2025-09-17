import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSharedStoreDataContext } from '@/context/SharedStoreDataContext';
import { setStoreHeadActive } from '@/lib/headGuard';

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
  // Flag head control while SEOHead is mounted - يجب أن يكون أول hook
  useEffect(() => {
    try { setStoreHeadActive(true); } catch {}
    return () => {
      try { setStoreHeadActive(false); } catch {}
    };
  }, []);

  // 🔒 استخدام البيانات من useSharedStoreDataContext بدلاً من إنشاء instance جديد
  const { organizationSettings, seoMeta, isLoading: sharedLoading } = useSharedStoreDataContext();

  // دمج الإعدادات مع البيانات المشتركة
  const finalSeoSettings = React.useMemo(() => {
    const base = {
      title: seoSettings?.title || seoMeta?.title || organizationSettings?.site_name || `${storeName || 'متجر إلكتروني'} - متجر إلكتروني`,
      description: seoSettings?.description || seoMeta?.description || organizationSettings?.seo_meta_description || `متجر ${storeName || 'متجر إلكتروني'} - أفضل المنتجات بأفضل الأسعار`,
      keywords: seoSettings?.keywords || seoMeta?.keywords || organizationSettings?.meta_keywords || `${storeName || 'متجر إلكتروني'}, متجر إلكتروني, تسوق أونلاين`,
      ogImage: seoSettings?.ogImage || seoSettings?.default_image_url || seoMeta?.image || organizationSettings?.logo_url || '',
      siteName: seoMeta?.site_name || organizationSettings?.site_name || storeName || 'متجر إلكتروني',
      canonicalUrl: (() => {
        try {
          const u = new URL(seoMeta?.url || (typeof window !== 'undefined' ? window.location.href : ''));
          u.hash = '';
          u.search = '';
          return u.toString();
        } catch {
          return seoMeta?.url || '';
        }
      })(),
      enable_open_graph: seoSettings?.enable_open_graph !== false,
      enable_twitter_cards: seoSettings?.enable_twitter_cards !== false
    };

    return base;
  }, [seoSettings, seoMeta, organizationSettings, storeName]);

  // تحديث الفافيكون بناءً على إعدادات المؤسسة عندما تكون متاحة
  useEffect(() => {
    try {
      const iconUrl = organizationSettings?.favicon_url || organizationSettings?.logo_url || '';
      if (!iconUrl) return;

      // إزالة أيقونات حالية لتجنب التضارب مع فافيكون افتراضي من index.html
      document.querySelectorAll('link[rel*="icon"]').forEach((el) => el.parentElement?.removeChild(el));

      const withBust = `${iconUrl}?v=${Date.now()}`;

      const linkIcon = document.createElement('link');
      linkIcon.rel = 'icon';
      linkIcon.type = 'image/png';
      linkIcon.href = withBust;
      document.head.appendChild(linkIcon);

      const linkApple = document.createElement('link');
      linkApple.rel = 'apple-touch-icon';
      linkApple.href = withBust;
      document.head.appendChild(linkApple);
    } catch {}
  }, [organizationSettings?.favicon_url, organizationSettings?.logo_url]);

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
        <meta name="x-store-head-active" content="1" />
        <title>{finalSeoSettings.title}</title>
        <meta name="description" content={finalSeoSettings.description} />
        {finalSeoSettings.keywords && <meta name="keywords" content={finalSeoSettings.keywords} />}
        {/* Favicon عبر Helmet كنسخة احتياطية بجانب التحديث المباشر */}
        {organizationSettings?.favicon_url && (
          <>
            <link rel="icon" type="image/png" href={`${organizationSettings.favicon_url}?v=${Date.now()}`} />
            <link rel="apple-touch-icon" href={`${organizationSettings.favicon_url}?v=${Date.now()}`} />
          </>
        )}
        {!organizationSettings?.favicon_url && organizationSettings?.logo_url && (
          <>
            <link rel="icon" type="image/png" href={`${organizationSettings.logo_url}?v=${Date.now()}`} />
            <link rel="apple-touch-icon" href={`${organizationSettings.logo_url}?v=${Date.now()}`} />
          </>
        )}
        
        {/* Open Graph Tags - محسنة للنطاقات المخصصة */}
        {finalSeoSettings.enable_open_graph && (
          <>
            <meta property="og:title" content={finalSeoSettings.title} />
            <meta property="og:description" content={finalSeoSettings.description} />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={finalSeoSettings.canonicalUrl} />
            {finalSeoSettings.ogImage && <meta property="og:image" content={finalSeoSettings.ogImage} />}
            <meta property="og:site_name" content={finalSeoSettings.siteName} />
            <meta property="og:locale" content="ar_DZ" />
          </>
        )}
        
        {/* Twitter Cards - محسنة */}
        {finalSeoSettings.enable_twitter_cards && (
          <>
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={finalSeoSettings.title} />
            <meta name="twitter:description" content={finalSeoSettings.description} />
            {finalSeoSettings.ogImage && <meta name="twitter:image" content={finalSeoSettings.ogImage} />}
            <meta name="twitter:site" content={seoSettings?.twitter_handle || '@stockiha'} />
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
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": finalSeoSettings.siteName,
            "url": finalSeoSettings.canonicalUrl,
            "potentialAction": {
              "@type": "SearchAction",
              "target": `${finalSeoSettings.canonicalUrl}?q={search_term_string}`,
              "query-input": "required name=search_term_string"
            }
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": finalSeoSettings.siteName,
            ...(finalSeoSettings.ogImage && { "logo": finalSeoSettings.ogImage }),
            "url": finalSeoSettings.canonicalUrl
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
