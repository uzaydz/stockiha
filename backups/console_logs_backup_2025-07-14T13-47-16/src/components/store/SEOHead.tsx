import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  seoSettings: {
    title: string;
    description: string;
    keywords?: string;
    ogImage?: string;
    enable_open_graph?: boolean;
    enable_twitter_cards?: boolean;
  };
  storeName: string;
  customCSS?: string;
  customJSHeader?: string;
}

const SEOHead: React.FC<SEOHeadProps> = ({ 
  seoSettings, 
  storeName, 
  customCSS, 
  customJSHeader 
}) => {
  return (
    <>
      {/* إعدادات SEO */}
      <Helmet>
        <title>{seoSettings.title}</title>
        <meta name="description" content={seoSettings.description} />
        {seoSettings.keywords && <meta name="keywords" content={seoSettings.keywords} />}
        
        {/* Open Graph Tags */}
        {seoSettings.enable_open_graph !== false && (
          <>
            <meta property="og:title" content={seoSettings.title} />
            <meta property="og:description" content={seoSettings.description} />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={window.location.href} />
            {seoSettings.ogImage && <meta property="og:image" content={seoSettings.ogImage} />}
            <meta property="og:site_name" content={storeName} />
          </>
        )}
        
        {/* Twitter Cards */}
        {seoSettings.enable_twitter_cards !== false && (
          <>
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={seoSettings.title} />
            <meta name="twitter:description" content={seoSettings.description} />
            {seoSettings.ogImage && <meta name="twitter:image" content={seoSettings.ogImage} />}
          </>
        )}
        
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={window.location.href} />
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

export default React.memo(SEOHead); 