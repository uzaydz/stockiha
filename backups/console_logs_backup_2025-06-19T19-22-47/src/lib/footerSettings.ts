import { TFunction } from 'i18next';

export interface FooterSettings {
  storeName: string;
  logoUrl?: string;
  description?: string;
  showSocialLinks: boolean;
  showContactInfo: boolean;
  showFeatures: boolean;
  showNewsletter: boolean;
  showPaymentMethods: boolean;
  socialLinks: Array<{ platform: 'facebook' | 'twitter' | 'instagram' | 'youtube'; url: string }>;
  contactInfo: {
    phone: string;
    email: string;
    address: string;
  };
  footerSections: Array<{
    id: string;
    title: string;
    links: Array<{
      id: string;
      text: string;
      url: string;
      isExternal: boolean;
    }>;
  }>;
  features: Array<{
    id: string;
    icon: string;
    title: string;
    description: string;
  }>;
  newsletterSettings: {
    enabled: boolean;
    title: string;
    description: string;
    placeholder: string;
    buttonText: string;
  };
  paymentMethods: string[];
  legalLinks: Array<{
    id: string;
    text: string;
    url: string;
    isExternal: boolean;
  }>;
}

export const getDefaultFooterSettings = (
  storeName: string,
  storeData: any,
  t: TFunction
): FooterSettings => {
  return {
    storeName: storeName,
    logoUrl: storeData?.organization_details?.logo_url,
    description: storeData?.organization_details?.description || 'مع سطوكيها... كلشي فبلاصتو!',
    showSocialLinks: true,
    showContactInfo: true,
    showFeatures: true,
    showNewsletter: true,
    showPaymentMethods: true,
    socialLinks: [
      { platform: 'facebook' as const, url: 'https://facebook.com/stockiha' },
      { platform: 'instagram' as const, url: 'https://instagram.com/stockiha' }
    ],
    contactInfo: {
      phone: '0540240886',
      email: storeData?.organization_details?.contact_email || storeData?.organization_details?.email || 'info@stockiha.com',
      address: 'خنشلة حي النصر، الجزائر'
    },
    footerSections: [
      {
        id: '1',
        title: t('storeFooter.quickLinks'),
        links: [
          { id: '1-1', text: t('storeFooter.home'), url: '/', isExternal: false },
          { id: '1-2', text: t('storeFooter.products'), url: '/products', isExternal: false },
          { id: '1-3', text: t('storeFooter.contact'), url: '/contact', isExternal: false }
        ]
      },
      {
        id: '2',
        title: t('storeFooter.customerService'),
        links: [
          { id: '2-1', text: t('storeFooter.helpCenter'), url: '/help', isExternal: false },
          { id: '2-2', text: t('storeFooter.shippingPolicy'), url: '/shipping-policy', isExternal: false },
          { id: '2-3', text: t('storeFooter.faq'), url: '/faq', isExternal: false }
        ]
      }
    ],
    features: [
      {
        id: '1',
        icon: 'Truck',
        title: 'شحن سريع',
        description: 'توصيل مجاني للطلبات +5000 د.ج'
      },
      {
        id: '2',
        icon: 'CreditCard',
        title: 'دفع آمن',
        description: 'طرق دفع متعددة 100% آمنة'
      },
      {
        id: '3',
        icon: 'Heart',
        title: 'ضمان الجودة',
        description: 'منتجات عالية الجودة معتمدة'
      },
      {
        id: '4',
        icon: 'ShieldCheck',
        title: 'دعم 24/7',
        description: 'مساعدة متوفرة طول اليوم'
      }
    ],
    newsletterSettings: {
      enabled: true,
      title: t('storeFooter.newsletter.title'),
      description: t('storeFooter.newsletter.description'),
      placeholder: t('storeFooter.newsletter.placeholder'),
      buttonText: t('storeFooter.newsletter.buttonText')
    },
    paymentMethods: ['visa', 'mastercard', 'paypal'],
    legalLinks: [
      { id: 'legal-1', text: 'شروط الاستخدام', url: '/terms', isExternal: false },
      { id: 'legal-2', text: 'سياسة الخصوصية', url: '/privacy', isExternal: false }
    ]
  };
};

export const mergeFooterSettings = (
  defaultSettings: FooterSettings,
  customSettings: any
): FooterSettings => {
  return customSettings 
    ? { ...defaultSettings, ...customSettings } 
    : defaultSettings;
};
