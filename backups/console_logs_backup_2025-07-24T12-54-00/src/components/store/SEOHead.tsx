import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabase';

interface SEOHeadProps {
  seoSettings?: {
    title?: string;
    description?: string;
    keywords?: string;
    ogImage?: string;
    enable_open_graph?: boolean;
    enable_twitter_cards?: boolean;
    default_image_url?: string;
  };
  storeName: string;
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
  const [dynamicMetaTags, setDynamicMetaTags] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // جلب Meta Tags ديناميكياً من قاعدة البيانات
  useEffect(() => {
    const fetchDynamicMetaTags = async () => {
      if (!organizationId || !useGlobalFallback) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_dynamic_meta_tags', {
          _organization_id: organizationId
        });
        
        if (!error && data) {
          setDynamicMetaTags(data);
        }
      } catch (error) {
        console.warn('فشل في جلب Meta Tags الديناميكية:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDynamicMetaTags();
  }, [organizationId, useGlobalFallback]);

  // دمج الإعدادات مع البيانات الديناميكية
  const finalSeoSettings = React.useMemo(() => {
    const base = {
      title: seoSettings?.title || dynamicMetaTags?.title || `${storeName} - متجر إلكتروني`,
      description: seoSettings?.description || dynamicMetaTags?.description || `متجر ${storeName} - أفضل المنتجات بأفضل الأسعار`,
      keywords: seoSettings?.keywords || dynamicMetaTags?.keywords || `${storeName}, متجر إلكتروني, تسوق أونلاين`,
      ogImage: seoSettings?.ogImage || seoSettings?.default_image_url || dynamicMetaTags?.image || '',
      siteName: dynamicMetaTags?.site_name || storeName,
      canonicalUrl: dynamicMetaTags?.url || window.location.href,
      enable_open_graph: seoSettings?.enable_open_graph !== false,
      enable_twitter_cards: seoSettings?.enable_twitter_cards !== false
    };

    return base;
  }, [seoSettings, dynamicMetaTags, storeName]);

  if (loading) {
    return (
      <Helmet>
        <title>{storeName}</title>
        <meta name="description" content={`متجر ${storeName}`} />
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
