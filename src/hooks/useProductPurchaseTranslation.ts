import { useTranslation } from 'react-i18next';
import { productPurchaseTranslations } from '@/i18n/translations/productPurchase';

type LanguageKey = keyof typeof productPurchaseTranslations;

export const useProductPurchaseTranslation = () => {
  const { i18n } = useTranslation();
  const currentLanguage = (i18n.language || 'ar') as LanguageKey;

  const t = (section: string, key: string, fallback?: string) => {
    try {
      const sectionData = productPurchaseTranslations[currentLanguage]?.[section as keyof typeof productPurchaseTranslations[LanguageKey]];
      if (sectionData && typeof sectionData === 'object') {
        const value = (sectionData as any)[key];
        return value || fallback || key;
      }
      return fallback || key;
    } catch (error) {
      console.warn(`Translation key not found: ${section}.${key}`);
      return fallback || key;
    }
  };

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
      console.warn(`Dynamic translation not found for: ${text}`);
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
    variants: () => t('productVariantSelector', 'variants')
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