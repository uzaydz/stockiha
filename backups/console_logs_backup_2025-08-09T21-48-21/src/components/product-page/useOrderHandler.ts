import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { processOrder } from '@/api/store';
import { getSpecialOfferSummary } from '@/lib/api/productComplete';

interface UseOrderHandlerProps {
  product: any;
  organizationId: string | null;
  quantity: number;
  priceInfo: any;
  deliveryCalculation: any;
  selectedColor?: any;
  selectedSize?: any;
  selectedOffer?: any;
  productTracking?: any;
  abandonedCartActions: any;
  conversionTrackerRef?: any;
}

export const useOrderHandler = ({
  product,
  organizationId,
  quantity,
  priceInfo,
  deliveryCalculation,
  selectedColor,
  selectedSize,
  selectedOffer,
  productTracking,
  abandonedCartActions,
  conversionTrackerRef
}: UseOrderHandlerProps) => {
  const navigate = useNavigate();

  // دالة مساعدة لتحويل UUID بشكل آمن
  const safeUuidOrNull = (value: string | undefined | null): string | null => {
    if (!value || value === 'undefined' || value === 'null') return null;
    return value;
  };

  // معالجة إرسال النموذج والطلبية
  const handleFormSubmit = useCallback(async (data: Record<string, any>) => {
    try {
      // تتبع بدء عملية الشراء
      if (product && productTracking?.isReady) {
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
        productColorId: safeUuidOrNull(selectedColor?.id),
        productSizeId: safeUuidOrNull(selectedSize?.id),
        sizeName: selectedSize?.size_name || null,
        quantity: quantity,
        unitPrice: priceInfo.price / quantity, // السعر لكل قطعة
        totalPrice: priceInfo.price, // السعر الكلي
        deliveryFee: deliveryCalculation?.deliveryFee || 0,
        formData: data,
        metadata: {
          product_image: product.images?.thumbnail_image || product.images?.additional_images?.[0]?.url,
          shipping_provider: deliveryCalculation?.shippingProvider || { name: 'ياليدين', code: 'yalidine' },
          selected_color_name: selectedColor?.name,
          selected_size_name: selectedSize?.size_name
        }
      };
      
      const result = await processOrder(organizationId, orderPayload);

      if (result && !result.error) {
        // تتبع إتمام الشراء
        const orderId = result.id || result.order_id;
        const totalValue = priceInfo.price + (deliveryCalculation?.deliveryFee || 0);
        
        if (product && productTracking?.isReady && orderId) {
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
    selectedColor, 
    selectedSize, 
    navigate,
    productTracking,
    abandonedCartActions
  ]);

  // معالجة الشراء المباشر
  const handleBuyNow = useCallback(async (
    canPurchase: boolean,
    submittedFormData: Record<string, any>,
    setHasTriedToSubmit: (value: boolean) => void,
    setShowValidationErrors: (value: boolean) => void
  ) => {
    try {
      // تفعيل عرض أخطاء التحقق من الصحة
      setHasTriedToSubmit(true);
      setShowValidationErrors(true);
      
      // التحقق من صحة المتغيرات المطلوبة
      if (!canPurchase) {
        // التحقق من المتغيرات المحددة
        if (product?.variants?.has_variants && !selectedColor) {
          toast.error('يرجى اختيار اللون المطلوب');
          return;
        }
        
        if (selectedColor?.has_sizes && !selectedSize) {
          toast.error('يرجى اختيار المقاس المطلوب');
          return;
        }
        
        if (quantity <= 0) {
          toast.error('يرجى تحديد كمية صحيحة');
          return;
        }
        
        toast.error('يرجى التحقق من جميع البيانات المطلوبة');
        return;
      }
      
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

      // تتبع بدء عملية الشراء المباشر
      if (productTracking?.isReady) {
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
        productColorId: safeUuidOrNull(selectedColor?.id),
        productSizeId: safeUuidOrNull(selectedSize?.id),
        sizeName: selectedSize?.size_name || null,
        quantity: finalQuantity,
        unitPrice: finalPrice / finalQuantity, // السعر لكل قطعة مع العرض
        totalPrice: finalPrice, // سعر المنتج فقط بدون رسوم التوصيل
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

        // تتبع إتمام الشراء (Purchase)
        if (conversionTrackerRef?.current?.isReady) {
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
    selectedColor, 
    selectedSize, 
    selectedOffer,
    navigate,
    productTracking,
    abandonedCartActions,
    conversionTrackerRef
  ]);

  return {
    handleFormSubmit,
    handleBuyNow
  };
};


