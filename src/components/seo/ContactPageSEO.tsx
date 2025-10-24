import React from 'react';
import SEOHead from './SEOHead';

const ContactPageSEO: React.FC = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "اتصل بنا - سطوكيها",
    "description": "تواصل مع فريق سطوكيها للحصول على الدعم الفني أو الاستفسارات. نحن هنا لمساعدتك في إدارة متجرك.",
    "url": "https://stockiha.com/contact",
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
          "name": "اتصل بنا",
          "item": "https://stockiha.com/contact"
        }
      ]
    },
    "mainEntity": {
      "@type": "Organization",
      "name": "سطوكيها",
      "contactPoint": [
        {
          "@type": "ContactPoint",
          "contactType": "customer service",
          "availableLanguage": "Arabic",
          "areaServed": "DZ"
        },
        {
          "@type": "ContactPoint",
          "contactType": "technical support",
          "availableLanguage": "Arabic",
          "areaServed": "DZ"
        }
      ]
    }
  };

  return (
    <SEOHead
      title="اتصل بنا - سطوكيها | الدعم الفني والاستفسارات"
      description="تواصل مع فريق سطوكيها للحصول على الدعم الفني أو الاستفسارات. نحن هنا لمساعدتك في إدارة متجرك بأفضل الطرق."
      keywords="اتصل بنا، دعم فني، استفسارات، سطوكيها، خدمة العملاء، مساعدة، تواصل، فريق الدعم"
      url="https://stockiha.com/contact"
      structuredData={structuredData}
    />
  );
};

export default ContactPageSEO;
