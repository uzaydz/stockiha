import React from 'react';
import SEOHead from './SEOHead';

const FeaturesPageSEO: React.FC = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "ميزات سطوكيها - منصة إدارة المتاجر الذكية",
    "description": "اكتشف جميع ميزات سطوكيها المتقدمة: نقطة البيع، المتجر الإلكتروني، إدارة المخزون، التقارير المالية، وأكثر.",
    "url": "https://stockiha.com/features",
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
          "name": "الميزات",
          "item": "https://stockiha.com/features"
        }
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": "ميزات سطوكيها",
      "description": "جميع الميزات المتاحة في منصة سطوكيها لإدارة المتاجر",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "نقطة البيع المتقدمة",
          "description": "نظام نقطة بيع متكامل مع إدارة المبيعات والدفع"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "المتجر الإلكتروني",
          "description": "متجر إلكتروني احترافي مع تصميم متجاوب"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "إدارة المخزون",
          "description": "إدارة ذكية للمخزون مع تتبع المنتجات"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "التقارير المالية",
          "description": "تقارير مالية تفصيلية وتحليلات متقدمة"
        },
        {
          "@type": "ListItem",
          "position": 5,
          "name": "إدارة العملاء",
          "description": "نظام إدارة العملاء مع قاعدة بيانات شاملة"
        },
        {
          "@type": "ListItem",
          "position": 6,
          "name": "التكامل مع وسائل الدفع",
          "description": "تكامل مع جميع وسائل الدفع المحلية والدولية"
        }
      ]
    }
  };

  return (
    <SEOHead
      title="ميزات سطوكيها - منصة إدارة المتاجر الذكية"
      description="اكتشف جميع ميزات سطوكيها المتقدمة: نقطة البيع، المتجر الإلكتروني، إدارة المخزون، التقارير المالية، إدارة العملاء، والتكامل مع وسائل الدفع. منصة شاملة لإدارة متجرك."
      keywords="ميزات سطوكيها، نقطة البيع، متجر إلكتروني، إدارة مخزون، تقارير مالية، إدارة عملاء، وسائل دفع، منصة SaaS، إدارة متجر"
      url="https://stockiha.com/features"
      structuredData={structuredData}
    />
  );
};

export default FeaturesPageSEO;
