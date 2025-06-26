import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from "sonner";
import { Link } from 'react-router-dom';
import { Product, Order, User as AppUser, Service, OrderItem, ServiceBooking } from '@/types';
import { useShop } from '@/context/ShopContext';
import { useAuth } from '@/context/AuthContext';
import { usePOSData } from '@/context/POSDataContext';
import { cn } from '@/lib/utils';
import Layout from '@/components/Layout';
import ProductCatalog from '@/components/pos/ProductCatalog';
import ProductCatalogOptimized from '@/components/pos/ProductCatalogOptimized';
import Cart from '@/components/pos/Cart';
import QuickActions from '@/components/pos/QuickActions';
import SubscriptionCatalog from '@/components/pos/SubscriptionCatalog';

import PrintReceipt from '@/components/pos/PrintReceipt';
import ProductVariantSelector from '@/components/pos/ProductVariantSelector';
import POSSettings from '@/components/pos/settings/POSSettings';
import RepairServiceDialog from '@/components/repair/RepairServiceDialog';
import RepairOrderPrint from '@/components/repair/RepairOrderPrint';
import { useApps } from '@/context/AppsContext';
import QuickReturnDialog from '@/components/pos/QuickReturnDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ShoppingCart, Wrench, Settings2, CreditCard, RotateCcw, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getProductPriceForQuantity } from '@/api/productService';
import { Button } from '@/components/ui/button';
import { searchProductByBarcode, BarcodeSearchResult } from '@/lib/api/barcode-search';
import { useTenant } from '@/context/TenantContext';

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

const POS = () => {
  const { products: shopProducts, services, orders, addOrder, users, isLoading, refreshData } = useShop();
  const { user } = useAuth();
  const { isAppEnabled } = useApps();
  const { currentOrganization } = useTenant();
  
  // مرجع لدالة تحديث المخزون في ProductCatalog
  const productCatalogUpdateFunction = useRef<((productId: string, stockChange: number) => void) | null>(null);
  
  // استخدام POSDataContext المحسن لمنع الطلبات المكررة
  const { 
    products, 
    subscriptions, 
    categories: subscriptionCategories, 
    posSettings,
    organizationApps,
    isLoading: isPOSDataLoading,
    errors,
    refreshAll: refreshPOSData,
    refreshProducts,
    updateProductStockInCache,
    getProductStock
  } = usePOSData();
  
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'products' | 'subscriptions'>('products');
  const [selectedServices, setSelectedServices] = useState<(Service & { 
    scheduledDate?: Date; 
    notes?: string; 
    customerId?: string;
    public_tracking_code?: string;
    repair_location_id?: string;
  })[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  
  // إضافة متغيرات حالة لاختيار المتغيرات
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
  
  // إضافة حالة لطي/توسيع الإجراءات السريعة
  const [isQuickActionsExpanded, setIsQuickActionsExpanded] = useState(false);

  // إضافة حالة لنافذة إعدادات نقطة البيع
  const [isPOSSettingsOpen, setIsPOSSettingsOpen] = useState(false);

  // حالة جديدة للتعامل مع قارئ الباركود
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [lastKeyTime, setLastKeyTime] = useState(0);

  // حالة نافذة خدمة التصليح
  const [isRepairDialogOpen, setIsRepairDialogOpen] = useState(false);
  
  // حالة نافذة طباعة وصل التصليح
  const [isRepairPrintDialogOpen, setIsRepairPrintDialogOpen] = useState(false);
  const [selectedRepairOrder, setSelectedRepairOrder] = useState(null);
  const [repairQueuePosition, setRepairQueuePosition] = useState(0);

  // حالة نافذة الإرجاع السريع
  const [isQuickReturnOpen, setIsQuickReturnOpen] = useState(false);

  // ✅ إضافة حالة وضع الإرجاع
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [returnItems, setReturnItems] = useState<CartItem[]>([]);
  const [returnReason, setReturnReason] = useState('customer_request');
  const [returnNotes, setReturnNotes] = useState('');

  // ✅ لا حاجة لجلب البيانات يدوياً - POSDataContext يتولى كل شيء
  // جلب البيانات يتم تلقائياً عبر POSDataContext مع منع الطلبات المكررة

  // ✅ تمت إزالة fetchSubscriptions و fetchSubscriptionCategories 
  // البيانات تُجلب تلقائياً عبر POSDataContext مع منع الطلبات المكررة

  // جلب الطلبات الأخيرة والمنتجات المفضلة
  useEffect(() => {
    if (!isLoading && products.length > 0 && orders.length > 0) {
      // آخر 10 طلبات في المتجر
      const posOrders = orders
        .filter(order => !order.isOnline)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
      
      setRecentOrders(posOrders);
      
      // المنتجات الأكثر مبيعاً
      const productFrequency: Record<string, number> = {};
      
      orders.forEach(order => {
        order.items.forEach(item => {
          productFrequency[item.productId] = (productFrequency[item.productId] || 0) + item.quantity;
        });
      });
      
      // ترتيب المنتجات حسب المبيعات
      const sortedProducts = Object.entries(productFrequency)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => products.find(p => p.id === id))
        .filter((p): p is any => !!p)
        .slice(0, 6);
      
      setFavoriteProducts(sortedProducts);
    }
  }, [isLoading, orders, products]);

  // تعديل دالة إضافة منتج للسلة للتعامل مع المتغيرات
  const addItemToCart = (product: Product) => {
    // التحقق من وجود ألوان أو مقاسات للمنتج
    if (product.has_variants && product.colors && product.colors.length > 0) {
      // فتح نافذة اختيار المتغيرات
      setSelectedProductForVariant(product);
      setIsVariantDialogOpen(true);
      return;
    }
    
    // استخدام المخزون من المنتج نفسه أولاً، ثم محاولة getProductStock كـ fallback
    let currentStock = product.stockQuantity || product.stock_quantity || 0;
    
    // محاولة الحصول على المخزون المحدث من POSDataContext إذا كان المنتج موجود
    try {
      const stockFromContext = getProductStock(product.id);
      // استخدام المخزون من السياق فقط إذا كان المنتج موجود (ليس 0 بسبب عدم العثور عليه)
      const productExistsInContext = products.some(p => p.id === product.id);
      if (productExistsInContext) {
        currentStock = stockFromContext;
      }
    } catch (error) {
      // استخدام المخزون من المنتج نفسه في حالة الخطأ
      console.log('[addItemToCart] استخدام المخزون من المنتج:', currentStock);
    }
    
    // إذا لم يكن للمنتج متغيرات، أضفه مباشرة
    const existingItem = cartItems.find(item => 
      item.product.id === product.id && 
      !item.colorId && 
      !item.sizeId
    );
    
    if (existingItem) {
      if (existingItem.quantity >= currentStock) {
        toast.error(`لا يمكن إضافة المزيد من "${product.name}". الكمية المتاحة: ${currentStock}`);
        return;
      }
      
      const updatedCart = cartItems.map(item =>
        item.product.id === product.id && !item.colorId && !item.sizeId 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      );
      setCartItems(updatedCart);
    } else {
      if (currentStock <= 0) {
        toast.error(`المنتج "${product.name}" غير متوفر في المخزون`);
        return;
      }
      setCartItems([...cartItems, { product, quantity: 1 }]);
    }
    
    toast.success(`تمت إضافة "${product.name}" إلى السلة`);
  };

  // دالة جديدة لإضافة المنتج مع المتغيرات المحددة
  const addVariantToCart = (
    product: Product, 
    colorId?: string, 
    sizeId?: string, 
    variantPrice?: number,
    colorName?: string,
    colorCode?: string,
    sizeName?: string,
    variantImage?: string
  ) => {
    // تحديد الكمية المتاحة بناءً على المتغير المحدد
    let availableQuantity = product.stock_quantity;
    let variantIdentifier = "";
    let variantName = "";
    
    // المتغير هو لون ومقاس
    if (colorId && sizeId) {
      // ابحث عن المقاس داخل اللون
      const color = product.colors?.find(c => c.id === colorId);
      const size = color?.sizes?.find(s => s.id === sizeId);
      
      if (size) {
        availableQuantity = size.quantity;
        variantIdentifier = `${colorId}-${sizeId}`;
        variantName = `${product.name} - ${colorName || 'لون'} - ${sizeName || 'مقاس'}`;
      }
    }
    // المتغير هو لون فقط
    else if (colorId) {
      const color = product.colors?.find(c => c.id === colorId);
      if (color) {
        availableQuantity = color.quantity;
        variantIdentifier = colorId;
        variantName = `${product.name} - ${colorName || 'لون'}`;
      }
    }
    
    // التحقق من توفر المخزون
    if (availableQuantity <= 0) {
      toast.error(`المنتج "${variantName || product.name}" غير متوفر في المخزون`);
      return;
    }
    
    // البحث عن نفس المتغير في السلة
    const existingItemIndex = cartItems.findIndex(item => 
      item.product.id === product.id && 
      item.colorId === colorId && 
      item.sizeId === sizeId
    );
    
    // إذا كان موجوداً بالفعل، زيادة الكمية
    if (existingItemIndex >= 0) {
      const existingItem = cartItems[existingItemIndex];
      
      if (existingItem.quantity >= availableQuantity) {
        toast.error(`لا يمكن إضافة المزيد من "${variantName || product.name}". الكمية المتاحة: ${availableQuantity}`);
        return;
      }
      
      const updatedCart = [...cartItems];
      updatedCart[existingItemIndex] = { 
        ...existingItem, 
        quantity: existingItem.quantity + 1 
      };
      
      setCartItems(updatedCart);
    } 
    // وإلا، إضافة عنصر جديد للسلة
    else {
      const newItem: CartItem = { 
        product, 
        quantity: 1,
        colorId,
        colorName,
        colorCode,
        sizeId,
        sizeName,
        variantPrice: variantPrice || product.price,
        variantImage
      };
      
      setCartItems([...cartItems, newItem]);
    }
    
    // إغلاق نافذة اختيار المتغيرات
    setIsVariantDialogOpen(false);
    setSelectedProductForVariant(null);
    
    toast.success(`تمت إضافة "${variantName || product.name}" إلى السلة`);
  };

  // تنظيف البيانات الواردة من قارئ الباركود
  const cleanBarcodeInput = (input: string): string => {
    // إزالة المسافات من البداية والنهاية فقط
    let cleaned = input.trim();
    
    // إزالة أحرف التحكم غير المرئية (مثل \n, \r, \t)
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
    
    // إزالة أحرف خاصة أخرى قد تأتي من بعض أجهزة الباركود سكانر
    // مثل NULL، BEL، DEL، وغيرها
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
    
    // إزالة المسافات المتعددة واستبدالها بمسافة واحدة
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // إزالة المسافات من البداية والنهاية مرة أخرى بعد التنظيف
    cleaned = cleaned.trim();
    
    console.log('[cleanBarcodeInput] المدخل:', JSON.stringify(input));
    console.log('[cleanBarcodeInput] بعد التنظيف:', JSON.stringify(cleaned));
    console.log('[cleanBarcodeInput] طول المدخل:', input.length, 'طول النتيجة:', cleaned.length);
    
    // إرجاع الباركود كما هو بدون تحويل إلى lowercase
    // للحفاظ على التطابق الدقيق مع الباركودات المحفوظة
    return cleaned;
  };

  // تحويل نتيجة البحث إلى منتج متوافق مع POS
  const convertSearchResultToProduct = (result: BarcodeSearchResult): Product => {
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
  };

  // البحث عن منتج بواسطة الباركود أو SKU
  const handleBarcodeScanned = async (rawBarcode: string) => {
    // تنظيف البيانات الواردة من قارئ الباركود
    const barcode = cleanBarcodeInput(rawBarcode);
    
    console.log('[DEBUG] الباركود الأصلي:', rawBarcode);
    console.log('[DEBUG] الباركود بعد التنظيف:', barcode);
    
    // تسجيل إضافي للمساعدة في التشخيص
    console.log('[DEBUG] البحث عن الباركود:', barcode);
    console.log('[DEBUG] عدد المنتجات المتاحة:', products.length);
    
    // التحقق من أن الباركود ليس فارغ بعد التنظيف
    if (!barcode || barcode.length === 0) {
      toast.error('الباركود المُدخل غير صالح. تأكد من إعدادات قارئ الباركود.');
      return;
    }
    
    // البحث في المنتجات الأساسية (barcode أو sku) - مع مقارنة case-insensitive
    console.log('[DEBUG] البحث في المنتجات الأساسية...');
    const product = products.find(p => {
      const barcodeMatch = p.barcode && p.barcode.toLowerCase() === barcode.toLowerCase();
      const skuMatch = p.sku && p.sku.toLowerCase() === barcode.toLowerCase();
      
      if (barcodeMatch || skuMatch) {
        console.log('[DEBUG] وُجد تطابق:', p.name, 'barcode:', p.barcode, 'sku:', p.sku);
      }
      
      return barcodeMatch || skuMatch;
    });
    
    if (product) {
      console.log('[DEBUG] تم العثور على المنتج:', product.name);
      addItemToCart(product);
      return;
    }
    
    // البحث في متغيرات المنتجات (ألوان ومقاسات)
    let foundVariant = false;
    
    for (const product of products) {
      // البحث في الألوان
      if (product.colors && product.colors.length > 0) {
        const color = product.colors.find(c => c.barcode && c.barcode.toLowerCase() === barcode.toLowerCase());
        if (color) {
          addVariantToCart(
            product,
            color.id,
            undefined,
            color.price,
            color.name,
            color.color_code,
            undefined,
            color.image_url
          );
          foundVariant = true;
          break;
        }
        
        // البحث في المقاسات
        if (product.use_sizes) {
          for (const color of product.colors) {
            if (color.sizes && color.sizes.length > 0) {
              const size = color.sizes.find(s => s.barcode && s.barcode.toLowerCase() === barcode.toLowerCase());
              if (size) {
                                  addVariantToCart(
                    product,
                    color.id,
                    size.id,
                    size.price,
                    color.name,
                    color.color_code,
                    size.size_name || 'مقاس',
                    color.image_url
                  );
                foundVariant = true;
                break;
              }
            }
          }
          if (foundVariant) break;
        }
      }
    }
    
    if (!foundVariant) {
      // البحث المباشر في قاعدة البيانات كـ fallback
      console.log('[DEBUG] لم يُعثر على المنتج في الكاش، البحث في قاعدة البيانات...');
      
      if (currentOrganization?.id) {
        try {
          const searchResult = await searchProductByBarcode(currentOrganization.id, barcode);
          
          if (searchResult) {
            console.log('[DEBUG] تم العثور على المنتج في قاعدة البيانات:', searchResult.name);
            
            // تحويل النتيجة إلى منتج وإضافته للسلة
            const foundProduct = convertSearchResultToProduct(searchResult);
            
            // التحقق من نوع المنتج (أساسي أم متغير)
            if (searchResult.colors && searchResult.colors.length > 0) {
              const color = searchResult.colors[0];
              
              if (color.sizes && color.sizes.length > 0) {
                // منتج بمقاس
                const size = color.sizes[0];
                addVariantToCart(
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
                // منتج بلون فقط
                addVariantToCart(
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
              // منتج أساسي
              addItemToCart(foundProduct);
            }
            
            return; // خروج من الدالة بعد النجاح
          }
        } catch (error) {
          console.error('[DEBUG] خطأ في البحث المباشر:', error);
        }
      }
      
      // عرض الباركودات المتاحة في وحدة التحكم للمساعدة في التشخيص
      console.log('[DEBUG] الباركودات المتاحة في المنتجات المحملة:');
      products.forEach(p => {
        if (p.barcode) {
          console.log(`- ${p.name}: ${p.barcode}`);
        }
        if (p.sku) {
          console.log(`- ${p.name} (SKU): ${p.sku}`);
        }
        // عرض باركودات الألوان والمقاسات أيضاً
        if (p.colors && p.colors.length > 0) {
          p.colors.forEach(color => {
            if (color.barcode) {
              console.log(`- ${p.name} - ${color.name}: ${color.barcode}`);
            }
            if (color.sizes && color.sizes.length > 0) {
              color.sizes.forEach(size => {
                if (size.barcode) {
                  console.log(`- ${p.name} - ${color.name} - ${size.size_name}: ${size.barcode}`);
                }
              });
            }
          });
        }
      });
      
      toast.error(`لم يتم العثور على منتج بالباركود: ${barcode}`);
    }
  };

  // Eliminar producto del carrito
  const removeItemFromCart = (index: number) => {
    const item = cartItems[index];
    const updatedCart = [...cartItems];
    updatedCart.splice(index, 1);
    setCartItems(updatedCart);
    
    // إرجاع المخزون للمنتج في ProductCatalog
    if (productCatalogUpdateFunction.current) {
      productCatalogUpdateFunction.current(item.product.id, item.quantity);
    }
  };

  // Actualizar cantidad del producto en carrito
  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    
    const item = cartItems[index];
    
    // استخدام المخزون من المنتج نفسه أولاً
    let availableQuantity = item.product.stockQuantity || item.product.stock_quantity || 0;
    
    // محاولة الحصول على المخزون المحدث من POSDataContext إذا كان المنتج موجود
    try {
      const productExistsInContext = products.some(p => p.id === item.product.id);
      if (productExistsInContext) {
        availableQuantity = getProductStock(item.product.id, item.colorId, item.sizeId);
      } else {
        // للمنتجات مع متغيرات، استخدام المخزون من البيانات المحفوظة
        if (item.colorId) {
          const color = item.product.colors?.find(c => c.id === item.colorId);
          if (color) {
            if (item.sizeId && color.sizes) {
              const size = color.sizes.find(s => s.id === item.sizeId);
              availableQuantity = size?.quantity || 0;
            } else {
              availableQuantity = color.quantity || 0;
            }
          }
        }
      }
    } catch (error) {
      console.log('[updateItemQuantity] استخدام المخزون من المنتج:', availableQuantity);
    }
    
    if (quantity > availableQuantity) {
      toast.error(`الكمية المطلوبة غير متوفرة. الكمية المتاحة: ${availableQuantity}`);
      
      // تعيين الكمية بالحد الأقصى المتاح
      const updatedCart = [...cartItems];
      updatedCart[index] = { ...item, quantity: availableQuantity };
      setCartItems(updatedCart);
      return;
    }
    
    const updatedCart = [...cartItems];
    updatedCart[index] = { ...item, quantity };
    setCartItems(updatedCart);
  };

  // Limpiar carrito
  const clearCart = () => {
    // إرجاع المخزون لجميع المنتجات في السلة
    if (productCatalogUpdateFunction.current) {
      cartItems.forEach(item => {
        productCatalogUpdateFunction.current!(item.product.id, item.quantity);
      });
    }
    
    setCartItems([]);
    setSelectedServices([]);
    setSelectedSubscriptions([]);
  };

  // إضافة اشتراك للسلة مع السعر المحدد
  const handleAddSubscription = (subscription: any, pricing?: any) => {
    // إذا لم يتم تمرير pricing، استخدم السعر الافتراضي
    let selectedPricing = pricing;
    
    if (!selectedPricing) {
      // البحث عن السعر الافتراضي في pricing_options
      if (subscription.pricing_options && subscription.pricing_options.length > 0) {
        selectedPricing = subscription.pricing_options.find((p: any) => p.is_default) || subscription.pricing_options[0];
      } else {
        // استخدام البيانات القديمة للتوافق
        selectedPricing = {
          id: `legacy-${subscription.id}`,
          duration_months: 1,
          duration_label: 'شهر واحد',
          selling_price: subscription.selling_price || 0,
          purchase_price: subscription.purchase_price || 0,
          available_quantity: subscription.available_quantity || 1,
          discount_percentage: 0,
          promo_text: ''
        };
      }
    }

    const subscriptionWithPricing = {
      ...subscription,
      selectedPricing,
      // إنشاء معرف فريد يتضمن معرف السعر
      cart_id: `${subscription.id}-${selectedPricing.id}-${Date.now()}`,
      tracking_code: `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      // حفظ معلومات السعر في المستوى الأعلى للسهولة
      duration_months: selectedPricing.duration_months,
      duration_label: selectedPricing.duration_label,
      final_price: selectedPricing.selling_price * (1 - (selectedPricing.discount_percentage || 0) / 100),
      original_price: selectedPricing.selling_price,
      discount_percentage: selectedPricing.discount_percentage || 0,
      promo_text: selectedPricing.promo_text || ''
    };

    const existingIndex = selectedSubscriptions.findIndex(s => 
      s.cart_id === subscriptionWithPricing.cart_id
    );

    if (existingIndex >= 0) {
      toast.error('هذا الاشتراك موجود بالفعل في السلة');
      return;
    }

    setSelectedSubscriptions(prev => [...prev, subscriptionWithPricing]);
    toast.success(`تمت إضافة اشتراك "${subscription.name}" (${selectedPricing.duration_label}) للسلة`);
  };

  // إزالة اشتراك من السلة
  const removeSubscriptionFromCart = (subscriptionId: string) => {
    setSelectedSubscriptions(prev => prev.filter(s => s.cart_id !== subscriptionId));
  };

  // تحديث سعر الاشتراك
  const updateSubscriptionPrice = (subscriptionId: string, price: number) => {
    setSelectedSubscriptions(prev => prev.map(subscription => 
      subscription.cart_id === subscriptionId ? { 
        ...subscription, 
        final_price: price,
        selectedPricing: {
          ...subscription.selectedPricing,
          selling_price: price
        }
      } : subscription
    ));
  };

  // Añadir servicio
  const handleAddService = (service: Service & { customerId?: string }, scheduledDate?: Date, notes?: string, repairLocationId?: string) => {
    // Verificar si el servicio ya está en la lista
    const existingServiceIndex = selectedServices.findIndex(s => s.id === service.id);
    
    if (existingServiceIndex !== -1) {
      // Actualizar el servicio existente
      const updatedServices = [...selectedServices];
      updatedServices[existingServiceIndex] = {
        ...service,
        scheduledDate,
        notes,
        customerId: service.customerId, // الحفاظ على معرف العميل المختار
        repair_location_id: repairLocationId // إضافة معرف مكان التصليح
      };
      setSelectedServices(updatedServices);
    } else {
      // Añadir nuevo servicio
      setSelectedServices([...selectedServices, { 
        ...service, 
        scheduledDate, 
        notes,
        customerId: service.customerId, // الحفاظ على معرف العميل المختار
        repair_location_id: repairLocationId // إضافة معرف مكان التصليح
      }]);
    }
    
    toast.success(`تمت إضافة خدمة "${service.name}"`);
  };

  // Eliminar servicio de la lista
  const removeServiceFromCart = (serviceId: string) => {
    setSelectedServices(selectedServices.filter((s) => s.id !== serviceId));
  };

  // Actualizar precio de un servicio
  const updateServicePrice = (serviceId: string, price: number) => {
    setSelectedServices(
      selectedServices.map((service) => 
        service.id === serviceId ? { ...service, price } : service
      )
    );
  };

  // دالة لاستقبال دالة تحديث المخزون من ProductCatalogOptimized
  const handleStockUpdate = (productId: string, updateFunction: any) => {
    if (productId === '__update_function__') {
      productCatalogUpdateFunction.current = updateFunction;
    }
  };

  // دالة معالجة نجاح إضافة خدمة التصليح مع فتح نافذة الطباعة
  const handleRepairServiceSuccess = async (orderId: string, trackingCode: string) => {
    try {
      // جلب بيانات الطلبية الجديدة من قاعدة البيانات
      const { data, error } = await supabase
        .from('repair_orders')
        .select(`
          *,
          images:repair_images(*),
          history:repair_status_history(*, users(name)),
          repair_location:repair_locations(id, name, description, address, phone),
          staff:users(id, name, email, phone)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      if (data) {
        // تحديد الطلبية المحددة
        setSelectedRepairOrder(data);
        
        // حساب ترتيب الطابور (يمكن تحسينه لاحقاً)
        setRepairQueuePosition(1); // قيمة افتراضية
        
        // فتح نافذة الطباعة
        setIsRepairPrintDialogOpen(true);
      }

      // إغلاق نافذة إضافة الخدمة
      setIsRepairDialogOpen(false);
      toast.success('تم إنشاء طلبية تصليح جديدة بنجاح');
    } catch (error) {
      console.error('خطأ في جلب بيانات الطلبية:', error);
      setIsRepairDialogOpen(false);
      toast.success('تم إنشاء طلبية تصليح جديدة بنجاح');
    }
  };

  // Abrir un pedido existente
  const handleOpenOrder = (order: Order) => {
    // Check if we have product data for all items
    const hasAllProducts = order.items.every(item => {
      return products.some(p => p.id === item.productId);
    });

    if (!hasAllProducts) {
      toast.error("لا يمكن فتح الطلب. بعض المنتجات غير متوفرة حاليًا.");
      return;
    }

    // Convert order items to cart items
    const newCartItems = order.items.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        throw new Error(`المنتج غير موجود: ${item.productId}`);
      }
      
      return {
        product,
        quantity: item.quantity
      };
    });

    // Replace current cart and set current order
    setCartItems(newCartItems);
    setCurrentOrder(order);
    toast.success(`تم فتح الطلب #${order.id}`);
  };

  // Crear orden محسن للسرعة مع رسائل تشخيصية
  const submitOrder = async (orderDetails: Partial<Order>): Promise<{orderId: string, customerOrderNumber: number}> => {
    
    if (cartItems.length === 0 && selectedServices.length === 0 && selectedSubscriptions.length === 0) {
      toast.error("لا يمكن إنشاء طلب فارغ");
      return;
    }

    // إشارة بداية المعالجة
    toast.info("جاري معالجة الطلب...", { duration: 1000 });

    try {
      // تحسين #1: تجنب الحصول على أسعار الجملة إذا لم تكن مطلوبة
      // إنشاء خريطة محلية للمنتجات لتجنب البحث المتكرر
      const productMap = new Map(products.map(p => [p.id, p]));
      
      // تحسين #2: معالجة العناصر بدون استدعاءات API إضافية
      const startProcessing = Date.now();
      const cartItemsWithWholesale = cartItems.map(item => {
        const product = productMap.get(item.product.id);
        
        // حساب محلي للسعر بدلاً من استدعاء API
        let finalPrice = item.variantPrice || item.product.price;
        let isWholesale = false;
        
        // فحص محلي لأسعار الجملة
        if (product?.allow_wholesale && 
            product.wholesale_price && 
            product.min_wholesale_quantity && 
            item.quantity >= product.min_wholesale_quantity) {
          finalPrice = product.wholesale_price;
          isWholesale = true;
        } else if (product?.allow_partial_wholesale && 
                   product.partial_wholesale_price && 
                   product.min_partial_wholesale_quantity && 
                   item.quantity >= product.min_partial_wholesale_quantity) {
          finalPrice = product.partial_wholesale_price;
          isWholesale = true;
        }
        
        return {
          ...item,
          wholesalePrice: finalPrice,
          isWholesale
        };
      });

      // تحسين #3: تحسين إنشاء OrderItems
      const orderItems: OrderItem[] = cartItemsWithWholesale.map((item, index) => {
        const itemId = uuidv4();
        const timestamp = Date.now();
        
        const unitPrice = item.isWholesale 
          ? item.wholesalePrice 
          : (item.variantPrice || item.product.price);
        
        const productName = item.colorName || item.sizeName
          ? `${item.product.name} ${item.colorName ? `- ${item.colorName}` : ''}${item.sizeName ? ` - ${item.sizeName}` : ''}`
          : item.product.name;
        
        return {
          id: itemId,
          productId: item.product.id,
          productName: productName,
          quantity: item.quantity,
          price: unitPrice,
          unitPrice: unitPrice,
          totalPrice: unitPrice * item.quantity,
          isDigital: item.product.isDigital,
          isWholesale: item.isWholesale,
          originalPrice: item.product.price,
          slug: `item-${timestamp}-${index}`,
          name: item.product.name,
          variant_info: {
            colorId: item.colorId,
            colorName: item.colorName,
            colorCode: item.colorCode,
            sizeId: item.sizeId,
            sizeName: item.sizeName,
            variantImage: item.variantImage
          }
        };
      });
      
      // تحسين #4: تحسين إنشاء ServiceBookings
      const serviceBookings: ServiceBooking[] = selectedServices.map((service, index) => {
        const serviceId = uuidv4();
        const orderPrefix = Math.floor(1000 + Math.random() * 9000);
        const serviceIndex = 1001 + index;
        const publicTrackingCode = `SRV-${orderPrefix}-${serviceIndex}`;
        
        // تحديث محلي للخدمة
        service.public_tracking_code = publicTrackingCode;
        
        // تحسين البحث عن اسم العميل
        const customerName = service.customerId 
          ? users.find(u => u.id === service.customerId)?.name || "زائر"
          : (orderDetails.customerId && orderDetails.customerId !== 'walk-in' && orderDetails.customerId !== 'guest'
              ? users.find(u => u.id === orderDetails.customerId)?.name || "زائر"
              : "زائر");
        
        return {
          id: serviceId,
          serviceId: service.id,
          serviceName: service.name,
          price: service.price,
          scheduledDate: service.scheduledDate,
          notes: service.notes,
          customerId: service.customerId || orderDetails.customerId,
          customer_name: customerName,
          status: 'pending',
          assignedTo: user?.id || "",
          public_tracking_code: publicTrackingCode,
          repair_location_id: service.repair_location_id
        };
      });
      
      // تحسين #5: حساب المجاميع بكفاءة أعلى
      const productsSubtotal = cartItemsWithWholesale.reduce(
        (sum, item) => sum + (item.wholesalePrice * item.quantity), 
        0
      );
      
      const servicesSubtotal = selectedServices.reduce(
        (sum, service) => sum + service.price, 
        0
      );
      
      const subscriptionsSubtotal = selectedSubscriptions.reduce(
        (sum, subscription) => sum + (subscription.final_price || subscription.selling_price || 0), 
        0
      );
      
      const subtotal = productsSubtotal + servicesSubtotal + subscriptionsSubtotal;
      const discountAmount = orderDetails.discount || 0;
      const taxableAmount = subtotal - discountAmount;
      const tax = 0; // الضريبة صفر
      const total = taxableAmount + tax;
      
      const processingTime = Date.now() - startProcessing;
      
      // إشارة معالجة الاشتراكات
      if (selectedSubscriptions.length > 0) {
        toast.info("جاري معالجة الاشتراكات...", { duration: 800 });
      }
      
      // تحسين #6: معالجة الاشتراكات بالتوازي فقط إذا وُجدت
      if (selectedSubscriptions.length > 0) {
        // معالجة معاملات الاشتراكات بالتوازي
        await Promise.all(
          selectedSubscriptions.map(async (subscription) => {
            try {
              // إدراج معاملة الاشتراك
              const { data: transactionData, error: transactionError } = await supabase
                .from('subscription_transactions' as any)
                .insert([{
                  service_id: subscription.id,
                  transaction_type: 'sale',
                  amount: subscription.final_price || subscription.selling_price || 0,
                  cost: subscription.selectedPricing?.purchase_price || subscription.purchase_price || 0,
                  customer_id: (orderDetails.customerId === 'walk-in' || orderDetails.customerId === 'guest') ? null : orderDetails.customerId,
                  customer_name: (orderDetails.customerId === 'walk-in' || orderDetails.customerId === 'guest') ? 'زائر' : users.find(u => u.id === orderDetails.customerId)?.name || 'غير محدد',
                  payment_method: orderDetails.paymentMethod || 'cash',
                  payment_status: orderDetails.paymentStatus === 'paid' ? 'completed' : orderDetails.paymentStatus || 'completed',
                  quantity: 1,
                  description: `${subscription.name} - ${subscription.duration_label}`,
                  notes: `كود التتبع: ${subscription.tracking_code}`,
                  processed_by: user?.id,
                  organization_id: user?.user_metadata?.organization_id || localStorage.getItem('bazaar_organization_id') || 'fed872f9-1ade-4351-b020-5598fda976fe'
                }])
                .select()
                .single();

              if (transactionError) {
                throw transactionError;
              }

              // تحديث المخزون إذا لزم الأمر
              if (subscription.selectedPricing?.id) {
                const { data: currentPricing } = await supabase
                  .from('subscription_service_pricing' as any)
                  .select('available_quantity, sold_quantity')
                  .eq('id', subscription.selectedPricing.id)
                  .single();

                if (currentPricing) {
                  await supabase
                    .from('subscription_service_pricing' as any)
                    .update({
                      available_quantity: Math.max(0, (currentPricing as any).available_quantity - 1),
                      sold_quantity: ((currentPricing as any).sold_quantity || 0) + 1
                    })
                    .eq('id', subscription.selectedPricing.id);
                }
              }

              return transactionData;
            } catch (error) {
              // تجاهل أخطاء الاشتراكات الفردية ومتابعة العملية
              return null;
            }
          })
        );
      }

      // إشارة حفظ الطلب
      toast.info("جاري حفظ الطلب...", { duration: 800 });

      // تحسين #7: إنشاء الطلب الأساسي
      const newOrder: Order = {
        id: uuidv4(),
        customerId: orderDetails.customerId || "walk-in",
        items: orderItems,
        services: serviceBookings,
        subtotal,
        tax,
        discount: discountAmount,
        total,
        status: "completed",
        paymentMethod: orderDetails.paymentMethod || "cash",
        paymentStatus: orderDetails.paymentStatus || "paid",
        notes: orderDetails.notes,
        isOnline: false,
        employeeId: user?.id || "",
        partialPayment: orderDetails.partialPayment,
        createdAt: new Date(),
        updatedAt: new Date(),
        // إضافة معلومات حساب الاشتراك
        subscriptionAccountInfo: orderDetails.subscriptionAccountInfo
      };

      // حفظ الطلب محلياً للمرجع
      setCurrentOrder(newOrder);
      
      // تحسين #8: إنشاء الطلب في قاعدة البيانات
      const createdOrder = await addOrder(newOrder);
      
      // التحقق من نجاح إنشاء الطلب
      if (!createdOrder) {
        throw new Error('فشل في إنشاء الطلب');
      }

      // ملاحظة: تم إزالة التحديث المكرر للمخزون من هنا
      // المخزون يتم تحديثه تلقائياً في خدمة createPOSOrder
      
      // تنظيف الاشتراكات المحلية
      if (selectedSubscriptions.length > 0) {
        setSelectedSubscriptions([]);
        // تحديث الاشتراكات في الخلفية (غير متزامن)
        refreshPOSData().catch(() => {
          // تجاهل أخطاء التحديث
        });
      }
      
      const totalTime = Date.now() - startProcessing;
      
      toast.success(`تم إنشاء الطلب بنجاح (${totalTime}ms)`);
      
      // تحديث فوري للحالة المحلية قبل تحديث الخادم
      console.log(`[POS] تحديث الحالة المحلية للمخزون...`);
      try {
        // تحديث المخزون في cache مباشرة لكل منتج
        cartItems.forEach(item => {
          updateProductStockInCache(
            item.product.id,
            item.colorId || null,
            item.sizeId || null,
            item.quantity
          );
        });
        console.log(`[POS] تم تحديث الحالة المحلية بنجاح`);
      } catch (error) {
        console.warn(`[POS] خطأ في تحديث الحالة المحلية:`, error);
      }

      // تحديث فوري من قاعدة البيانات للحصول على أحدث البيانات
      console.log(`[POS] تحديث البيانات من الخادم بعد إتمام البيع...`);
      try {
        await refreshProducts();
        console.log(`[POS] تم تحديث البيانات من الخادم بنجاح`);
      } catch (error) {
        console.warn(`[POS] خطأ في تحديث البيانات من الخادم:`, error);
      }
      
      // مسح السلة بعد إتمام العملية بنجاح
      clearCart();
      
      return {
        orderId: createdOrder.id,
        customerOrderNumber: (createdOrder as any).customer_order_number || 0
      };
      
    } catch (error) {
      toast.error("حدث خطأ أثناء إنشاء الطلب");
      throw error;
    }
  };

  // استماع عالمي لأحداث قارئ الباركود
  // استخدام useRef للحفاظ على قيم محدثة في event handler
  const barcodeBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const productsRef = useRef(products);
  const cartItemsRef = useRef(cartItems);
  const currentOrganizationRef = useRef(currentOrganization);

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
    cartItemsRef.current = cartItems;
  }, [cartItems]);

  useEffect(() => {
    currentOrganizationRef.current = currentOrganization;
  }, [currentOrganization]);

  useEffect(() => {
    const handleKeyPress = async (event: KeyboardEvent) => {
      
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      
      // إذا مرت أكثر من 200ms منذ آخر مفتاح، ابدأ باركود جديد
      if (timeDiff > 200) {
        setBarcodeBuffer('');
        barcodeBufferRef.current = '';
      }
      
      // تجاهل المفاتيح الخاصة والتركيز على الحقول
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }
      
      // تجاهل فقط إذا كان المستخدم يكتب في حقل إدخال نصي فعلاً
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
      
      // إذا كان Enter، قم بمعالجة الباركود المتراكم
      if (event.key === 'Enter') {
        event.preventDefault();
        const currentBuffer = barcodeBufferRef.current;
        if (currentBuffer.length > 0) {
          // استخدام نفس وظيفة التنظيف المحدثة مع تسجيل تشخيصي
          const barcode = cleanBarcodeInput(currentBuffer);
          
          console.log('[BARCODE SCANNER] الباركود الأصلي:', currentBuffer);
          console.log('[BARCODE SCANNER] الباركود بعد التنظيف:', barcode);
          
          if (barcode) {
            const currentProducts = productsRef.current;
            // البحث في المنتجات الأساسية أولاً - مع مقارنة case-insensitive
            const product = currentProducts.find(p => 
              (p.barcode && p.barcode.toLowerCase() === barcode.toLowerCase()) || 
              (p.sku && p.sku.toLowerCase() === barcode.toLowerCase())
            );
            if (product) {
              // التحقق من المخزون والإضافة للسلة
              if (product.stock_quantity <= 0) {
                toast.error(`المنتج "${product.name}" غير متوفر في المخزون`);
              } else {
                // استخدام setCartItems مباشرة
                setCartItems(prevCart => {
                  const existingItem = prevCart.find(item => item.product.id === product.id);
                  if (existingItem) {
                    if (existingItem.quantity >= product.stock_quantity) {
                      toast.error(`لا يمكن إضافة المزيد من "${product.name}". الكمية المتاحة: ${product.stock_quantity}`);
                      return prevCart;
                    }
                    toast.success(`تمت إضافة "${product.name}" إلى السلة`);
                    return prevCart.map(item =>
                      item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                    );
                  } else {
                    toast.success(`تمت إضافة "${product.name}" إلى السلة`);
                    return [...prevCart, { product, quantity: 1 }];
                  }
                });
              }
            } else {
              // البحث في متغيرات المنتجات (نفس المنطق من handleBarcodeScanned)
              let foundVariant = false;
              
              for (const prod of currentProducts) {
                // البحث في الألوان
                if (prod.colors && prod.colors.length > 0) {
                  const color = prod.colors.find(c => c.barcode && c.barcode.toLowerCase() === barcode.toLowerCase());
                  if (color) {
                    // إضافة المتغير للسلة
                    setCartItems(prevCart => [...prevCart, {
                      product: prod,
                      quantity: 1,
                      colorId: color.id,
                      colorName: color.name,
                      colorCode: color.color_code,
                      variantPrice: color.price,
                      variantImage: color.image_url
                    }]);
                    toast.success(`تمت إضافة "${color.name} - ${prod.name}" إلى السلة`);
                    foundVariant = true;
                    break;
                  }
                  
                  // البحث في المقاسات (هذا ما كان مفقوداً!)
                  if (prod.use_sizes) {
                    for (const color of prod.colors) {
                      if (color.sizes && color.sizes.length > 0) {
                        const size = color.sizes.find(s => s.barcode && s.barcode.toLowerCase() === barcode.toLowerCase());
                        if (size) {
                          // إضافة المتغير للسلة مع المقاس
                          setCartItems(prevCart => [...prevCart, {
                            product: prod,
                            quantity: 1,
                            colorId: color.id,
                            colorName: color.name,
                            colorCode: color.color_code,
                            sizeId: size.id,
                            sizeName: size.size_name || 'مقاس',
                            variantPrice: size.price,
                            variantImage: color.image_url
                          }]);
                          toast.success(`تمت إضافة "${size.size_name || 'مقاس'} - ${color.name} - ${prod.name}" إلى السلة`);
                          foundVariant = true;
                          break;
                        }
                      }
                    }
                    if (foundVariant) break;
                  }
                }
              }
              
              if (!foundVariant) {
                // البحث المباشر في قاعدة البيانات كـ fallback
                console.log('[BARCODE SCANNER] لم يُعثر على المنتج في الكاش، البحث في قاعدة البيانات...');
                
                const currentOrg = currentOrganizationRef.current;
                if (currentOrg?.id) {
                  try {
                    const searchResult = await searchProductByBarcode(currentOrg.id, barcode);
                    
                    if (searchResult) {
                      console.log('[BARCODE SCANNER] تم العثور على المنتج في قاعدة البيانات:', searchResult.name);
                      
                      // تحويل النتيجة إلى منتج وإضافته للسلة
                      const foundProduct = convertSearchResultToProduct(searchResult);
                      
                      // إضافة المنتج للسلة مباشرة
                      setCartItems(prevCart => [...prevCart, { product: foundProduct, quantity: 1 }]);
                      toast.success(`تمت إضافة "${foundProduct.name}" إلى السلة`);
                      
                      setBarcodeBuffer('');
                      barcodeBufferRef.current = '';
                      return; // خروج من الدالة بعد النجاح
                    }
                  } catch (error) {
                    console.error('[BARCODE SCANNER] خطأ في البحث المباشر:', error);
                  }
                }
                
                // عرض الباركودات المتاحة للتشخيص (نفس منطق handleBarcodeScanned)
                console.log('[BARCODE SCANNER] الباركودات المتاحة في المنتجات المحملة:');
                currentProducts.forEach(p => {
                  if (p.barcode) {
                    console.log(`- ${p.name}: ${p.barcode}`);
                  }
                  if (p.sku) {
                    console.log(`- ${p.name} (SKU): ${p.sku}`);
                  }
                  // عرض باركودات الألوان والمقاسات أيضاً
                  if (p.colors && p.colors.length > 0) {
                    p.colors.forEach(color => {
                      if (color.barcode) {
                        console.log(`- ${p.name} - ${color.name}: ${color.barcode}`);
                      }
                      if (color.sizes && color.sizes.length > 0) {
                        color.sizes.forEach(size => {
                          if (size.barcode) {
                            console.log(`- ${p.name} - ${color.name} - ${size.size_name}: ${size.barcode}`);
                          }
                        });
                      }
                    });
                  }
                });
                
                toast.error(`لم يتم العثور على منتج بالباركود: ${barcode}`);
              }
            }
          }
          setBarcodeBuffer('');
          barcodeBufferRef.current = '';
        }
        return;
      }
      
      // إضافة الحرف إلى buffer إذا كان صالحاً
      if (event.key.length === 1) {
        const newBuffer = barcodeBufferRef.current + event.key;
        setBarcodeBuffer(newBuffer);
        barcodeBufferRef.current = newBuffer;
        
        // إذا كان الباركود طويل بما فيه الكفاية ولم يتم الضغط على مفتاح لفترة قصيرة
        // معالجة فورية للباركودات الطويلة
        if (newBuffer.length >= 13 && timeDiff < 50) { // باركودات EAN-13 أو أطول
          console.log('[BARCODE SCANNER] معالجة فورية للباركود الطويل:', newBuffer);
          setTimeout(() => {
            if (barcodeBufferRef.current === newBuffer) { // التأكد أن الـ buffer لم يتغير
              handleBarcodeProcessing(newBuffer);
              setBarcodeBuffer('');
              barcodeBufferRef.current = '';
            }
          }, 20); // معالجة سريعة جداً
        }
      }
    };

    // إضافة مستمع الأحداث مرة واحدة فقط
    document.addEventListener('keypress', handleKeyPress);
    
    return () => {
      document.removeEventListener('keypress', handleKeyPress);
    };
  }, []); // dependency array فارغ لتجنب إعادة التسجيل

  // useEffect منفصل لتنظيف buffer بعد فترة من عدم النشاط
  // وأيضاً معالجة الباركود إذا كان طوله مناسب
  useEffect(() => {
    if (barcodeBuffer.length > 0) {
              const clearBufferTimeout = setTimeout(() => {
          // إذا كان الباركود طوله مناسب، عالجه قبل المسح
          if (barcodeBuffer.length >= 6) { // تقليل الحد الأدنى إلى 6 أحرف
            handleBarcodeProcessing(barcodeBuffer);
          }
          setBarcodeBuffer('');
          barcodeBufferRef.current = '';
        }, 80); // تقليل المدة إلى 80ms فقط

      return () => {
        clearTimeout(clearBufferTimeout);
      };
    }
  }, [barcodeBuffer]);

  // دالة مساعدة لمعالجة الباركود
  const handleBarcodeProcessing = async (rawBarcode: string) => {
    const barcode = cleanBarcodeInput(rawBarcode);
    
              if (!barcode) return;

     const currentProducts = productsRef.current;
     // البحث في المنتجات الأساسية أولاً - مع مقارنة case-insensitive
     const product = currentProducts.find(p => 
       (p.barcode && p.barcode.toLowerCase() === barcode.toLowerCase()) || 
       (p.sku && p.sku.toLowerCase() === barcode.toLowerCase())
     );
     

     
     if (product) {
      // التحقق من المخزون والإضافة للسلة
      if (product.stock_quantity <= 0) {
        toast.error(`المنتج "${product.name}" غير متوفر في المخزون`);
      } else {
        // استخدام setCartItems مباشرة
        setCartItems(prevCart => {
          const existingItem = prevCart.find(item => item.product.id === product.id);
          if (existingItem) {
            if (existingItem.quantity >= product.stock_quantity) {
              toast.error(`لا يمكن إضافة المزيد من "${product.name}". الكمية المتاحة: ${product.stock_quantity}`);
              return prevCart;
            }
            toast.success(`تمت إضافة "${product.name}" إلى السلة`);
            return prevCart.map(item =>
              item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            );
          } else {
            toast.success(`تمت إضافة "${product.name}" إلى السلة`);
            return [...prevCart, { product, quantity: 1 }];
          }
        });
      }
      return;
    }

         // البحث في متغيرات المنتجات
     console.log('[BARCODE SCANNER] بدء البحث في متغيرات المنتجات...');
     let foundVariant = false;
     
     for (const prod of currentProducts) {
      // البحث في الألوان
      if (prod.colors && prod.colors.length > 0) {
        const color = prod.colors.find(c => c.barcode && c.barcode.toLowerCase() === barcode.toLowerCase());
        if (color) {
          // إضافة المتغير للسلة
          setCartItems(prevCart => [...prevCart, {
            product: prod,
            quantity: 1,
            colorId: color.id,
            colorName: color.name,
            colorCode: color.color_code,
            variantPrice: color.price,
            variantImage: color.image_url
          }]);
          toast.success(`تمت إضافة "${color.name} - ${prod.name}" إلى السلة`);
          foundVariant = true;
          break;
        }
        
        // البحث في المقاسات
        if (prod.use_sizes) {
          for (const color of prod.colors) {
            if (color.sizes && color.sizes.length > 0) {
              const size = color.sizes.find(s => s.barcode && s.barcode.toLowerCase() === barcode.toLowerCase());
              if (size) {
                // إضافة المتغير للسلة مع المقاس
                setCartItems(prevCart => [...prevCart, {
                  product: prod,
                  quantity: 1,
                  colorId: color.id,
                  colorName: color.name,
                  colorCode: color.color_code,
                  sizeId: size.id,
                  sizeName: size.size_name || 'مقاس',
                  variantPrice: size.price,
                  variantImage: color.image_url
                }]);
                toast.success(`تمت إضافة "${size.size_name || 'مقاس'} - ${color.name} - ${prod.name}" إلى السلة`);
                foundVariant = true;
                break;
              }
            }
          }
          if (foundVariant) break;
        }
      }
    }
    
    console.log('[BARCODE SCANNER] نتيجة البحث في المتغيرات:', foundVariant ? 'وُجد متغير' : 'لم يُعثر على متغير');
    
    if (!foundVariant) {
      // البحث المباشر في قاعدة البيانات كـ fallback
      console.log('[BARCODE SCANNER] لم يُعثر على المنتج في الكاش، البحث في قاعدة البيانات...');
      
      const currentOrg = currentOrganizationRef.current;
      console.log('[BARCODE SCANNER] معرف المنظمة:', currentOrg?.id);
      if (currentOrg?.id) {
        try {
          const searchResult = await searchProductByBarcode(currentOrg.id, barcode);
          
          if (searchResult) {
            console.log('[BARCODE SCANNER] تم العثور على المنتج في قاعدة البيانات:', searchResult.name);
            
            // تحويل النتيجة إلى منتج وإضافته للسلة
            const foundProduct = convertSearchResultToProduct(searchResult);
            
            // إضافة المنتج للسلة مباشرة
            setCartItems(prevCart => [...prevCart, { product: foundProduct, quantity: 1 }]);
            toast.success(`تمت إضافة "${foundProduct.name}" إلى السلة`);
            return;
          }
        } catch (error) {
          console.error('[BARCODE SCANNER] خطأ في البحث المباشر:', error);
        }
      }
      
      // عرض الباركودات المتاحة للتشخيص
      console.log('[BARCODE SCANNER] الباركودات المتاحة في المنتجات المحملة:');
      currentProducts.forEach(p => {
        if (p.barcode) {
          console.log(`- ${p.name}: ${p.barcode}`);
        }
        if (p.sku) {
          console.log(`- ${p.name} (SKU): ${p.sku}`);
        }
        // عرض باركودات الألوان والمقاسات أيضاً
        if (p.colors && p.colors.length > 0) {
          p.colors.forEach(color => {
            if (color.barcode) {
              console.log(`- ${p.name} - ${color.name}: ${color.barcode}`);
            }
            if (color.sizes && color.sizes.length > 0) {
              color.sizes.forEach(size => {
                if (size.barcode) {
                  console.log(`- ${p.name} - ${color.name} - ${size.size_name}: ${size.barcode}`);
                }
              });
            }
          });
        }
      });
      
      toast.error(`لم يتم العثور على منتج بالباركود: ${barcode}`);
    }
  };

  // إدراج عناصر الإرجاع
  const addItemToReturnCart = (product: Product) => {
    // في وضع الإرجاع، لا نحتاج للتحقق من المخزون
    const existingItem = returnItems.find(item => 
      item.product.id === product.id && 
      !item.colorId && 
      !item.sizeId
    );
    
    if (existingItem) {
      const updatedReturnCart = returnItems.map(item =>
        item.product.id === product.id && !item.colorId && !item.sizeId 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      );
      setReturnItems(updatedReturnCart);
    } else {
      setReturnItems([...returnItems, { product, quantity: 1 }]);
    }
    
    toast.success(`تم إضافة ${product.name} لسلة الإرجاع`);
  };

  // تحديث كمية عنصر الإرجاع
  const updateReturnItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeReturnItem(index);
      return;
    }
    
    const oldQuantity = returnItems[index].quantity;
    const quantityDifference = quantity - oldQuantity;
    
    const updatedItems = [...returnItems];
    updatedItems[index].quantity = quantity;
    setReturnItems(updatedItems);
    
    // تحديث المخزون في الواجهة حسب الفرق في الكمية
    if (productCatalogUpdateFunction.current && quantityDifference !== 0) {
      productCatalogUpdateFunction.current(returnItems[index].product.id, quantityDifference);
    }
  };

  // إزالة عنصر من سلة الإرجاع
  const removeReturnItem = (index: number) => {
    const removedItem = returnItems[index];
    const updatedItems = returnItems.filter((_, i) => i !== index);
    setReturnItems(updatedItems);
    
    // تحديث المخزون في الواجهة عند حذف منتج من سلة الإرجاع
    if (productCatalogUpdateFunction.current && removedItem) {
      productCatalogUpdateFunction.current(removedItem.product.id, -removedItem.quantity);
    }
  };

  // مسح سلة الإرجاع
  const clearReturnCart = () => {
    setReturnItems([]);
    setReturnNotes('');
  };

  // التبديل بين وضع البيع ووضع الإرجاع
  const toggleReturnMode = () => {
    if (!isReturnMode) {
      // الانتقال لوضع الإرجاع
      setIsReturnMode(true);
      clearCart(); // مسح سلة البيع
      toast.info('تم التبديل إلى وضع الإرجاع');
    } else {
      // العودة لوضع البيع
      setIsReturnMode(false);
      clearReturnCart(); // مسح سلة الإرجاع
      toast.info('تم العودة إلى وضع البيع');
    }
  };

  // معالجة إرجاع العناصر
  const processReturn = async (orderDetails?: Partial<Order>): Promise<{orderId: string, customerOrderNumber: number}> => {
    if (!returnItems.length || !user?.id || !currentOrganization?.id) {
      toast.error('يجب إضافة عناصر للإرجاع');
      throw new Error('No items to return');
    }

    try {
      // حساب المبلغ الإجمالي الأصلي للإرجاع
      const originalAmount = returnItems.reduce((sum, item) => 
        sum + ((item.variantPrice || item.product.price) * item.quantity), 0);
      
      // استخدام المبلغ المعدل من PaymentDialog إذا كان متوفراً، وإلا استخدم المبلغ الأصلي
      const returnAmount = orderDetails?.total || originalAmount;
      
      // إنشاء رقم الإرجاع
      const returnNumber = `RET-DIRECT-${Date.now()}`;
      
      // إنشاء بيانات طلب الإرجاع في قاعدة البيانات
      const returnData = {
        return_number: returnNumber,
        original_order_id: null, // إرجاع مباشر بدون طلبية أصلية
        customer_name: orderDetails?.customer_name || 'زائر',
        return_type: 'direct',
        return_reason: returnReason || 'customer_request',
        return_reason_description: returnNotes || null,
        original_total: originalAmount, // المبلغ الأصلي للمنتجات
        return_amount: returnAmount, // المبلغ المعدل الذي سيُسترد فعلياً
        refund_amount: returnAmount, // نفس مبلغ الإرجاع
        restocking_fee: originalAmount - returnAmount, // الفرق كرسوم أو تخفيض سابق
        status: 'completed', // الإرجاع المباشر يُعتبر مكتمل مباشرة
        refund_method: orderDetails?.paymentMethod || 'cash',
        notes: returnNotes || null,
        requires_manager_approval: false,
        organization_id: currentOrganization.id,
        created_by: user.id
      };

      // إدراج طلب الإرجاع في قاعدة البيانات
      const { data: returnRecord, error: returnError } = await supabase
        .from('returns')
        .insert([returnData])
        .select()
        .single();

      if (returnError) {
        throw new Error(`فشل في إنشاء طلب الإرجاع: ${returnError.message}`);
      }

      console.log('تم إنشاء طلب الإرجاع:', returnRecord);

      // إدراج عناصر الإرجاع
      const returnItemsData = returnItems.map(item => {
        const originalItemPrice = item.variantPrice || item.product.price;
        const totalOriginalPrice = originalItemPrice * item.quantity;
        // حساب نسبة السعر المعدل للعنصر
        const adjustedItemPrice = (returnAmount / originalAmount) * originalItemPrice;
        const adjustedTotalPrice = adjustedItemPrice * item.quantity;
        
        return {
          return_id: returnRecord.id,
          original_order_item_id: null, // إرجاع مباشر بدون عنصر طلبية أصلي
          product_id: item.product.id,
          product_name: item.product.name,
          product_sku: item.product.sku || null,
          original_quantity: item.quantity,
          return_quantity: item.quantity,
          original_unit_price: originalItemPrice, // السعر الأصلي
          return_unit_price: adjustedItemPrice, // السعر المعدل
          total_return_amount: adjustedTotalPrice, // المبلغ الإجمالي المعدل
          // حفظ معلومات المتغيرات في variant_info كـ JSON
          variant_info: {
            color_id: item.colorId || null,
            size_id: item.sizeId || null,
            color_name: item.colorName || null,
            size_name: item.sizeName || null,
            variant_display_name: item.colorName || item.sizeName ? 
              `${item.colorName || ''} ${item.sizeName || ''}`.trim() : null,
            type: 'direct_return'
          },
          condition_status: 'good',
          resellable: true,
          inventory_returned: true,
          inventory_returned_at: new Date().toISOString()
        };
      });

      const { error: itemsError } = await supabase
        .from('return_items')
        .insert(returnItemsData);

      if (itemsError) {
        console.error('خطأ في إدراج عناصر الإرجاع:', itemsError);
        // لا نوقف العملية إذا فشل إدراج العناصر
      }

      // تحديث المخزون للمنتجات المرجعة
      for (const item of returnItems) {
        try {
          // تحديث المخزون الأساسي للمنتج
          const { data: currentProduct } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.product.id)
            .single();

          if (currentProduct) {
            await supabase
              .from('products')
              .update({ 
                stock_quantity: (currentProduct.stock_quantity || 0) + item.quantity 
              })
              .eq('id', item.product.id);
          }

          // تحديث مخزون المتغيرات إذا كانت موجودة
          if (item.colorId && item.sizeId) {
            // تحديث مخزون المقاس
            const { data: currentSize } = await supabase
              .from('product_sizes')
              .select('quantity')
              .eq('color_id', item.colorId)
              .eq('id', item.sizeId)
              .single();

            if (currentSize) {
              await supabase
                .from('product_sizes')
                .update({ 
                  quantity: (currentSize.quantity || 0) + item.quantity 
                })
                .eq('color_id', item.colorId)
                .eq('id', item.sizeId);
            }
          } else if (item.colorId) {
            // تحديث مخزون اللون فقط
            const { data: currentColor } = await supabase
              .from('product_colors')
              .select('quantity')
              .eq('product_id', item.product.id)
              .eq('id', item.colorId)
              .single();

            if (currentColor) {
              await supabase
                .from('product_colors')
                .update({ 
                  quantity: (currentColor.quantity || 0) + item.quantity 
                })
                .eq('product_id', item.product.id)
                .eq('id', item.colorId);
            }
          }
        } catch (stockError) {
          console.error('خطأ في تحديث المخزون:', stockError);
          // لا نوقف العملية في حالة خطأ تحديث المخزون
        }
      }

      toast.success(`تم إنشاء إرجاع مباشر رقم ${returnNumber} بنجاح`);
      clearReturnCart();
      setIsReturnMode(false);
      
      // تحديث البيانات
      if (refreshPOSData) {
        refreshPOSData();
      }
      
      return {
        orderId: returnRecord.id,
        customerOrderNumber: parseInt(returnNumber.replace(/[^\d]/g, '')) || 0
      };
      
    } catch (error) {
      console.error('Error processing return:', error);
      toast.error(`حدث خطأ في معالجة الإرجاع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
      throw error;
    }
  };

  return (
    <Layout>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg">جاري تحميل بيانات نقطة البيع...</p>
          </div>
        </div>
      ) : (
        <div className="mx-auto">
          {/* شريط تنبيه وضع الإرجاع */}
          {isReturnMode && (
            <div className="bg-orange-500/10 dark:bg-orange-500/20 border border-orange-200 dark:border-orange-800 p-4 mb-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500/20 dark:bg-orange-500/30 p-2 rounded-full">
                    <RotateCcw className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-orange-800 dark:text-orange-200">وضع الإرجاع المباشر</h3>
                    <p className="text-orange-700 dark:text-orange-300 text-sm">يمكنك مسح المنتجات لإضافتها إلى سلة الإرجاع وإرجاعها للمخزون</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-orange-500/20 dark:bg-orange-500/30 px-3 py-1 rounded-full text-sm font-medium text-orange-800 dark:text-orange-200">
                    {returnItems.length} عنصر في سلة الإرجاع
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={toggleReturnMode}
                    className="border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                  >
                    العودة للبيع
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center mb-4">
            {/* أزرار خدمات التصليح - تظهر فقط إذا كان التطبيق مفعّل */}
            {isAppEnabled('repair-services') && (
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  asChild
                >
                  <Link to="/repair-services">
                    <Wrench className="h-4 w-4 mr-2" />
                    خدمات التصليح
                  </Link>
                </Button>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                size="sm"
                variant="outline"
                onClick={() => setIsQuickReturnOpen(true)}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                إرجاع سريع
              </Button>
              
              {/* ✅ زر التبديل لوضع الإرجاع */}
              <Button 
                size="sm"
                variant={isReturnMode ? "default" : "outline"}
                onClick={toggleReturnMode}
                className={cn(
                  isReturnMode 
                    ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500" 
                    : "border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                )}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {isReturnMode ? 'العودة للبيع' : 'وضع الإرجاع'}
              </Button>
              
              <Button 
                size="sm"
                variant="outline"
                onClick={() => setIsPOSSettingsOpen(true)}
              >
                <Settings2 className="h-4 w-4 mr-2" />
                الإعدادات
              </Button>
              {/* زر خدمة تصليح جديدة - يظهر فقط إذا كان تطبيق التصليح مفعّل */}
              {isAppEnabled('repair-services') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsRepairDialogOpen(true)}
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  خدمة تصليح جديدة
                </Button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-12 gap-4 h-full">
            {/* عمود المنتجات والاشتراكات */}
            <div className="col-span-12 md:col-span-8 h-full flex flex-col">
              <Tabs 
                defaultValue="products" 
                value={activeView} 
                onValueChange={(value) => setActiveView(value as 'products' | 'subscriptions')}
                className="flex-1 flex flex-col"
                dir="rtl"
              >
                <TabsList className={cn(
                  "mb-4 w-full p-1 rounded-lg border transition-all duration-300",
                  isReturnMode 
                    ? "bg-orange-500/5 dark:bg-orange-500/10 border-orange-200 dark:border-orange-800" 
                    : "bg-muted/50",
                  isAppEnabled('subscription-services') ? "grid grid-cols-2" : "grid grid-cols-1"
                )}>
                  <TabsTrigger 
                    value="products" 
                    className={cn(
                      "flex items-center gap-2 py-3 px-4 transition-all duration-200",
                      "data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50",
                      isReturnMode 
                        ? "data-[state=active]:bg-orange-50 dark:data-[state=active]:bg-orange-900/20 data-[state=active]:border-orange-200 dark:data-[state=active]:border-orange-700" 
                        : "data-[state=active]:bg-background"
                    )}
                  >
                    {isReturnMode ? (
                      <RotateCcw className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    ) : (
                      <ShoppingCart className="h-4 w-4" />
                    )}
                    <span className={cn(
                      "font-medium",
                      isReturnMode && "text-orange-800 dark:text-orange-200"
                    )}>
                      {isReturnMode ? 'منتجات الإرجاع' : 'المنتجات'}
                    </span>
                    {products.length > 0 && (
                      <span className={cn(
                        "ml-auto text-xs px-2 py-0.5 rounded-full",
                        isReturnMode 
                          ? "bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400" 
                          : "bg-primary/10 text-primary"
                      )}>
                        {products.length}
                      </span>
                    )}
                  </TabsTrigger>
                  {/* تبويب خدمات الاشتراك - يظهر فقط إذا كان التطبيق مفعّل */}
                  {isAppEnabled('subscription-services') && (
                    <TabsTrigger 
                      value="subscriptions" 
                      className="flex items-center gap-2 py-3 px-4 transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span className="font-medium">خدمات الاشتراك</span>
                      {subscriptions.length > 0 && (
                        <span className="ml-auto bg-green-500/10 text-green-600 text-xs px-2 py-0.5 rounded-full">
                          {subscriptions.length}
                        </span>
                      )}
                    </TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="products" className="flex-1 flex mt-0 data-[state=active]:block data-[state=inactive]:hidden">
                  {products.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className={cn(
                        "text-center p-6 rounded-lg",
                        isReturnMode 
                          ? "bg-orange-50/30 dark:bg-orange-900/10 border border-orange-200/50 dark:border-orange-800/50" 
                          : "bg-muted/30"
                      )}>
                        {isReturnMode ? (
                          <RotateCcw className="h-12 w-12 mb-3 mx-auto opacity-20 text-orange-500 dark:text-orange-400" />
                        ) : (
                          <ShoppingCart className="h-12 w-12 mb-3 mx-auto opacity-20" />
                        )}
                        <h3 className={cn(
                          "text-xl font-medium mb-2",
                          isReturnMode && "text-orange-800 dark:text-orange-200"
                        )}>
                          {isReturnMode ? 'لا توجد منتجات للإرجاع' : 'لا توجد منتجات'}
                        </h3>
                        <p className={cn(
                          "text-sm",
                          isReturnMode 
                            ? "text-orange-700 dark:text-orange-300" 
                            : "text-muted-foreground"
                        )}>
                          {isReturnMode 
                            ? 'يمكنك مسح باركود المنتجات لإضافتها إلى سلة الإرجاع'
                            : 'لم يتم العثور على أي منتجات في قاعدة البيانات.'
                          }
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ProductCatalogOptimized 
                      onAddToCart={isReturnMode ? addItemToReturnCart : addItemToCart}
                      onStockUpdate={handleStockUpdate}
                      isReturnMode={isReturnMode}
                    />
                  )}
                </TabsContent>
                
                {/* محتوى خدمات الاشتراك - يظهر فقط إذا كان التطبيق مفعّل */}
                {isAppEnabled('subscription-services') && (
                  <TabsContent value="subscriptions" className="flex-1 flex mt-0 data-[state=active]:block data-[state=inactive]:hidden">
                    <SubscriptionCatalog 
                      subscriptions={subscriptions as any}
                      categories={subscriptionCategories.map(cat => ({
                        id: cat.id,
                        name: cat.name,
                        description: '',
                        icon: 'package'
                      }))}
                      onAddToCart={handleAddSubscription}
                    />
                  </TabsContent>
                )}
              </Tabs>
            </div>
            
            {/* عمود السلة - تم تعديله ليكون حجم سلة المشتريات مناسب للمحتوى فقط */}
            <div className="col-span-12 md:col-span-4 h-full">
              <div className="flex flex-col gap-4 sticky top-4 h-[calc(100vh-5rem)] overflow-hidden">
                {/* الإجراءات السريعة - قابلة للطي */}
                <Card className="overflow-hidden transition-all duration-300 flex-shrink-0">
                  <CardHeader 
                    className="p-3 cursor-pointer border-b" 
                    onClick={() => setIsQuickActionsExpanded(!isQuickActionsExpanded)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">الإجراءات السريعة</CardTitle>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => {
                        e.stopPropagation();
                        setIsQuickActionsExpanded(!isQuickActionsExpanded);
                      }}>
                        <svg 
                          width="15" 
                          height="15" 
                          viewBox="0 0 15 15" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                          style={{ 
                            transform: isQuickActionsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s ease'
                          }}
                        >
                          <path d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                        </svg>
                      </Button>
                    </div>
                  </CardHeader>
                  <div 
                    className="overflow-hidden transition-all duration-300"
                    style={{ 
                      maxHeight: isQuickActionsExpanded ? '400px' : '0',
                      opacity: isQuickActionsExpanded ? 1 : 0 
                    }}
                  >
                    <CardContent className="p-0">
                      <QuickActions
                        onBarcodeScanned={handleBarcodeScanned}
                        recentOrders={recentOrders}
                        onOpenOrder={handleOpenOrder}
                        onQuickAddProduct={addItemToCart}
                        favoriteProducts={favoriteProducts}
                      />
                    </CardContent>
                  </div>
                </Card>

                {/* سلة المشتريات - المكون الرئيسي - تغيير طريقة العرض لضمان التمرير الصحيح */}
                <div className="flex-1 overflow-hidden flex flex-col border bg-card/30 rounded-lg">
                  <Cart 
                    cartItems={isReturnMode ? returnItems : cartItems}
                    customers={(users || []).filter(u => {
                      // Si el usuario no tiene organization_id, inclúyelo de todas formas (compatibilidad)
                      if (!u.organization_id) {
                        return u.role === 'customer';
                      }
                      
                      // Comprobar el ID de la organización actual
                      const currentOrgId = user?.user_metadata?.organization_id || localStorage.getItem('bazaar_organization_id');
                      
                      return u.role === 'customer' && u.organization_id === currentOrgId;
                    })}
                    updateItemQuantity={isReturnMode ? updateReturnItemQuantity : updateItemQuantity}
                    removeItemFromCart={isReturnMode ? removeReturnItem : removeItemFromCart}
                    clearCart={isReturnMode ? clearReturnCart : clearCart}
                    submitOrder={isReturnMode ? processReturn : submitOrder}
                    currentUser={user ? {
                      id: user.id,
                      name: user.user_metadata?.name || 'User',
                      email: user.email || '',
                      role: 'employee',
                      isActive: true,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      organization_id: user.user_metadata?.organization_id || localStorage.getItem('bazaar_organization_id') || ''
                    } : null}
                    selectedServices={selectedServices}
                    removeService={removeServiceFromCart}
                    updateServicePrice={updateServicePrice}
                    selectedSubscriptions={selectedSubscriptions}
                    removeSubscription={removeSubscriptionFromCart}
                    updateSubscriptionPrice={updateSubscriptionPrice}
                    isReturnMode={isReturnMode}
                    returnReason={returnReason}
                    setReturnReason={setReturnReason}
                    returnNotes={returnNotes}
                    setReturnNotes={setReturnNotes}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة ختيار المتغيرات */}
      <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
        <DialogContent 
          className="sm:max-w-2xl max-h-[85vh] overflow-y-auto"
          aria-describedby={undefined}
        >
          <DialogHeader className="text-center pb-2">
            <DialogTitle className="text-xl font-bold flex items-center justify-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              اختيار متغيرات المنتج
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              اختر اللون والمقاس المناسب لإضافة المنتج إلى السلة
            </DialogDescription>
          </DialogHeader>
          
          {selectedProductForVariant && (
            <ProductVariantSelector
              product={selectedProductForVariant}
              onAddToCart={(product, colorId, sizeId, variantPrice, colorName, colorCode, sizeName, variantImage) => {
                addVariantToCart(product, colorId, sizeId, variantPrice, colorName, colorCode, sizeName, variantImage);
              }}
              onCancel={() => {
                setIsVariantDialogOpen(false);
                setSelectedProductForVariant(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* نافذة إعدادات نقطة البيع */}
      <POSSettings
        isOpen={isPOSSettingsOpen}
        onOpenChange={setIsPOSSettingsOpen}
      />
      
      {/* نافذة خدمة التصليح - تظهر فقط إذا كان التطبيق مفعّل */}
      {isAppEnabled('repair-services') && (
        <RepairServiceDialog
          isOpen={isRepairDialogOpen}
          onClose={() => setIsRepairDialogOpen(false)}
          onSuccess={handleRepairServiceSuccess}
        />
      )}

      {/* نافذة الإرجاع السريع */}
      <QuickReturnDialog
        isOpen={isQuickReturnOpen}
        onOpenChange={setIsQuickReturnOpen}
        onReturnCreated={() => {
          // يمكن إضافة أي إجراءات إضافية هنا عند إنشاء الإرجاع
          toast.success('تم إنشاء طلب الإرجاع بنجاح');
        }}
      />

      {/* نافذة طباعة وصل التصليح */}
      {selectedRepairOrder && (
        <Dialog open={isRepairPrintDialogOpen} onOpenChange={setIsRepairPrintDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                طباعة وصل التصليح
              </DialogTitle>
              <DialogDescription>
                رقم الطلبية: {selectedRepairOrder.order_number || selectedRepairOrder.id.slice(0, 8)} | {selectedRepairOrder.customer_name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* معاينة الوصل */}
                <div className="order-2 lg:order-1">
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <span>👁️</span>
                    معاينة الوصل
                  </h3>
                  <div className="border rounded-md p-2 bg-gray-50 max-h-96 overflow-y-auto">
                    <div className="transform scale-90 origin-top-right flex justify-center">
                      <RepairOrderPrint order={selectedRepairOrder} queuePosition={repairQueuePosition} />
                    </div>
                  </div>
                </div>

                {/* معلومات الطباعة */}
                <div className="order-1 lg:order-2">
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <span>📋</span>
                    محتويات الوصل
                  </h3>
                  <div className="space-y-3">
                    {/* إيصال العميل */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h4 className="font-bold text-sm text-blue-800 mb-2 flex items-center gap-2">
                        <span>🧾</span>
                        إيصال العميل
                      </h4>
                      <ul className="text-xs space-y-1 text-blue-700 mr-4">
                        <li>• معلومات المتجر والعميل</li>
                        <li>• تفاصيل العطل والدفع</li>
                        <li>• رمز QR للتتبع</li>
                        <li>• شروط الخدمة</li>
                      </ul>
                    </div>

                    {/* لصقة الجهاز */}
                    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                      <h4 className="font-bold text-sm text-yellow-800 mb-2 flex items-center gap-2">
                        <span>🏷️</span>
                        لصقة الجهاز
                      </h4>
                      <ul className="text-xs space-y-1 text-yellow-700 mr-4">
                        <li>• رقم الطلبية بارز</li>
                        <li>• معلومات العميل المختصرة</li>
                        <li>• QR للتتبع والإنهاء</li>
                        <li>• مساحة لملاحظات الفني</li>
                        <li className="font-bold">• رقم الترتيب: {repairQueuePosition || 'غير محدد'}</li>
                      </ul>
                    </div>

                    {/* نصائح الطباعة */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <h4 className="font-bold text-sm text-green-800 mb-2 flex items-center gap-2">
                        <span>💡</span>
                        نصائح الطباعة
                      </h4>
                      <ul className="text-xs space-y-1 text-green-700 mr-4">
                        <li>• استخدم ورق حراري عرض 80mm</li>
                        <li>• تأكد من وضوح رموز QR</li>
                        <li>• اقطع عند الخط المتقطع</li>
                        <li>• الصق الجزء السفلي على الجهاز</li>
                      </ul>
                    </div>

                    {/* إحصائيات سريعة */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <h4 className="font-bold text-sm text-gray-800 mb-2 flex items-center gap-2">
                        <span>📊</span>
                        ملخص الطلبية
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">الحالة:</span>
                          <span className="font-bold mr-1">{selectedRepairOrder.status}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">التاريخ:</span>
                          <span className="font-bold mr-1">{new Date(selectedRepairOrder.created_at).toLocaleDateString('ar-EG')}</span>
                        </div>
                        {!selectedRepairOrder.price_to_be_determined_later && (
                          <>
                            <div>
                              <span className="text-gray-600">المبلغ:</span>
                              <span className="font-bold mr-1">{selectedRepairOrder.total_price.toLocaleString()} دج</span>
                            </div>
                            <div>
                              <span className="text-gray-600">المدفوع:</span>
                              <span className="font-bold mr-1 text-green-600">{selectedRepairOrder.paid_amount.toLocaleString()} دج</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => setIsRepairPrintDialogOpen(false)}
              >
                إغلاق
              </Button>
              <div className="flex gap-2">
                <RepairOrderPrint order={selectedRepairOrder} queuePosition={repairQueuePosition} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
};

export default POS;
