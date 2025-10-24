import React from 'react';
import SEOHead from './SEOHead';

const HomePageSEO: React.FC = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "سطوكيها - منصة إدارة المتاجر الذكية",
    "description": "منصة شاملة لإدارة المتاجر تجمع بين نقطة البيع والمتجر الإلكتروني وإدارة المخزون. ابدأ مجاناً اليوم!",
    "url": "https://stockiha.com",
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
        }
      ]
    },
    "mainEntity": {
      "@type": "SoftwareApplication",
      "name": "سطوكيها",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "DZD"
      }
    }
  };

  return (
    <SEOHead
      title="سطوكيها - منصة إدارة المتاجر الذكية | نقطة البيع والمتجر الإلكتروني"
      description="منصة شاملة لإدارة المتاجر تجمع بين نقطة البيع والمتجر الإلكتروني وإدارة المخزون. نظام POS متكامل، إدارة المخزون، التقارير المالية، وأكثر. ابدأ مجاناً اليوم!"
      keywords="إدارة متجر، نقطة بيع، متجر إلكتروني، POS، إدارة مخزون، سطوكيها، منصة تجارة إلكترونية، نظام نقاط البيع، إدارة المبيعات، التقارير المالية، الجزائر، التجارة الإلكترونية، منصة SaaS"
      structuredData={structuredData}
    />
  );
};

export default HomePageSEO;
