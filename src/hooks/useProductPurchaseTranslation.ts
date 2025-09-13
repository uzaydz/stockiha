import { useEffect, useMemo, useState } from 'react';
import i18n from 'i18next';
import { productPurchaseTranslations } from '@/i18n/translations';

type SupportedLang = keyof typeof productPurchaseTranslations; // 'ar' | 'en' | 'fr'

const normalizeLang = (lang?: string): SupportedLang => {
  const l = (lang || 'ar').toLowerCase();
  if (l.startsWith('ar')) return 'ar';
  if (l.startsWith('fr')) return 'fr';
  if (l.startsWith('en')) return 'en';
  return 'ar';
};

export const useProductPurchaseTranslation = () => {
  // Track current language without using react-i18next hooks to avoid hook order issues
  const [lang, setLang] = useState<SupportedLang>(normalizeLang(i18n?.language));

  useEffect(() => {
    const handler = (lng: string) => setLang(normalizeLang(lng));
    
    // ✅ إصلاح: التحقق من وجود i18n وأنه كائن صحيح مع الدوال المطلوبة
    const isValidI18n = i18n && 
                        typeof i18n === 'object' && 
                        typeof i18n.on === 'function' && 
                        typeof i18n.off === 'function';
    
    if (isValidI18n) {
      try {
        i18n.on('languageChanged', handler);
      } catch (error) {
        console.warn('⚠️ [useProductPurchaseTranslation] خطأ في تسجيل مستمع اللغة:', error);
      }
    }
    
    // Ensure state is in sync on mount as well
    const currentLang = isValidI18n ? i18n.language : 'ar';
    setLang(prev => normalizeLang(currentLang) || prev);
    
    return () => {
      if (isValidI18n) {
        try { 
          i18n.off('languageChanged', handler); 
        } catch (error) {
          console.warn('⚠️ [useProductPurchaseTranslation] خطأ في إزالة مستمع اللغة:', error);
        }
      }
    };
  }, []);

  const currentLanguage: SupportedLang = lang;

  // Safe getter with dot-path support (e.g., 'suggestions.checkLink')
  const t = useMemo(() => {
    const getFromSection = (section: string, key: string): string | undefined => {
      const sectionData: any = (productPurchaseTranslations as any)[currentLanguage]?.[section];
      if (!sectionData || typeof sectionData !== 'object') return undefined;
      // Support nested keys with dot-notation
      if (!key.includes('.')) return sectionData[key];
      return key.split('.').reduce((acc: any, k: string) => (acc && typeof acc === 'object') ? acc[k] : undefined, sectionData);
    };
    return (section: string, key: string, fallback?: string) => {
      try {
        const val = getFromSection(section, key);
        return (typeof val === 'string' && val) || fallback || key;
      } catch {
        return fallback || key;
      }
    };
  }, [currentLanguage]);

  // دالة ترجمة النصوص الديناميكية
  const translateDynamicText = (text: string): string => {
    if (!text) return text;
    
    try {
      const dynamicTranslations = productPurchaseTranslations[currentLanguage]?.dynamicFormTranslations;
      if (dynamicTranslations && typeof dynamicTranslations === 'object') {
        const translation = (dynamicTranslations as any)[text];
        return translation || text;
      }
      return text;
    } catch (error) {
      return text;
    }
  };

  const productHeader = {
    new: () => t('productHeader', 'new'),
    featured: () => t('productHeader', 'featured'),
    limitedQuantity: () => t('productHeader', 'limitedQuantity'),
    available: () => t('productHeader', 'available'),
    brand: () => t('productHeader', 'brand'),
    stockStatus: () => t('productHeader', 'stockStatus'),
    piecesAvailable: () => t('productHeader', 'piecesAvailable'),
    outOfStock: () => t('productHeader', 'outOfStock')
  };

  const productDescription = {
    readMore: () => t('productDescription', 'readMore'),
    showLess: () => t('productDescription', 'showLess')
  };

  const productActions = {
    buyNow: () => t('productActions', 'buyNow'),
    orderNow: () => t('productActions', 'orderNow'),
    addToCart: () => t('productActions', 'addToCart'),
    calculating: () => t('productActions', 'calculating'),
    product: () => t('productActions', 'product'),
    delivery: () => t('productActions', 'delivery'),
    totalPrice: () => t('productActions', 'totalPrice'),
    freeDelivery: () => t('productActions', 'freeDelivery'),
    scrollToForm: () => t('productActions', 'scrollToForm'),
    completeOrder: () => t('productActions', 'completeOrder')
  };

  const productPageSkeleton = {
    loading: () => t('productPageSkeleton', 'loading'),
    loadingProduct: () => t('productPageSkeleton', 'loadingProduct'),
    pleaseWait: () => t('productPageSkeleton', 'pleaseWait')
  };

  const productErrorPage = {
    productNotFound: () => t('productErrorPage', 'productNotFound'),
    errorMessage: () => t('productErrorPage', 'errorMessage'),
    tryTheseSolutions: () => t('productErrorPage', 'tryTheseSolutions'),
    suggestions: {
      checkLink: () => t('productErrorPage', 'suggestions.checkLink'),
      reloadPage: () => t('productErrorPage', 'suggestions.reloadPage'),
      browseProducts: () => t('productErrorPage', 'suggestions.browseProducts'),
      goHome: () => t('productErrorPage', 'suggestions.goHome')
    },
    buttons: {
      retry: () => t('productErrorPage', 'buttons.retry'),
      goHome: () => t('productErrorPage', 'buttons.goHome'),
      browseProducts: () => t('productErrorPage', 'buttons.browseProducts')
    }
  };

  const productImageGallery = {
    mainImage: () => t('productImageGallery', 'mainImage'),
    previousImage: () => t('productImageGallery', 'previousImage'),
    nextImage: () => t('productImageGallery', 'nextImage'),
    imageOf: (productName: string) => t('productImageGallery', 'imageOf').replace('{productName}', productName),
    zoomIn: () => t('productImageGallery', 'zoomIn'),
    zoomOut: () => t('productImageGallery', 'zoomOut'),
    fullscreen: () => t('productImageGallery', 'fullscreen'),
    closeFullscreen: () => t('productImageGallery', 'closeFullscreen'),
    imageGallery: () => t('productImageGallery', 'imageGallery'),
    thumbnails: () => t('productImageGallery', 'thumbnails')
  };

  const productVariantSelector = {
    color: () => t('productVariantSelector', 'color'),
    size: () => t('productVariantSelector', 'size'),
    selectColor: () => t('productVariantSelector', 'selectColor'),
    selectSize: () => t('productVariantSelector', 'selectSize'),
    selectedColor: () => t('productVariantSelector', 'selectedColor'),
    selectedSize: () => t('productVariantSelector', 'selectedSize'),
    availableSizes: () => t('productVariantSelector', 'availableSizes'),
    outOfStock: () => t('productVariantSelector', 'outOfStock'),
    available: () => t('productVariantSelector', 'available'),
    pieces: () => t('productVariantSelector', 'pieces'),
          noSizesAvailable: () => t('productVariantSelector', 'noSizesAvailable'),
      loadingSizes: () => t('productVariantSelector', 'loadingSizes'),
      variants: () => t('productVariantSelector', 'variants'),
      lowStock: () => t('productVariantSelector', 'lowStock'),
      outOfStockFull: () => t('productVariantSelector', 'outOfStockFull'),
      pricesMayVary: () => t('productVariantSelector', 'pricesMayVary')
  };

  const productPriceDisplay = {
    price: () => t('productPriceDisplay', 'price'),
    originalPrice: () => t('productPriceDisplay', 'originalPrice'),
    salePrice: () => t('productPriceDisplay', 'salePrice'),
    discount: () => t('productPriceDisplay', 'discount'),
    saveAmount: () => t('productPriceDisplay', 'saveAmount'),
    currency: () => t('productPriceDisplay', 'currency'),
    priceRange: (min: number, max: number) => t('productPriceDisplay', 'priceRange').replace('{min}', min.toString()).replace('{max}', max.toString()),
    startingFrom: () => t('productPriceDisplay', 'startingFrom'),
    finalPrice: () => t('productPriceDisplay', 'finalPrice'),
    includingTax: () => t('productPriceDisplay', 'includingTax'),
    excludingTax: () => t('productPriceDisplay', 'excludingTax')
  };

  const productQuantitySelector = {
    quantity: () => t('productQuantitySelector', 'quantity'),
    increaseQuantity: () => t('productQuantitySelector', 'increaseQuantity'),
    decreaseQuantity: () => t('productQuantitySelector', 'decreaseQuantity'),
    maxQuantity: (max: number) => t('productQuantitySelector', 'maxQuantity').replace('{max}', max.toString()),
    minQuantity: () => t('productQuantitySelector', 'minQuantity'),
    availableStock: (stock: number) => t('productQuantitySelector', 'availableStock').replace('{stock}', stock.toString()),
    outOfStock: () => t('productQuantitySelector', 'outOfStock'),
    selectQuantity: () => t('productQuantitySelector', 'selectQuantity'),
    totalPrice: () => t('productQuantitySelector', 'totalPrice'),
    currency: () => t('productQuantitySelector', 'currency')
  };

  const productFeatures = {
    features: () => t('productFeatures', 'features'),
    specifications: () => t('productFeatures', 'specifications'),
    highlights: () => t('productFeatures', 'highlights'),
    benefits: () => t('productFeatures', 'benefits'),
    warranty: () => t('productFeatures', 'warranty'),
    shipping: () => t('productFeatures', 'shipping'),
    returns: () => t('productFeatures', 'returns'),
    support: () => t('productFeatures', 'support')
  };

  const productOfferTimer = {
    limitedOffer: () => t('productOfferTimer', 'limitedOffer'),
    offerEndsIn: () => t('productOfferTimer', 'offerEndsIn'),
    days: () => t('productOfferTimer', 'days'),
    hours: () => t('productOfferTimer', 'hours'),
    minutes: () => t('productOfferTimer', 'minutes'),
    seconds: () => t('productOfferTimer', 'seconds'),
    offerExpired: () => t('productOfferTimer', 'offerExpired'),
    hurryUp: () => t('productOfferTimer', 'hurryUp'),
    flashSale: () => t('productOfferTimer', 'flashSale'),
    specialPrice: () => t('productOfferTimer', 'specialPrice')
  };

  const productFormRenderer = {
    orderForm: () => t('productFormRenderer', 'orderForm'),
    customerInfo: () => t('productFormRenderer', 'customerInfo'),
    deliveryInfo: () => t('productFormRenderer', 'deliveryInfo'),
    orderSummary: () => t('productFormRenderer', 'orderSummary'),
    submitOrder: () => t('productFormRenderer', 'submitOrder'),
    submittingOrder: () => t('productFormRenderer', 'submittingOrder'),
    requiredField: () => t('productFormRenderer', 'requiredField'),
    fillAllFields: () => t('productFormRenderer', 'fillAllFields'),
    selectColor: () => t('productFormRenderer', 'selectColor'),
    selectColorDescription: () => t('productFormRenderer', 'selectColorDescription'),
    selectSize: () => t('productFormRenderer', 'selectSize'),
    selectSizeDescription: () => t('productFormRenderer', 'selectSizeDescription'),
    selectProvince: () => t('productFormRenderer', 'selectProvince'),
    selectProvinceFirst: () => t('productFormRenderer', 'selectProvinceFirst'),
    selectMunicipality: () => t('productFormRenderer', 'selectMunicipality'),
    invalidEmail: () => t('productFormRenderer', 'invalidEmail'),
    invalidPhone: () => t('productFormRenderer', 'invalidPhone'),
    invalidField: () => t('productFormRenderer', 'invalidField'),
    clickToSubmit: () => t('productFormRenderer', 'clickToSubmit'),
    pleaseWait: () => t('productFormRenderer', 'pleaseWait'),
    fixErrorsFirst: () => t('productFormRenderer', 'fixErrorsFirst'),
    mustBeGreaterThan: () => t('productFormRenderer', 'mustBeGreaterThan'),
    mustBeLessThan: () => t('productFormRenderer', 'mustBeLessThan'),
    availableColor: () => t('productFormRenderer', 'availableColor'),
    availableSize: () => t('productFormRenderer', 'availableSize'),
    sizeLabel: () => t('productFormRenderer', 'sizeLabel'),
    homeDelivery: () => t('productFormRenderer', 'homeDelivery'),
    officeDelivery: () => t('productFormRenderer', 'officeDelivery'),
    processing: () => t('productFormRenderer', 'processing')
  };

  const productPurchaseSummary = {
    orderSummary: () => t('productPurchaseSummary', 'orderSummary'),
    productDetails: () => t('productPurchaseSummary', 'productDetails'),
    deliveryDetails: () => t('productPurchaseSummary', 'deliveryDetails'),
    paymentDetails: () => t('productPurchaseSummary', 'paymentDetails'),
    totalAmount: () => t('productPurchaseSummary', 'totalAmount'),
    subtotal: () => t('productPurchaseSummary', 'subtotal'),
    deliveryFee: () => t('productPurchaseSummary', 'deliveryFee'),
    tax: () => t('productPurchaseSummary', 'tax'),
    discount: () => t('productPurchaseSummary', 'discount'),
    finalTotal: () => t('productPurchaseSummary', 'finalTotal'),
    color: () => t('productPurchaseSummary', 'color'),
    size: () => t('productPurchaseSummary', 'size'),
    quantity: () => t('productPurchaseSummary', 'quantity'),
    productPrice: () => t('productPurchaseSummary', 'productPrice'),
    deliveryFees: () => t('productPurchaseSummary', 'deliveryFees'),
    free: () => t('productPurchaseSummary', 'free'),
    toHome: () => t('productPurchaseSummary', 'toHome'),
    toOffice: () => t('productPurchaseSummary', 'toOffice')
  };

  const common = {
    loading: () => t('common', 'loading'),
    error: () => t('common', 'error'),
    retry: () => t('common', 'retry'),
    cancel: () => t('common', 'cancel'),
    confirm: () => t('common', 'confirm'),
    save: () => t('common', 'save'),
    edit: () => t('common', 'edit'),
    delete: () => t('common', 'delete'),
    close: () => t('common', 'close'),
    next: () => t('common', 'next'),
    previous: () => t('common', 'previous'),
    select: () => t('common', 'select'),
    search: () => t('common', 'search'),
    filter: () => t('common', 'filter'),
    sort: () => t('common', 'sort'),
    viewAll: () => t('common', 'viewAll'),
    showMore: () => t('common', 'showMore'),
    showLess: () => t('common', 'showLess')
  };

  return {
    productHeader,
    productDescription,
    productActions,
    productPageSkeleton,
    productErrorPage,
    productImageGallery,
    productVariantSelector,
    productPriceDisplay,
    productQuantitySelector,
    productFeatures,
    productOfferTimer,
    productFormRenderer,
    productPurchaseSummary,
    common,
    translateDynamicText
  };
};
