import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CompleteProduct, ProductColor, ProductSize } from '@/lib/api/productComplete';
import { addItem as addCartItem } from '@/lib/cart/cartStorage';

interface UseProductActionsProps {
  product: CompleteProduct | null;
  selectedColor?: ProductColor;
  selectedSize?: ProductSize;
  quantity: number;
  totalPrice: number;
  priceInfo: any;
  canPurchase: boolean;
}

interface ProductActionsState {
  addingToCart: boolean;
  buyingNow: boolean;
  isInWishlist: boolean;
}

interface ProductActionsActions {
  addToCart: () => Promise<void>;
  buyNow: () => Promise<{ success: boolean; data?: any }>;
  toggleWishlist: () => Promise<void>;
  shareProduct: () => Promise<void>;
}

/**
 * Hook لإجراءات المنتج - محسن للأداء
 * - يدير إضافة المنتج إلى السلة
 * - يدير الشراء المباشر
 * - يدير المفضلة
 * - يدير مشاركة المنتج
 * - يستخدم useCallback لتحسين الأداء
 */
export const useProductActions = ({
  product,
  selectedColor,
  selectedSize,
  quantity,
  totalPrice,
  priceInfo,
  canPurchase
}: UseProductActionsProps): [ProductActionsState, ProductActionsActions] => {
  const { toast } = useToast();
  
  // حالة العمليات
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);

  // إضافة المنتج إلى السلة
  const addToCart = useCallback(async () => {
    if (!canPurchase || !product) {
      toast({
        title: "خطأ",
        description: "لا يمكن إضافة المنتج إلى السلة",
        variant: "destructive"
      });
      return;
    }

    try {
      setAddingToCart(true);
      // حفظ في تخزين العربة المحلي سريع وآمن للأداء
      const selectedPrice = Number((priceInfo as any)?.price ?? 0);
      const image = (product.images && product.images[0]) || product.thumbnail_url || product.thumbnail_image || null;
      addCartItem({
        productId: product.id,
        organizationId: (product.organization as any)?.id || (product as any)?.organization_id || null,
        name: product.name,
        slug: (product as any)?.slug || null,
        image: image || undefined,
        unitPrice: selectedPrice || 0,
        quantity,
        variant: {
          colorId: selectedColor?.id || null,
          colorName: (selectedColor as any)?.name || null,
          colorCode: (selectedColor as any)?.color_code || null,
          colorImage: (selectedColor as any)?.image_url || null,
          sizeId: selectedSize?.id || null,
          sizeName: (selectedSize as any)?.size_name || null,
          selectedPrice: selectedPrice || null
        }
      });

      // تتبع إضافة إلى السلة إن كان متاحاً
      try {
        const g: any = typeof window !== 'undefined' ? (window as any) : {};
        if (typeof g.__trackAddToCart === 'function') {
          // لا تنتظر التتبع لكي لا تؤخر تجربة المستخدم
          setTimeout(() => { try { g.__trackAddToCart(); } catch {} }, 0);
        }
      } catch {}

      toast({
        title: "تم بنجاح",
        description: "تم إضافة المنتج إلى السلة",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في إضافة المنتج إلى السلة",
        variant: "destructive"
      });
    } finally {
      setAddingToCart(false);
    }
  }, [
    canPurchase,
    product,
    toast,
    selectedColor?.id,
    selectedColor?.name,
    selectedColor?.color_code,
    selectedColor?.image_url,
    selectedSize?.id,
    selectedSize?.size_name,
    quantity,
    (priceInfo as any)?.price
  ]);

  // الشراء المباشر
  const buyNow = useCallback(async (): Promise<{ success: boolean; data?: any }> => {
    if (!canPurchase || !product) {
      toast({
        title: "خطأ",
        description: "لا يمكن شراء المنتج",
        variant: "destructive"
      });
      return { success: false };
    }

    try {
      setBuyingNow(true);
      
      // هنا يمكن إضافة منطق الشراء المباشر
      // مثال: إنشاء طلب جديد مباشرة
      await new Promise(resolve => setTimeout(resolve, 1000)); // محاكاة API call
      
      const orderData = {
        product,
        selectedColor,
        selectedSize,
        quantity,
        totalPrice,
        priceInfo,
        timestamp: new Date().toISOString()
      };
      
      toast({
        title: "تم بنجاح",
        description: "تم إنشاء الطلب بنجاح",
      });
      
      return { success: true, data: orderData };
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في عملية الشراء",
        variant: "destructive"
      });
      return { success: false };
    } finally {
      setBuyingNow(false);
    }
  }, [canPurchase, product, selectedColor, selectedSize, quantity, totalPrice, priceInfo, toast]);

  // إضافة/إزالة من المفضلة
  const toggleWishlist = useCallback(async () => {
    if (!product) {
      toast({
        title: "خطأ",
        description: "لا يمكن تحديث المفضلة",
        variant: "destructive"
      });
      return;
    }

    try {
      // هنا يمكن إضافة منطق المفضلة
      // مثال: استدعاء API لإضافة/إزالة المنتج من المفضلة
      await new Promise(resolve => setTimeout(resolve, 500)); // محاكاة API call
      
      setIsInWishlist(!isInWishlist);
      
      toast({
        title: isInWishlist ? "تم الإزالة" : "تم الإضافة",
        description: isInWishlist 
          ? 'تم إزالة المنتج من المفضلة' 
          : 'تم إضافة المنتج إلى المفضلة',
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحديث المفضلة",
        variant: "destructive"
      });
    }
  }, [isInWishlist, product, toast]);

  // مشاركة المنتج
  const shareProduct = useCallback(async () => {
    if (!product) {
      toast({
        title: "خطأ",
        description: "لا يمكن مشاركة المنتج",
        variant: "destructive"
      });
      return;
    }

    try {
      // محاولة استخدام Web Share API
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: product.description || `اكتشف ${product.name}`,
          url: window.location.href,
        });
        
        toast({
          title: "تم المشاركة",
          description: "تم مشاركة المنتج بنجاح",
        });
      } else {
        // نسخ الرابط إلى الحافظة كبديل
        await navigator.clipboard.writeText(window.location.href);
        
        toast({
          title: "تم النسخ",
          description: "تم نسخ رابط المنتج إلى الحافظة",
        });
      }
    } catch (error) {
      // إذا فشل Web Share API، استخدم نسخ الرابط
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "تم النسخ",
          description: "تم نسخ رابط المنتج إلى الحافظة",
        });
      } catch (clipboardError) {
        toast({
          title: "خطأ",
          description: "فشل في مشاركة المنتج",
          variant: "destructive"
        });
      }
    }
  }, [product, toast]);

  const state: ProductActionsState = {
    addingToCart,
    buyingNow,
    isInWishlist
  };

  const actions: ProductActionsActions = {
    addToCart,
    buyNow,
    toggleWishlist,
    shareProduct
  };

  return [state, actions];
};
