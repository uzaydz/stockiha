import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase';

// استيراد المكونات الجديدة المحسنة
import { NavbarMain } from '@/components/navbar/NavbarMain';
import { ProductHeader } from '@/components/product/ProductHeader';
import { ProductDescription } from '@/components/product/ProductDescription';
import { ProductActions } from '@/components/product/ProductActions';

import { ProductPageSkeleton } from '@/components/product/ProductPageSkeleton';
import { ProductErrorPage } from '@/components/product/ProductErrorPage';

// المكونات الموجودة مسبقاً
import ProductImageGalleryV2 from '@/components/product/ProductImageGalleryV2';
import ProductVariantSelector from '@/components/product/ProductVariantSelector';
import ProductPriceDisplay from '@/components/product/ProductPriceDisplay';
import ProductQuantitySelector from '@/components/product/ProductQuantitySelector';
import ProductFeatures from '@/components/product/ProductFeatures';
import ProductFormRenderer from '@/components/product/ProductFormRenderer';
import ProductPurchaseSummary from '@/components/product/ProductPurchaseSummary';
import ProductOfferTimer from '@/components/product/ProductOfferTimer';
import SpecialOffersDisplay from '@/components/store/special-offers/SpecialOffersDisplay';

// الـ Hooks والسياق
import useProductPurchase from '@/hooks/useProductPurchase';
import { useTenant } from '@/context/TenantContext';

// حاسبة التوصيل
import { 
  calculateDeliveryFeesOptimized,
  type DeliveryCalculationResult 
} from '@/lib/delivery-calculator';

// إضافة استيراد دالة معالجة الطلبيات
import { processOrder } from '@/api/store';
import { useAbandonedCartTracking } from '@/hooks/useAbandonedCartTracking';

// استيراد دوال العروض الخاصة
import { 
  getBestSpecialOffer,
  getSpecialOfferSummary,
  type SpecialOffer 
} from '@/lib/api/productComplete';

// استيراد مكونات التتبع المحسنة
import ProductConversionTracker from '@/components/tracking/ProductConversionTracker';
import EnhancedPixelLoader from '@/components/tracking/EnhancedPixelLoader';
import { useProductTracking } from '@/hooks/useProductTracking';
import { TrackingDebugConsole } from '@/components/debug/TrackingDebugConsole';
import { ConversionAPIMonitor } from '@/components/debug/ConversionAPIMonitor';
import { TrackingSettingsViewer } from '@/components/debug/TrackingSettingsViewer';
import { FacebookEventsLogger } from '@/components/debug/FacebookEventsLogger';
import QuickTrackingCheck from '@/components/debug/QuickTrackingCheck';
import FacebookPixelChecker from '@/components/debug/FacebookPixelChecker';
import { CustomerDataTracker } from '@/components/debug/CustomerDataTracker';
import { MatchQualityOptimizer } from '@/components/debug/MatchQualityOptimizer';

// الأنواع
interface Product {
  id: string;
  name: string;
  brand?: string;
  sku?: string;
  description?: string;
  status: {
    is_new?: boolean;
    is_featured?: boolean;
  };
  pricing?: {
    price: number;
  };
  images?: {
    thumbnail_image?: string;
    additional_images?: Array<{ url: string }>;
  };
  marketing_settings?: any;
  shipping_and_templates?: {
    shipping_info?: any;
  };
  organization?: {
    id: string;
  };
  // إضافة خصائص الألوان والمقاسات
  variants?: {
    has_variants?: boolean;
    colors?: Array<{
      id: string;
      name: string;
      color_code?: string;
      image_url?: string;
      sizes?: Array<{
        id: string;
        size_name: string;
        price?: number;
      }>;
    }>;
  };
}

const ProductPurchasePageV3: React.FC = React.memo(() => {
  // 🚨 CONSOLE DEBUG: اختبار ظهور console logs
  console.log('🎯 ProductPurchasePageV3 تم تحميلها! Console logs تعمل الآن!');
  
  const { productId, productIdentifier } = useParams<{ productId?: string; productIdentifier?: string }>();
  // استخدام productIdentifier إذا كان متوفراً، وإلا استخدام productId
  const actualProductId = productIdentifier || productId;
  const navigate = useNavigate();
  const { currentOrganization: organization } = useTenant();
  
  // ⏱️ قياس وقت تحميل الصفحة
  const [pageStartTime] = useState(() => {
    const startTime = performance.now();
    return startTime;
  });

  // مرجع لمتتبع التحويل
  const conversionTrackerRef = useRef<any>(null);
  
  // حالات المكون
  const [submittedFormData, setSubmittedFormData] = useState<Record<string, any>>({});
  
  // تتبع تغييرات submittedFormData
  useEffect(() => {
  }, [submittedFormData]);
  const [deliveryCalculation, setDeliveryCalculation] = useState<DeliveryCalculationResult | null>(null);
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);
  
  // حالة العروض الخاصة
  const [selectedOffer, setSelectedOffer] = useState<SpecialOffer | null>(null);
  const [isQuantityUpdatedByOffer, setIsQuantityUpdatedByOffer] = useState(false);

  // استخدام hook المخصص لإدارة حالة المنتج - مع منع الطلبات المكررة
  const [state, actions] = useProductPurchase({
    productId: actualProductId,
    organizationId: organization?.id || undefined,
    dataScope: 'ultra'
  });

  // مراقبة عدد الـ renders لتتبع الطلبات المكررة
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  // تسجيل عدد الـ renders للكشف عن المشاكل - فقط في بيئة التطوير
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && renderCountRef.current > 8) {
    }
  }, []);

  const {
    product,
    loading,
    error,
    selectedColor,
    selectedSize,
    quantity,
    addingToCart,
    buyingNow,
    isInWishlist,
    availableStock,
    canPurchase,
    priceInfo,
    totalPrice,
    formData,
    hasCustomForm,
    formStrategy
  } = state;

  // تتبع تغييرات priceInfo
  useEffect(() => {
  }, [priceInfo, selectedColor, selectedSize, quantity]);

  // ⏱️ تتبع وقت تحميل البيانات
  useEffect(() => {
    if (product && !loading) {
      const loadTime = performance.now() - pageStartTime;
    }
  }, [product, loading, pageStartTime, formData]);

  // ⏱️ تتبع وقت اكتمال تحميل النموذج
  useEffect(() => {
    if (formData && product && !loading) {
      const formLoadTime = performance.now() - pageStartTime;
    }
  }, [formData, product, loading, pageStartTime, formStrategy]);

  // ⏱️ تتبع وقت تحميل المتغيرات (الألوان والمقاسات)
  useEffect(() => {
    if (product?.variants?.has_variants && product.variants.colors?.length) {
      const variantsLoadTime = performance.now() - pageStartTime;
    }
  }, [product?.variants, pageStartTime]);

  // ⏱️ تتبع حساب رسوم التوصيل
  useEffect(() => {
    if (deliveryCalculation) {
      const deliveryTime = performance.now() - pageStartTime;
    }
  }, [deliveryCalculation, pageStartTime]);

  const {
    setSelectedColor,
    setSelectedSize,
    setQuantity,
    addToCart,
    buyNow,
    toggleWishlist,
    shareProduct
  } = actions;

  // الحصول على organizationId مع تثبيت القيمة
  const organizationId = useMemo(() => {
    const id = (organization as any)?.id || (product?.organization as any)?.id || null;
    return id;
  }, [(organization as any)?.id, (product?.organization as any)?.id]);

  // إعادة تعيين التمرير إلى الأعلى عند تحميل الصفحة وتنظيف preload links
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // تنظيف preload links القديمة لتجنب التحذيرات
    const cleanupPreloadLinks = () => {
      const oldLinks = document.querySelectorAll('link[rel="preload"][as="image"]');
      oldLinks.forEach(link => {
        if (link.parentNode) {
          link.remove();
        }
      });
    };
    
    cleanupPreloadLinks();
  }, [actualProductId]);

  // hook الطلبات المتروكة المحسّن
  const [isSavingCart, abandonedCartActions] = useAbandonedCartTracking({
    productId: actualProductId,
    productColorId: selectedColor?.id,
    productSizeId: selectedSize?.id,
    quantity,
    subtotal: priceInfo?.price || 0,
    deliveryFee: deliveryCalculation?.deliveryFee || 0,
    discountAmount: priceInfo?.discount || 0,
    organizationId: organizationId,
    enabled: true,
    saveInterval: 3, // حفظ كل 3 ثوان
    minPhoneLength: 8
  });

  // 🎯 Hook التتبع المحسن للبكسل والكونفيجر API
  const productTracking = useProductTracking({
    productId: actualProductId!,
    organizationId: organizationId,
    autoLoadSettings: true,
    enableDebugMode: process.env.NODE_ENV === 'development'
  });

  // دالة تحديث الكمية مع التتبع
  const handleQuantityChange = useCallback((newQuantity: number) => {
    const oldQuantity = quantity;
    setQuantity(newQuantity);
    
    // تحديث الطلب المتروك سيتم تلقائياً عبر useEffect

    // 🛍️ تتبع إضافة إلى السلة عند زيادة الكمية
    if (newQuantity > oldQuantity && product && productTracking.isReady) {
      const quantityDiff = newQuantity - oldQuantity;
      productTracking.trackAddToCart({
        name: product.name,
        price: priceInfo?.price || 0,
        quantity: quantityDiff,
        image: product.images?.thumbnail_image || product.images?.additional_images?.[0]?.url,
        selectedColor: selectedColor?.name,
        selectedSize: selectedSize?.size_name
      });
    }
  }, [quantity, setQuantity, abandonedCartActions, product, productTracking, priceInfo, selectedColor, selectedSize]);

  // 📊 تتبع عرض المحتوى تلقائياً
  useEffect(() => {
    if (product && productTracking.isReady) {
      productTracking.trackViewContent({
        name: product.name,
        price: product.pricing?.price,
        image: product.images?.thumbnail_image || product.images?.additional_images?.[0]?.url,
        selectedColor: selectedColor?.name,
        selectedSize: selectedSize?.size_name,
        quantity
      });
    }
  }, [product, productTracking.isReady, selectedColor, selectedSize, quantity]);

  // 📊 تتبع تغيير المتغيرات (اللون والمقاس)
  useEffect(() => {
    if (product && productTracking.isReady && (selectedColor || selectedSize)) {
      // إرسال حدث ViewContent مع المتغيرات الجديدة
      productTracking.trackViewContent({
        name: product.name,
        price: product.pricing?.price || 0,
        quantity: quantity,
        image: product.images?.thumbnail_image || product.images?.additional_images?.[0]?.url,
        selectedColor: selectedColor?.name,
        selectedSize: selectedSize?.size_name
      });
    }
  }, [selectedColor?.id, selectedSize?.id, product, productTracking.isReady, quantity]);

  // 🎯 اختيار أفضل عرض تلقائياً عند تغيير الكمية
  useEffect(() => {
    if (product && (product as any).special_offers_config?.enabled) {
      // تجاهل التحديث إذا كان بسبب اختيار عرض
      if (isQuantityUpdatedByOffer) {
        setIsQuantityUpdatedByOffer(false);
        return;
      }

      const bestOffer = getBestSpecialOffer(product as any, quantity);
      
      // التحقق من أن العرض المقترح مختلف عن العرض الحالي لتجنب التحديث المستمر
      if (bestOffer?.id !== selectedOffer?.id) {
        setSelectedOffer(bestOffer);
        
      }
    }
  }, [product, quantity, isQuantityUpdatedByOffer, selectedOffer?.id]);

  // حساب السعر النهائي مع العروض الخاصة
  const finalPriceCalculation = useMemo(() => {
    if (!product) return { price: 0, quantity: 0, savings: 0, offerApplied: false };
    
    const offerSummary = getSpecialOfferSummary(product as any, selectedOffer, quantity);
    
    // تسجيل مؤقت للتشخيص
    
    return {
      price: offerSummary.finalPrice,
      quantity: offerSummary.finalQuantity,
      savings: offerSummary.savings,
      offerApplied: offerSummary.offerApplied
    };
  }, [product, selectedOffer, quantity]);

  const handleFormChange = useCallback((data: Record<string, any>) => {
    setSubmittedFormData(data);
    
    // حفظ مؤجل للطلب المتروك عند تغيير البيانات (تقليل الاستدعاءات)
    if (data.phone && data.phone.length >= 8) {
      abandonedCartActions.debouncedSave(data);
    }
  }, [abandonedCartActions]);

  // إعداد مؤقت العرض
  const offerTimerSettings = useMemo(() => {
    if (!product?.marketing_settings) return null;
    
    const marketingSettings = product.marketing_settings as any;
    const offerTimerEnabled = marketingSettings?.offer_timer_enabled === true;
    
    if (!offerTimerEnabled) return null;
    
    let timerType = marketingSettings.offer_timer_type as 'evergreen' | 'specific_date' | 'fixed_duration_per_visitor';
    if (timerType === 'specific_date' && !marketingSettings.offer_timer_end_date) {
      timerType = 'evergreen';
    }
    
    const duration = marketingSettings.offer_timer_duration_minutes || 60;
    
    return {
      offer_timer_enabled: true,
      offer_timer_title: marketingSettings.offer_timer_title || 'عرض خاص',
      offer_timer_type: timerType,
      offer_timer_end_date: marketingSettings.offer_timer_end_date || undefined,
      offer_timer_duration_minutes: duration,
      offer_timer_text_above: marketingSettings.offer_timer_text_above || 'عرض محدود الوقت',
      offer_timer_text_below: marketingSettings.offer_timer_text_below || 'استفد من العرض قبل انتهاء الوقت',
      offer_timer_end_action: (marketingSettings.offer_timer_end_action as 'hide' | 'show_message' | 'redirect') || 'hide',
      offer_timer_end_action_message: marketingSettings.offer_timer_end_action_message || undefined,
      offer_timer_end_action_url: marketingSettings.offer_timer_end_action_url || undefined,
      offer_timer_restart_for_new_session: marketingSettings.offer_timer_restart_for_new_session || false,
      offer_timer_cookie_duration_days: marketingSettings.offer_timer_cookie_duration_days || 30,
      offer_timer_show_on_specific_pages_only: marketingSettings.offer_timer_show_on_specific_pages_only || false,
      offer_timer_specific_page_urls: marketingSettings.offer_timer_specific_page_urls || []
    };
  }, [product?.marketing_settings]);

  // حساب رسوم التوصيل مع debouncing محسن
  useEffect(() => {
    const calculateDelivery = async () => {
      if (!organizationId || !submittedFormData.province || !submittedFormData.municipality) {
        setDeliveryCalculation(null);
        return;
      }

      setIsCalculatingDelivery(true);
      
      try {
        const deliveryType: 'desk' | 'home' = (
          submittedFormData.delivery_type === 'desk' || 
          submittedFormData.shipping_type === 'desk' ||
          submittedFormData.fixedDeliveryType === 'desk'
        ) ? 'desk' : 'home';

        const weight = 1; 
        const productPrice = product?.pricing?.price || 0;
        
        const deliveryInput = {
          organizationId,
          selectedProvinceId: submittedFormData.province,
          selectedMunicipalityId: submittedFormData.municipality,
          deliveryType,
          weight,
          productPrice,
          quantity,
          shippingProvider: {
            code: 'yalidine',
            name: 'ياليدين',
            type: 'yalidine' as const
          },
          productShippingInfo: product?.shipping_and_templates?.shipping_info || undefined
        };

        const result = await calculateDeliveryFeesOptimized(deliveryInput);
        setDeliveryCalculation(result);
        
      } catch (error) {
        setDeliveryCalculation(null);
      } finally {
        setIsCalculatingDelivery(false);
      }
    };

    const timeoutId = setTimeout(calculateDelivery, 1000); // زيادة debounce time
    return () => clearTimeout(timeoutId);
  }, [
    organizationId, 
    submittedFormData.province, 
    submittedFormData.municipality, 
    submittedFormData.delivery_type, 
    submittedFormData.shipping_type,
    submittedFormData.fixedDeliveryType,
    product?.pricing?.price,
    quantity
  ]);

  // حساب بيانات الملخص
  const summaryData = useMemo(() => {
    if (!product) return null;

    return {
      selectedProvince: deliveryCalculation?.selectedProvince || null,
      selectedMunicipality: deliveryCalculation?.selectedMunicipality || null,
      deliveryType: deliveryCalculation?.deliveryType || 'home',
      deliveryFee: deliveryCalculation?.deliveryFee || 0,
      isCalculating: isCalculatingDelivery,
      shippingProvider: deliveryCalculation?.shippingProvider || {
        name: 'ياليدين',
        code: 'yalidine'
      },
      calculationMethod: deliveryCalculation?.calculationMethod
    };
  }, [product, deliveryCalculation, isCalculatingDelivery]);

  // معالجة إرسال النموذج والطلبية
  const handleFormSubmit = useCallback(async (data: Record<string, any>) => {
    try {
      // 🛍️ تتبع بدء عملية الشراء
      if (product && productTracking.isReady) {
        await productTracking.trackInitiateCheckout({
          name: product.name,
          price: priceInfo?.price || 0,
          quantity,
          image: product.images?.thumbnail_image || product.images?.additional_images?.[0]?.url,
          selectedColor: selectedColor?.name,
          selectedSize: selectedSize?.size_name
        }, {
          email: data.customer_email || data.email,
          phone: data.customer_phone || data.phone,
          name: data.customer_name || data.name,
          firstName: (data.customer_name || data.name)?.split(' ')[0],
          lastName: (data.customer_name || data.name)?.split(' ').slice(1).join(' '),
          city: data.municipality,
          state: data.province,
          country: 'DZ',
          province: data.province,
          municipality: data.municipality
        });
      }

      // 🚨 CONSOLE LOG: تتبع شامل لعملية تقديم الطلبية
      console.group('🔍 ProductPurchasePageV3 - تتبع بيانات النموذج - handleFormSubmit');
      console.log('📋 البيانات المستلمة:', data);
      console.log('🏢 معرف المؤسسة:', organizationId);
      console.log('📦 بيانات المنتج:', product ? {
        id: product.id,
        name: product.name,
        hasVariants: !!product.variants,
        stockQuantity: (product as any)?.stock_quantity
      } : 'غير موجود');
      
      // التحقق من الحقول المطلوبة
      console.log('🔍 التحقق من الحقول المطلوبة:');
      console.log('  - customer_name:', data.customer_name);
      console.log('  - customer_phone:', data.customer_phone);
      console.log('  - province:', data.province);
      console.log('  - municipality:', data.municipality);
      
      // عرض جميع مفاتيح البيانات
      console.log('🗝️ جميع المفاتيح المتاحة:', Object.keys(data));
      
      // معلومات اللون والمقاس المختار
      console.log('🎨 اللون المختار:', selectedColor ? {
        id: selectedColor.id,
        name: selectedColor.name,
        quantity: selectedColor.quantity
      } : 'لا يوجد');
      
      console.log('📏 المقاس المختار:', selectedSize ? {
        id: selectedSize.id,
        name: selectedSize.size_name,
        quantity: selectedSize.quantity
      } : 'لا يوجد');
      
      console.log('📊 معلومات الكمية والسعر:', {
        quantity,
        unitPrice: priceInfo.price,
        totalPrice: priceInfo.price * quantity,
        deliveryFee: deliveryCalculation?.deliveryFee || 0
      });
      
      console.groupEnd();
      
      // 🚨 CONSOLE LOG: فحص إعدادات المؤسسة لخصم المخزون التلقائي
      try {
        const supabase = getSupabaseClient();
        const { data: orgSettings, error: orgError } = await supabase
          .from('organization_settings')
          .select('custom_js')
          .eq('organization_id', organizationId)
          .single();
          
        console.log('⚙️ إعدادات المؤسسة:', {
          organizationId,
          settings: orgSettings,
          error: orgError
        });
        
        if (orgSettings?.custom_js) {
          try {
            const parsedSettings = JSON.parse(orgSettings.custom_js);
            console.log('🔧 إعدادات مخصصة مفسرة:', parsedSettings);
            console.log('📦 خصم المخزون التلقائي مفعل؟', parsedSettings.auto_deduct_inventory);
          } catch (parseError) {
            console.warn('⚠️ خطأ في تفسير الإعدادات المخصصة:', parseError);
          }
        }
      } catch (error) {
        console.error('❌ خطأ في جلب إعدادات المؤسسة:', error);
      }
      
      // حفظ بيانات النموذج
      setSubmittedFormData(data);
      
      // التحقق من وجود البيانات المطلوبة
      if (!product || !organizationId) {
        toast.error('حدث خطأ في تحميل بيانات المنتج');
        return;
      }

      // التحقق من وجود بيانات النموذج المطلوبة - مع فحص أسماء مختلفة
      const customerName = data.customer_name || data.name || data.full_name || data.fullName;
      const customerPhone = data.customer_phone || data.phone || data.telephone || data.mobile;

      if (!customerName || !customerPhone) {
        toast.error('يرجى ملء جميع البيانات المطلوبة (الاسم ورقم الهاتف)');
        return;
      }

      // إعداد بيانات الطلبية
      const orderPayload = {
        fullName: customerName,
        phone: customerPhone,
        province: data.province,
        municipality: data.municipality,
        address: data.address || '',
        city: data.city || '',
        deliveryCompany: deliveryCalculation?.shippingProvider?.code || 'yalidine',
        deliveryOption: deliveryCalculation?.deliveryType || 'home',
        paymentMethod: 'cash_on_delivery',
        notes: data.notes || '',
        productId: product.id,
        productColorId: selectedColor?.id || null,
        productSizeId: selectedSize?.id || null,
        sizeName: selectedSize?.size_name || null,
        quantity: quantity,
        unitPrice: priceInfo.price,
        totalPrice: priceInfo.price * quantity, // إصلاح: سعر المنتج فقط بدون رسوم التوصيل
        deliveryFee: deliveryCalculation?.deliveryFee || 0,
        formData: data,
        metadata: {
          product_image: product.images?.thumbnail_image || product.images?.additional_images?.[0]?.url,
          shipping_provider: deliveryCalculation?.shippingProvider || { name: 'ياليدين', code: 'yalidine' },
          selected_color_name: selectedColor?.name,
          selected_size_name: selectedSize?.size_name
        }
      };

      // 🚨 CONSOLE LOG: بيانات الطلبية قبل الإرسال
      console.log('📦 بيانات الطلبية المرسلة لـ processOrder:', orderPayload);
      
      // معالجة الطلبية باستخدام الواجهة الصحيحة
      const result = await processOrder(organizationId, orderPayload);
      
      // 🚨 CONSOLE LOG: نتيجة معالجة الطلبية
      console.log('📋 نتيجة processOrder:', result);

      if (result && !result.error) {
        console.log('✅ نجحت معالجة الطلبية!');
        
        // 💰 تتبع إتمام الشراء
        const orderId = result.id || result.order_id;
        const totalValue = (priceInfo.price * quantity) + (deliveryCalculation?.deliveryFee || 0);
        
        if (product && productTracking.isReady && orderId) {
          await productTracking.trackPurchase(
            orderId.toString(),
            totalValue,
            {
              name: product.name,
              price: priceInfo?.price || 0,
              quantity,
              image: product.images?.thumbnail_image || product.images?.additional_images?.[0]?.url,
              selectedColor: selectedColor?.name,
              selectedSize: selectedSize?.size_name
            },
            {
              email: data.customer_email || data.email,
              phone: data.customer_phone || data.phone,
              name: data.customer_name || data.name,
              firstName: (data.customer_name || data.name)?.split(' ')[0],
              lastName: (data.customer_name || data.name)?.split(' ').slice(1).join(' '),
              city: data.municipality,
              state: data.province,
              country: 'DZ',
              province: data.province,
              municipality: data.municipality
            }
          );
        }
        
        toast.success('تم إنشاء الطلبية بنجاح!');
        
        // تحويل الطلب المتروك إلى طلب مُكتمل
        if (orderId) {
          await abandonedCartActions.markAsConverted(orderId);
        }
        
        // التوجه لصفحة الشكر مع رقم الطلب
        const orderNumber = result.order_number || result.orderNumber || Math.floor(Math.random() * 10000);
        navigate(`/thank-you?orderNumber=${orderNumber}`, {
          state: {
            orderNumber: orderNumber,
            fromProductPage: true,
            productId: product.id,
            organizationId: organizationId
          }
        });
      } else {
        console.error('❌ فشل في معالجة الطلبية:', result);
        toast.error(result?.error || 'حدث خطأ أثناء إنشاء الطلبية');
      }
    } catch (error) {
      console.error('❌ خطأ غير متوقع في handleFormSubmit:', error);
      toast.error('حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى');
    }
  }, [
    product, 
    organizationId, 
    quantity, 
    priceInfo, 
    deliveryCalculation, 
    selectedColor, 
    selectedSize, 
    navigate,
    productTracking,
    abandonedCartActions
  ]);

  // معالجة الشراء المباشر
  const handleBuyNow = useCallback(async () => {
    try {
      // التحقق من وجود البيانات المطلوبة
      if (!product || !organizationId) {
        toast.error('حدث خطأ في تحميل بيانات المنتج');
        return;
      }

      // التحقق من وجود بيانات النموذج المطلوبة
      if (!submittedFormData.customer_name || !submittedFormData.customer_phone) {
        toast.error('يرجى ملء جميع البيانات المطلوبة');
        return;
      }

      // حساب السعر النهائي مع العروض الخاصة
      const offerSummary = getSpecialOfferSummary(product, selectedOffer, quantity);
      const finalQuantity = offerSummary.finalQuantity;
      const finalPrice = offerSummary.finalPrice;

      // 🛍️ تتبع بدء عملية الشراء المباشر
      if (productTracking.isReady) {
        await productTracking.trackInitiateCheckout({
          name: product.name,
          price: finalPrice,
          quantity: finalQuantity,
          image: product.images?.thumbnail_image || product.images?.additional_images?.[0]?.url,
          selectedColor: selectedColor?.name,
          selectedSize: selectedSize?.size_name
        }, {
          email: submittedFormData.customer_email || submittedFormData.email,
          phone: submittedFormData.customer_phone || submittedFormData.phone,
          name: submittedFormData.customer_name || submittedFormData.name,
          firstName: (submittedFormData.customer_name || submittedFormData.name)?.split(' ')[0],
          lastName: (submittedFormData.customer_name || submittedFormData.name)?.split(' ').slice(1).join(' '),
          city: submittedFormData.municipality,
          state: submittedFormData.province,
          country: 'DZ',
          province: submittedFormData.province,
          municipality: submittedFormData.municipality
        });
      }

      // معالجة الطلبية باستخدام الواجهة الصحيحة
      const result = await processOrder(organizationId, {
        fullName: submittedFormData.customer_name,
        phone: submittedFormData.customer_phone,
        province: submittedFormData.province,
        municipality: submittedFormData.municipality,
        address: submittedFormData.address || '',
        city: submittedFormData.city || '',
        deliveryCompany: deliveryCalculation?.shippingProvider?.code || 'yalidine',
        deliveryOption: deliveryCalculation?.deliveryType || 'home',
        paymentMethod: 'cash_on_delivery',
        notes: submittedFormData.notes || '',
        productId: product.id,
        productColorId: selectedColor?.id || null,
        productSizeId: selectedSize?.id || null,
        sizeName: selectedSize?.size_name || null,
        quantity: finalQuantity,
        unitPrice: finalPrice / finalQuantity, // السعر لكل قطعة مع العرض
        totalPrice: finalPrice, // إصلاح: سعر المنتج فقط بدون رسوم التوصيل
        deliveryFee: deliveryCalculation?.deliveryFee || 0,
        formData: submittedFormData,
        metadata: {
          product_image: product.images?.thumbnail_image || product.images?.additional_images?.[0]?.url,
          shipping_provider: deliveryCalculation?.shippingProvider || { name: 'ياليدين', code: 'yalidine' },
          selected_color_name: selectedColor?.name,
          selected_size_name: selectedSize?.size_name,
          special_offer_id: selectedOffer?.id,
          special_offer_name: selectedOffer?.name,
          original_quantity: quantity,
          savings: offerSummary.savings
        }
      });
      
      if (result && !result.error) {
        toast.success('تم إنشاء الطلبية بنجاح!');
        
        // تحويل الطلب المتروك إلى طلب مُكتمل
        const orderId = result.id || result.order_id;
        if (orderId) {
          await abandonedCartActions.markAsConverted(orderId);
        }

        // 💰 تتبع إتمام الشراء (Purchase)
        if (conversionTrackerRef.current?.isReady) {
          const totalValue = finalPrice + (deliveryCalculation?.deliveryFee || 0);
          await conversionTrackerRef.current.trackPurchase(
            orderId || `order_${Date.now()}`,
            totalValue,
            submittedFormData
          );
        }
        
        // التوجه لصفحة الشكر مع رقم الطلب
        const orderNumber = result.order_number || result.orderNumber || Math.floor(Math.random() * 10000);
        navigate(`/thank-you?orderNumber=${orderNumber}`, {
          state: {
            orderNumber: orderNumber,
            fromProductPage: true,
            productId: product.id,
            organizationId: organizationId
          }
        });
      } else {
        toast.error(result?.error || 'حدث خطأ أثناء إنشاء الطلبية');
      }
    } catch (error) {
      toast.error('حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى');
    }
  }, [
    product, 
    organizationId, 
    quantity, 
    priceInfo, 
    deliveryCalculation, 
    submittedFormData, 
    selectedColor, 
    selectedSize, 
    selectedOffer,
    navigate,
    productTracking,
    abandonedCartActions,
    conversionTrackerRef
  ]);

  // معالجة إعادة المحاولة
  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  // ⏱️ تتبع وقت اكتمال عرض الصفحة
  useEffect(() => {
    if (product && !loading && !error) {
      // تأخير صغير للتأكد من اكتمال عرض جميع المكونات
      const timeoutId = setTimeout(() => {
        const totalTime = performance.now() - pageStartTime;

         // 📊 ملخص الأداء النهائي
         console.groupCollapsed('📊 تقرير الأداء الشامل - ProductPurchasePageV3');
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [product, loading, error, pageStartTime, formData, deliveryCalculation]);

  // حالة التحميل
  if (loading) {
    return <ProductPageSkeleton />;
  }

  // حالة الخطأ
  if (error || !product) {
    const errorTime = performance.now() - pageStartTime;
    return (
      <ProductErrorPage 
        error={error}
        onRetry={handleRetry}
      />
    );
  }

  // ⏱️ تسجيل بداية عرض المكونات

  return (
    <>
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* مكونات التتبع المخفية */}
      {actualProductId && organizationId && (
        <>
          {/* تحميل البكسلات */}
          <EnhancedPixelLoader
            productId={actualProductId}
            organizationId={organizationId}
            settings={productTracking.settings || undefined}
            onPixelsLoaded={(loadedPixels) => {
            }}
            onPixelError={(platform, error) => {
            }}
          />
          
          {/* متتبع التحويل */}
          <ProductConversionTracker
            ref={conversionTrackerRef}
            productId={actualProductId}
            organizationId={organizationId}
            product={product || undefined}
            selectedColor={selectedColor}
            selectedSize={selectedSize}
            quantity={quantity}
            currency="DZD"
            onTrackingReady={() => {
            }}
            onTrackingError={(error) => {
            }}
          />
        </>
      )}

      {/* النافبار الرئيسي */}
      <NavbarMain 
        className="bg-background/95 backdrop-blur-md border-b border-border/20"
        hideCategories={true}
      />

      <div className="container mx-auto px-4 py-8 pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* قسم الصور */}
          <motion.div 
            className="lg:sticky lg:top-28"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ProductImageGalleryV2 
              product={product} 
              selectedColor={selectedColor}
            />
          </motion.div>

          {/* قسم المعلومات والشراء */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* رأس المنتج */}
            <ProductHeader
              name={product.name}
              brand={product.brand}
              status={product.status}
              availableStock={availableStock}
            />

            {/* عرض السعر */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="pt-2"
            >
                          <ProductPriceDisplay
              product={product}
              selectedColor={selectedColor}
              selectedSize={selectedSize}
              selectedOffer={selectedOffer}
              quantity={quantity}
              hideSpecialOfferDetails={(product as any).special_offers_config?.enabled && (product as any).special_offers_config?.offers?.length > 0}
            />
            </motion.div>

            {/* الكمية - يُخفى عندما تكون العروض الخاصة مُفعّلة */}
            {!((product as any).special_offers_config?.enabled && (product as any).special_offers_config?.offers?.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="pt-3"
              >
                <ProductQuantitySelector
                  quantity={quantity}
                  onQuantityChange={handleQuantityChange}
                  maxQuantity={Math.min(availableStock, 100)}
                  disabled={!canPurchase}
                />
              </motion.div>
            )}

            {/* مؤقت العرض */}
            {offerTimerSettings && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="my-6"
              >
                <ProductOfferTimer 
                  settings={offerTimerSettings}
                  theme="default"
                  className="w-full"
                />
              </motion.div>
            )}

            <Separator className="bg-border/50 dark:bg-border/30" />

            {/* اختيار المتغيرات */}
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <ProductVariantSelector
                product={product}
                selectedColor={selectedColor}
                selectedSize={selectedSize}
                onColorSelect={setSelectedColor}
                onSizeSelect={setSelectedSize}
              />
            </motion.div>

            <Separator className="bg-border/50 dark:bg-border/30" />

            {/* العروض الخاصة */}
            {product.special_offers_config?.enabled && product.special_offers_config.offers?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                className="py-2"
              >
                <SpecialOffersDisplay
                  config={product.special_offers_config}
                  basePrice={product.pricing?.price || 0}
                  onSelectOffer={(offer) => {
                    
                    setSelectedOffer(offer);
                    
                    // تحديث الكمية تلقائياً لتتناسب مع العرض
                    if (offer) {
                      if (offer.quantity !== quantity) {
                        setIsQuantityUpdatedByOffer(true);
                        setQuantity(offer.quantity);
                      }
                    } else {
                      // إذا تم إلغاء العرض (اختيار "قطعة واحدة")، الرجوع للكمية 1
                      if (quantity !== 1) {
                        setIsQuantityUpdatedByOffer(true);
                        setQuantity(1);
                      }
                    }
                  }}
                  selectedOfferId={selectedOffer?.id}
                />
              </motion.div>
            )}

            {product.special_offers_config?.enabled && product.special_offers_config.offers?.length > 0 && (
              <Separator className="bg-border/50 dark:bg-border/30" />
            )}

            {/* أزرار الشراء */}
            <ProductActions
              totalPrice={(() => {
                return finalPriceCalculation.price;
              })()}
              deliveryFee={summaryData?.deliveryFee || 0}
              canPurchase={canPurchase}
              buyingNow={buyingNow}
              onBuyNow={handleBuyNow}
              isCalculatingDelivery={summaryData?.isCalculating || false}
              currency="دج"
            />

            {/* ميزات المنتج */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <ProductFeatures product={product} />
            </motion.div>

            {/* النماذج */}
            {formData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.7 }}
              >
                <Separator className="mb-6 bg-border/50 dark:bg-border/30" />
                <ProductFormRenderer
                  formData={formData}
                  formStrategy={formStrategy}
                  onFormSubmit={handleFormSubmit}
                  onFormChange={handleFormChange}
                  loading={buyingNow}
                  isSubmitting={buyingNow}
                  isLoadingDeliveryFee={summaryData?.isCalculating || false}
                  isCalculatingDelivery={summaryData?.isCalculating || false}
                  deliveryFee={summaryData?.deliveryFee || 0}
                  className="mb-4"
                  // تمرير بيانات المنتج والمزامنة
                  product={{
                    has_variants: product.variants?.has_variants,
                    colors: product.variants?.colors
                  }}
                  selectedColor={selectedColor}
                  selectedSize={selectedSize}
                  onColorSelect={setSelectedColor}
                  onSizeSelect={setSelectedSize}
                />

                {/* مؤشر حفظ الطلب المتروك */}
                {isSavingCart && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 mb-4"
                  >
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span>جاري حفظ بياناتك...</span>
                  </motion.div>
                )}

                {/* ملخص الطلب */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.8 }}
                  className="mt-6"
                >
                  <ProductPurchaseSummary
                    productName={product.name}
                    productImage={product.images?.additional_images?.[0]?.url || product.images?.thumbnail_image}
                    basePrice={product.pricing?.price || 0}
                    quantity={finalPriceCalculation.quantity}
                    selectedColor={selectedColor ? {
                      name: selectedColor.name,
                      value: selectedColor.color_code || '#000000',
                      price_modifier: selectedColor.price ? selectedColor.price - (product.pricing?.price || 0) : 0
                    } : undefined}
                    selectedSize={selectedSize ? {
                      name: selectedSize.size_name,
                      value: selectedSize.size_name,
                      price_modifier: selectedSize.price ? selectedSize.price - (product.pricing?.price || 0) : 0
                    } : undefined}
                    subtotal={(() => {
                      return finalPriceCalculation.price;
                    })()}
                    discount={priceInfo.discount + finalPriceCalculation.savings}
                    deliveryFee={summaryData?.deliveryFee || 0}
                    total={finalPriceCalculation.price + (summaryData?.deliveryFee || 0)}
                    isLoadingDeliveryFee={summaryData?.isCalculating || false}
                    deliveryType={summaryData?.deliveryType || 'home'}
                    selectedProvince={summaryData?.selectedProvince}
                    selectedMunicipality={summaryData?.selectedMunicipality ? {
                      id: summaryData.selectedMunicipality.id,
                      name: summaryData.selectedMunicipality.name
                    } : undefined}
                    shippingProvider={summaryData?.shippingProvider ? {
                      name: summaryData.shippingProvider.name,
                      logo: summaryData.shippingProvider.logo
                    } : undefined}
                    currency="دج"
                  />
                </motion.div>

                {/* الوصف - تحت ملخص الطلب */}
                {product.description && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.9 }}
                    className="mt-6"
                  >
                    <ProductDescription 
                      description={product.description}
                      maxLength={200}
                    />
                  </motion.div>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>

    {/* مكون التحقق السريع من التتبع */}
    <QuickTrackingCheck />

    {/* كونسول التشخيص - فقط في بيئة التطوير */}
    {process.env.NODE_ENV === 'development' && actualProductId && organizationId && (
      <>
        <TrackingDebugConsole 
          productId={actualProductId} 
          organizationId={organizationId}
        />
        <ConversionAPIMonitor />
        <TrackingSettingsViewer 
          settings={productTracking.settings}
          productId={actualProductId}
          organizationId={organizationId}
        />
        <FacebookEventsLogger 
          pixelId={(productTracking.settings as any)?.facebook_pixel_id}
        />
        <FacebookPixelChecker />
        <CustomerDataTracker />
        <MatchQualityOptimizer />
      </>
    )}
    </>
  );
});

ProductPurchasePageV3.displayName = 'ProductPurchasePageV3';

export default ProductPurchasePageV3;
