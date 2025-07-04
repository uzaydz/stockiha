import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Product } from '@/types';
import { searchProductByBarcode, BarcodeSearchResult } from '@/lib/api/barcode-search';

interface CartItem {
  product: Product;
  quantity: number;
  colorId?: string;
  colorName?: string;
  colorCode?: string;
  sizeId?: string;
  sizeName?: string;
  variantPrice?: number;
  variantImage?: string;
}

interface UsePOSBarcodeOptions {
  products: Product[];
  currentOrganizationId?: string;
  onAddToCart: (product: Product) => void;
  onAddVariant: (
    product: Product,
    colorId?: string,
    sizeId?: string,
    variantPrice?: number,
    colorName?: string,
    colorCode?: string,
    sizeName?: string,
    variantImage?: string
  ) => void;
}

export const usePOSBarcode = ({
  products,
  currentOrganizationId,
  onAddToCart,
  onAddVariant
}: UsePOSBarcodeOptions) => {
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [lastKeyTime, setLastKeyTime] = useState(0);
  
  // استخدام refs للحفاظ على القيم المحدثة في event handlers
  const barcodeBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const productsRef = useRef(products);
  const currentOrganizationIdRef = useRef(currentOrganizationId);
  
  // إضافة refs للدوال لمنع إعادة تسجيل event listeners
  const onAddToCartRef = useRef(onAddToCart);
  const onAddVariantRef = useRef(onAddVariant);

  // تحديث refs عند تغير القيم
  useEffect(() => {
    barcodeBufferRef.current = barcodeBuffer;
  }, [barcodeBuffer]);

  useEffect(() => {
    lastKeyTimeRef.current = lastKeyTime;
  }, [lastKeyTime]);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    currentOrganizationIdRef.current = currentOrganizationId;
  }, [currentOrganizationId]);

  // تحديث refs للدوال
  useEffect(() => {
    onAddToCartRef.current = onAddToCart;
  }, [onAddToCart]);

  useEffect(() => {
    onAddVariantRef.current = onAddVariant;
  }, [onAddVariant]);

  // تنظيف البيانات الواردة من قارئ الباركود
  const cleanBarcodeInput = useCallback((input: string): string => {
    let cleaned = input.trim();
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
    cleaned = cleaned.replace(/\s+/g, ' ');
    return cleaned.trim();
  }, []);

  // تحويل نتيجة البحث إلى منتج متوافق
  const convertSearchResultToProduct = useCallback((result: BarcodeSearchResult): Product => {
    return {
      id: result.id,
      name: result.name,
      description: result.description || '',
      price: result.price,
      compareAtPrice: result.compare_at_price,
      sku: result.sku,
      barcode: result.barcode,
      category: 'أخرى' as any,
      category_id: result.category_id,
      brand: result.brand,
      images: result.images,
      thumbnailImage: result.thumbnail_image || '',
      stockQuantity: result.stock_quantity,
      stock_quantity: result.stock_quantity,
      features: [],
      specifications: {},
      isDigital: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      has_variants: result.has_variants,
      use_sizes: result.use_sizes,
      colors: result.colors?.map(color => ({
        id: color.id,
        name: color.name,
        color_code: color.color_code,
        image_url: color.image_url,
        quantity: color.quantity,
        price: color.price,
        barcode: color.barcode,
        is_default: color.is_default,
        has_sizes: color.has_sizes,
        sizes: color.sizes?.map(size => ({
          id: size.id,
          size_name: size.size_name,
          quantity: size.quantity,
          price: size.price,
          barcode: size.barcode,
          is_default: size.is_default,
        }))
      }))
    } as Product;
  }, []);

  // البحث عن منتج بواسطة الباركود
  const searchProductInDatabase = useCallback(async (barcode: string) => {
    if (!currentOrganizationIdRef.current) return null;
    
    try {
      const searchResult = await searchProductByBarcode(currentOrganizationIdRef.current, barcode);
      return searchResult ? convertSearchResultToProduct(searchResult) : null;
    } catch (error) {
      return null;
    }
  }, [convertSearchResultToProduct]);

  // معالجة الباركود المسح ضوئياً - استخدام refs بدلاً من الدوال مباشرة
  const processBarcodeScanned = useCallback(async (rawBarcode: string) => {
    const barcode = cleanBarcodeInput(rawBarcode);
    
    console.log('🔍 [usePOSBarcode] معالجة باركود:', { rawBarcode, cleanedBarcode: barcode });
    
    if (!barcode || barcode.length === 0) {
      toast.error('الباركود المُدخل غير صالح. تأكد من إعدادات قارئ الباركود.');
      return;
    }

    const currentProducts = productsRef.current;
    console.log('🔍 [usePOSBarcode] البحث في المنتجات:', { productsCount: currentProducts.length });
    
    // البحث في المنتجات الأساسية
    const product = currentProducts.find(p => {
      const barcodeMatch = p.barcode && p.barcode.toLowerCase() === barcode.toLowerCase();
      const skuMatch = p.sku && p.sku.toLowerCase() === barcode.toLowerCase();
      return barcodeMatch || skuMatch;
    });

    if (product) {
      onAddToCartRef.current(product);
      return;
    }

    // البحث في متغيرات المنتجات
    for (const prod of currentProducts) {
      if (prod.colors && prod.colors.length > 0) {
        // البحث في الألوان
        const color = prod.colors.find(c => c.barcode && c.barcode.toLowerCase() === barcode.toLowerCase());
        if (color) {
          onAddVariantRef.current(
            prod,
            color.id,
            undefined,
            color.price,
            color.name,
            color.color_code,
            undefined,
            color.image_url
          );
          return;
        }

        // البحث في المقاسات
        if (prod.use_sizes) {
          for (const color of prod.colors) {
            if (color.sizes && color.sizes.length > 0) {
              const size = color.sizes.find(s => s.barcode && s.barcode.toLowerCase() === barcode.toLowerCase());
              if (size) {
                onAddVariantRef.current(
                  prod,
                  color.id,
                  size.id,
                  size.price,
                  color.name,
                  color.color_code,
                  size.size_name,
                  color.image_url
                );
                return;
              }
            }
          }
        }
      }
    }

    // البحث في قاعدة البيانات كـ fallback
    const foundProduct = await searchProductInDatabase(barcode);
    if (foundProduct) {
      if (foundProduct.colors && foundProduct.colors.length > 0) {
        const color = foundProduct.colors[0];
        if (color.sizes && color.sizes.length > 0) {
          const size = color.sizes[0];
          onAddVariantRef.current(
            foundProduct,
            color.id,
            size.id,
            size.price || foundProduct.price,
            color.name,
            color.color_code,
            size.size_name,
            color.image_url
          );
        } else {
          onAddVariantRef.current(
            foundProduct,
            color.id,
            undefined,
            color.price || foundProduct.price,
            color.name,
            color.color_code,
            undefined,
            color.image_url
          );
        }
      } else {
        onAddToCartRef.current(foundProduct);
      }
      return;
    }

    toast.error(`لم يتم العثور على منتج بالباركود: ${barcode}`);
  }, [cleanBarcodeInput, searchProductInDatabase]); // إزالة onAddToCart و onAddVariant من dependencies

  // إضافة ref لدالة معالجة الباركود
  const processBarcodeScannedRef = useRef<(barcode: string) => Promise<void>>();

  // تحديث ref لدالة معالجة الباركود
  useEffect(() => {
    processBarcodeScannedRef.current = processBarcodeScanned;
  }, [processBarcodeScanned]);

  // معالجة مفاتيح لوحة المفاتيح - استخدام دالة مستقرة
  const handleKeyPress = useCallback(async (event: KeyboardEvent) => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastKeyTimeRef.current;

    // إذا مرت أكثر من 200ms، ابدأ باركود جديد
    if (timeDiff > 200) {
      setBarcodeBuffer('');
      barcodeBufferRef.current = '';
    }

    // تجاهل المفاتيح الخاصة والحقول النشطة
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    const target = event.target as HTMLElement;
    if (target && (
      (target.tagName === 'INPUT' && ['text', 'search', 'email', 'password', 'url', 'tel'].includes((target as HTMLInputElement).type)) ||
      target.tagName === 'TEXTAREA' || 
      target.contentEditable === 'true' ||
      target.closest('[contenteditable="true"]')
    )) {
      return;
    }

    setLastKeyTime(currentTime);
    lastKeyTimeRef.current = currentTime;

    // معالجة Enter
    if (event.key === 'Enter') {
      event.preventDefault();
      const currentBuffer = barcodeBufferRef.current;
      if (currentBuffer.length > 0 && processBarcodeScannedRef.current) {
        await processBarcodeScannedRef.current(currentBuffer);
        setBarcodeBuffer('');
        barcodeBufferRef.current = '';
      }
      return;
    }

    // إضافة الحرف للـ buffer
    if (event.key.length === 1) {
      const newBuffer = barcodeBufferRef.current + event.key;
      setBarcodeBuffer(newBuffer);
      barcodeBufferRef.current = newBuffer;

      // معالجة فورية للباركودات الطويلة
      if (newBuffer.length >= 13 && timeDiff < 50) {
        setTimeout(() => {
          if (barcodeBufferRef.current === newBuffer && processBarcodeScannedRef.current) {
            processBarcodeScannedRef.current(newBuffer);
            setBarcodeBuffer('');
            barcodeBufferRef.current = '';
          }
        }, 20);
      }
    }
  }, []); // dependencies فارغة لجعل الدالة مستقرة تماماً

  // تنظيف البفر بعد فترة من عدم النشاط
  useEffect(() => {
    if (barcodeBuffer.length > 0) {
      const clearBufferTimeout = setTimeout(() => {
        if (barcodeBuffer.length >= 6 && processBarcodeScannedRef.current) {
          processBarcodeScannedRef.current(barcodeBuffer);
        }
        setBarcodeBuffer('');
        barcodeBufferRef.current = '';
      }, 80);

      return () => clearTimeout(clearBufferTimeout);
    }
  }, [barcodeBuffer]); // إزالة processBarcodeScanned من dependencies

  // إضافة وإزالة مستمع الأحداث - الآن مع دالة مستقرة
  useEffect(() => {
    console.log('🔍 [usePOSBarcode] تهيئة مستمع الأحداث للسكانر');
    document.addEventListener('keypress', handleKeyPress);
    
    return () => {
      console.log('🔍 [usePOSBarcode] إزالة مستمع الأحداث للسكانر');
      document.removeEventListener('keypress', handleKeyPress);
    };
  }, []); // dependencies فارغة لأن handleKeyPress أصبحت مستقرة

  // تأكيد تهيئة السكانر عند تحديث المنتجات أو الدوال
  useEffect(() => {
    if (products.length > 0 && onAddToCartRef.current && onAddVariantRef.current) {
      console.log('✅ [usePOSBarcode] السكانر جاهز للعمل', {
        productsCount: products.length,
        hasAddToCart: !!onAddToCartRef.current,
        hasAddVariant: !!onAddVariantRef.current
      });
    }
  }, [products.length]);

  return {
    barcodeBuffer,
    processBarcodeScanned
  };
};
