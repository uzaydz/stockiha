import React, { useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { setStoreHeadActive } from '@/lib/headGuard';
import { getCdnImageUrl } from '@/lib/image-cdn';

// Error Boundary للـ Helmet
class HelmetErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // تحديث الحالة لإظهار UI بديل
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('Helmet Error:', error, errorInfo);
    // إعلام المكون الأب بحدوث خطأ
    if (this.props.onError) {
      this.props.onError();
    }
  }

  render() {
    if (this.state.hasError) {
      // يمكنك عرض UI بديل هنا
      return null;
    }

    return this.props.children;
  }
}

interface ProductSEOHeadProps {
  product?: any;
  organization?: any;
  organizationSettings?: any;
  productId?: string;
  priceInfo?: any;
  availableStock?: number;
}

export const ProductSEOHead: React.FC<ProductSEOHeadProps> = React.memo(({
  product,
  organization,
  organizationSettings,
  productId,
  priceInfo,
  availableStock = 0
}) => {
  useEffect(() => {
    try { setStoreHeadActive(true); } catch {}
    return () => { try { setStoreHeadActive(false); } catch {} };
  }, []);

  // حماية إضافية ضد أخطاء Helmet
  const [isHelmetReady, setIsHelmetReady] = React.useState(false);
  const [helmetError, setHelmetError] = React.useState(false);
  
  useEffect(() => {
    // تأخير قصير لضمان تهيئة HelmetProvider
    const timer = setTimeout(() => {
      setIsHelmetReady(true);
    }, 200);
    
    return () => clearTimeout(timer);
  }, []);

  // معالج أخطاء Helmet
  const handleHelmetError = React.useCallback(() => {
    setHelmetError(true);
  }, []);
  
  const storeName = organizationSettings?.site_name || organization?.name || 'المتجر';
  
  // صورة المنتج للـ Open Graph - calculate this before any early returns
  const defaultColorImage = (product?.colors || product?.variants?.colors || [])
    .find((c: any) => c && (c.is_default || c.isDefault))?.image_url;
  const ogImage = defaultColorImage || product?.images?.thumbnail_image || product?.images?.additional_images?.[0]?.url || undefined;
  
  // Build LCP image preload hints (client-side) - moved to top to avoid conditional hook usage
  const lcpPreload = useMemo(() => {
    try {
      if (!ogImage) return null;
      const widths = [400, 600, 800];
      const src = getCdnImageUrl(ogImage, { width: 800, quality: 72, fit: 'contain', format: 'auto' });
      const srcset = widths
        .map(w => `${getCdnImageUrl(ogImage, { width: w, quality: 70, fit: 'contain', format: 'auto' })} ${w}w`)
        .join(', ');
      const sizes = '(max-width: 768px) 100vw, 50vw';
      return { src, srcset, sizes };
    } catch { return null; }
  }, [ogImage]);

  // Effect to ensure preloaded images are marked as used when they appear in the DOM
  useEffect(() => {
    if (!lcpPreload?.src) return;
    
    const checkImageUsage = () => {
      const images = document.querySelectorAll('img');
      const isImageUsed = Array.from(images).some(img => {
        const imgSrc = img.src || img.currentSrc;
        if (!imgSrc) return false;
        
        // Check if the preloaded image is actually used
        const preloadUrl = lcpPreload.src;
        if (imgSrc === preloadUrl) return true;
        
        // Check without query parameters
        const urlWithoutQuery = preloadUrl.split('?')[0];
        const imgSrcWithoutQuery = imgSrc.split('?')[0];
        if (urlWithoutQuery === imgSrcWithoutQuery) return true;
        
        return false;
      });
      
      if (isImageUsed && typeof window !== 'undefined' && (window as any).preloadManager) {
        (window as any).preloadManager.markAsUsed(lcpPreload.src);
      }
    };
    
    // Check immediately and after a short delay
    checkImageUsage();
    const timer = setTimeout(checkImageUsage, 1000);
    
    return () => clearTimeout(timer);
  }, [lcpPreload?.src]);
  
  // DOM fallback effect (declared unconditionally to preserve hook order)
  useEffect(() => {
    if (isHelmetReady && !helmetError) return; // Helmet will handle
    // if product + organization present, apply full product SEO via DOM
    if (product && organization) {
      const productName = product.name || 'منتج';
      const title = `${productName} | ${storeName}`;
      document.title = title;
      const addOrUpdateMeta = (name: string, content: string, property?: boolean) => {
        const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
        let meta = document.querySelector(selector) as HTMLMetaElement;
        if (!meta) {
          meta = document.createElement('meta');
          if (property) meta.setAttribute('property', name); else meta.setAttribute('name', name);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };
      addOrUpdateMeta('description', `اشتري ${productName} بأفضل سعر من ${storeName}. توصيل سريع لجميع الولايات.`);
      addOrUpdateMeta('robots', 'index, follow');
      addOrUpdateMeta('googlebot', 'index, follow');
      addOrUpdateMeta('og:type', 'product', true);
      addOrUpdateMeta('og:title', title, true);
      addOrUpdateMeta('og:description', `اشتري ${productName} بأفضل سعر من ${storeName}. توصيل سريع لجميع الولايات.`, true);
      addOrUpdateMeta('og:url', window.location.href.split('?')[0], true);
      addOrUpdateMeta('og:site_name', storeName, true);
      addOrUpdateMeta('og:locale', 'ar_DZ', true);
      if (ogImage) addOrUpdateMeta('og:image', ogImage, true);
      addOrUpdateMeta('twitter:card', 'summary_large_image');
      addOrUpdateMeta('twitter:title', title);
      addOrUpdateMeta('twitter:description', `اشتري ${productName} بأفضل سعر من ${storeName}. توصيل سريع لجميع الولايات.`);
      if (ogImage) addOrUpdateMeta('twitter:image', ogImage);
      return;
    }
    // else case (no product/org yet): apply minimal default SEO
    const defaultTitle = productId ? `منتج ${productId} | ${storeName}` : `${storeName} - متجر إلكتروني`;
    document.title = defaultTitle;
    const addOrUpdateMeta = (name: string, content: string) => {
      const selector = `meta[name="${name}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };
    addOrUpdateMeta('description', `تسوق من ${storeName} - متجر إلكتروني بأفضل الأسعار والعروض. توصيل سريع لجميع الولايات.`);
    addOrUpdateMeta('robots', 'index, follow');
    addOrUpdateMeta('googlebot', 'index, follow');
  }, [isHelmetReady, helmetError, product, organization, storeName, ogImage, productId]);

  // Cleanup effect to remove fallback tags when unmounting or when Helmet takes over
  useEffect(() => {
    if (isHelmetReady && !helmetError) return; // Helmet path keeps tags managed
    return () => {
      const selectors = [
        'meta[name="description"]',
        'meta[name="robots"]',
        'meta[name="googlebot"]',
        'meta[property="og:type"]',
        'meta[property="og:title"]',
        'meta[property="og:description"]',
        'meta[property="og:url"]',
        'meta[property="og:site_name"]',
        'meta[property="og:locale"]',
        'meta[property="og:image"]',
        'meta[name="twitter:card"]',
        'meta[name="twitter:title"]',
        'meta[name="twitter:description"]',
        'meta[name="twitter:image"]'
      ];
      selectors.forEach(s => {
        const el = document.querySelector(s);
        if (el) el.remove();
      });
    };
  }, [isHelmetReady, helmetError]);

  // If Helmet not ready or errored, render nothing (DOM fallback effect handles metadata)
  if (!isHelmetReady || helmetError) return null;
  // If product/org not yet ready, render nothing (fallback effect already set baseline)
  if (!product || !organization) return null;

  // البيانات متوفرة، انشئ SEO كامل
  const productName = product.name || 'منتج';
  const productPrice = priceInfo?.price ? `${priceInfo.price.toLocaleString()} د.ج` : '';
  
  // إنشاء عنوان محسن للSEO
  const title = `${productName} | ${storeName}`;
  
  // إنشاء وصف محسن للSEO
  let description = `اشتري ${productName} بأفضل سعر من ${storeName}. `;
  if (product.description) {
    // استخراج أول 150 حرف من الوصف
    const cleanDescription = product.description.replace(/<[^>]*>/g, '').trim();
    description += cleanDescription.length > 100 ? cleanDescription.substring(0, 100) + '...' : cleanDescription;
  } else {
    description += 'توصيل سريع لجميع الولايات. جودة عالية وأسعار منافسة.';
  }
  
  // URL الكنسي
  const canonicalUrl = window.location.href.split('?')[0]; // إزالة query parameters
  
  const productPriceValue = priceInfo?.price || 0;
  const productAvailability = availableStock > 0 ? 'in stock' : 'out of stock';
  
  return (
    <HelmetErrorBoundary onError={handleHelmetError}>
      <Helmet>
        <meta name="x-store-head-active" content="1" />
        {lcpPreload && (
          // Preload the likely LCP image (product main image) for faster LCP on mobile
          // Only preload if we're confident the image will be used immediately
          <link
            rel="preload"
            as="image"
            href={lcpPreload.src}
            imageSrcSet={lcpPreload.srcset}
            imageSizes={lcpPreload.sizes}
            fetchPriority="high"
          />
        )}
        {/* العنوان الأساسي */}
        <title>{title}</title>
        
        {/* Meta Tags أساسية */}
        <meta name="description" content={description} />
        <meta name="keywords" content={`${productName}, ${storeName}, شراء اونلاين, منتجات عامة, الجزائر`} />
        
        {/* Open Graph Tags للـ Facebook */}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content={storeName} />
        <meta property="og:locale" content="ar_DZ" />
        {ogImage && <meta property="og:image" content={ogImage} />}
        
        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        
        {/* Product Schema أساسي */}
        <meta property="product:price:amount" content={productPriceValue.toString()} />
        <meta property="product:price:currency" content="DZD" />
        <meta property="product:availability" content={productAvailability} />
        
        {/* Canonical URL */}
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Robots */}
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />
        
        {/* JSON-LD Structured Data للمنتج */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": productName,
            "description": description,
            "image": ogImage ? [ogImage] : [],
            "url": canonicalUrl,
            "brand": {
              "@type": "Brand",
              "name": storeName
            },
            "offers": {
              "@type": "Offer",
              "price": productPriceValue,
              "priceCurrency": "DZD",
              "availability": productAvailability === 'in stock' 
                ? "https://schema.org/InStock" 
                : "https://schema.org/OutOfStock",
              "seller": {
                "@type": "Organization",
                "name": storeName
              }
            },
            "category": "منتجات عامة"
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": storeName,
            ...(ogImage ? { "logo": ogImage } : {}),
            "url": canonicalUrl
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": storeName,
                "item": canonicalUrl.split('/').slice(0, 3).join('/') + '/'
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": productName,
                "item": canonicalUrl
              }
            ]
          })}
        </script>
      </Helmet>
    </HelmetErrorBoundary>
  );
});

ProductSEOHead.displayName = 'ProductSEOHead';
