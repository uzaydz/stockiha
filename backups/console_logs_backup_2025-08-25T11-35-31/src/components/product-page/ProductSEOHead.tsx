import React from 'react';
import { Helmet } from 'react-helmet-async';

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
  const storeName = organizationSettings?.site_name || organization?.name || 'المتجر';
  
  // إذا لم تكن البيانات متوفرة بعد، استخدم بيانات افتراضية محسنة
  if (!product || !organization) {
    const defaultTitle = productId 
      ? `منتج ${productId} | ${storeName}`
      : `${storeName} - متجر إلكتروني`;
    
    return (
      <Helmet>
        <title>{defaultTitle}</title>
        <meta name="description" content={`تسوق من ${storeName} - متجر إلكتروني بأفضل الأسعار والعروض. توصيل سريع لجميع الولايات.`} />
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />
      </Helmet>
    );
  }

  // البيانات متوفرة، انشئ SEO كامل
  const productName = product.name || 'منتج';
  const productPrice = priceInfo?.price ? `${priceInfo.price.toLocaleString()} د.ج` : '';
  
  // إنشاء عنوان محسن للSEO
  const title = `${productName} ${productPrice ? `- ${productPrice}` : ''} | ${storeName}`;
  
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
  
  // صورة المنتج للـ Open Graph
  const ogImage = product.images?.thumbnail_image || product.images?.additional_images?.[0]?.url || undefined;
  const productPriceValue = priceInfo?.price || 0;
  const productAvailability = availableStock > 0 ? 'in stock' : 'out of stock';
  
  return (
    <Helmet>
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
    </Helmet>
  );
});

ProductSEOHead.displayName = 'ProductSEOHead';






