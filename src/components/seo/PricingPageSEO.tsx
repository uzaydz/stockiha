import React from 'react';
import SEOHead from './SEOHead';

const PricingPageSEO: React.FC = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "أسعار سطوكيها - خطط الاشتراك",
    "description": "اكتشف خطط أسعار سطوكيها المناسبة لمتجرك. ابدأ مجاناً أو اختر الخطة التي تناسب احتياجاتك.",
    "url": "https://stockiha.com/pricing",
    "inLanguage": "ar",
    "isPartOf": {
      "@type": "WebSite",
      "name": "سطوكيها",
      "url": "https://stockiha.com"
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "الرئيسية",
          "item": "https://stockiha.com"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "الأسعار",
          "item": "https://stockiha.com/pricing"
        }
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": "خطط أسعار سطوكيها",
      "description": "خطط الاشتراك المختلفة لمنصة سطوكيها",
      "itemListElement": [
        {
          "@type": "Offer",
          "name": "الخطة المجانية",
          "description": "ابدأ مجاناً مع الميزات الأساسية",
          "price": "0",
          "priceCurrency": "DZD",
          "availability": "https://schema.org/InStock"
        },
        {
          "@type": "Offer",
          "name": "الخطة الأساسية",
          "description": "ميزات متقدمة للمتاجر الصغيرة",
          "price": "5000",
          "priceCurrency": "DZD",
          "availability": "https://schema.org/InStock"
        },
        {
          "@type": "Offer",
          "name": "الخطة المتقدمة",
          "description": "ميزات شاملة للمتاجر المتوسطة",
          "price": "15000",
          "priceCurrency": "DZD",
          "availability": "https://schema.org/InStock"
        },
        {
          "@type": "Offer",
          "name": "الخطة الاحترافية",
          "description": "جميع الميزات للمتاجر الكبيرة",
          "price": "30000",
          "priceCurrency": "DZD",
          "availability": "https://schema.org/InStock"
        }
      ]
    }
  };

  return (
    <SEOHead
      title="أسعار سطوكيها - خطط الاشتراك | ابدأ مجاناً"
      description="اكتشف خطط أسعار سطوكيها المناسبة لمتجرك. ابدأ مجاناً أو اختر الخطة التي تناسب احتياجاتك. خطط مرنة تبدأ من 0 دج شهرياً."
      keywords="أسعار سطوكيها، خطط الاشتراك، سعر منصة إدارة المتاجر، تكلفة POS، سعر المتجر الإلكتروني، خطط مجانية، اشتراك شهري"
      url="https://stockiha.com/pricing"
      structuredData={structuredData}
    />
  );
};

export default PricingPageSEO;
