import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  structuredData?: object;
  noindex?: boolean;
  canonical?: string;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title = "سطوكيها - منصة إدارة المتاجر الذكية",
  description = "منصة شاملة لإدارة المتاجر تجمع بين نقطة البيع والمتجر الإلكتروني وإدارة المخزون. ابدأ مجاناً اليوم!",
  keywords = "إدارة متجر، نقطة بيع، متجر إلكتروني، POS، إدارة مخزون، سطوكيها، منصة تجارة إلكترونية",
  image = "https://stockiha.com/images/stockiha-og-image.webp",
  url = "https://stockiha.com",
  type = "website",
  structuredData,
  noindex = false,
  canonical
}) => {
  const fullTitle = title.includes('سطوكيها') ? title : `${title} | سطوكيها`;
  const canonicalUrl = canonical || url;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"} />
      <meta name="author" content="سطوكيها" />
      <meta name="language" content="Arabic" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />
      <meta property="og:site_name" content="سطوكيها" />
      <meta property="og:locale" content="ar_DZ" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@stockiha" />
      <meta name="twitter:creator" content="@stockiha" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={title} />
      
      {/* Additional SEO Meta Tags */}
      <meta name="application-name" content="سطوكيها" />
      <meta name="apple-mobile-web-app-title" content="سطوكيها" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="msapplication-TileColor" content="#6b21a8" />
      <meta name="theme-color" content="#6b21a8" />
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHead;
