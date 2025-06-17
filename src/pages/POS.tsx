import { useState, useEffect } from 'react';
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
import Cart from '@/components/pos/Cart';
import QuickActions from '@/components/pos/QuickActions';
import SubscriptionCatalog from '@/components/pos/SubscriptionCatalog';

import PrintReceipt from '@/components/pos/PrintReceipt';
import ProductVariantSelector from '@/components/pos/ProductVariantSelector';
import POSSettings from '@/components/pos/settings/POSSettings';
import RepairServiceDialog from '@/components/repair/RepairServiceDialog';
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
  
  // استخدام POSDataContext المحسن لمنع الطلبات المكررة
  const { 
    products, 
    subscriptions, 
    categories: subscriptionCategories, 
    posSettings,
    organizationApps,
    isLoading: isPOSDataLoading,
    errors,
    refreshAll: refreshPOSData
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

  // حالة نافذة الإرجاع السريع
  const [isQuickReturnOpen, setIsQuickReturnOpen] = useState(false);

  // ✅ لا حاجة لجلب البيانات يدوياً - POSDataContext يتولى كل شيء
  // جلب البيانات يتم تلقائياً عبر POSDataContext مع منع الطلبات المكررة
  
  console.log('🎯 POS Component - Data Status:', {
    productsCount: products?.length || 0,
    subscriptionsCount: subscriptions?.length || 0,
    categoriesCount: subscriptionCategories?.length || 0,
    hasPOSSettings: !!posSettings,
    isLoading: isPOSDataLoading,
    errors
  });

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
        .filter((p): p is Product => !!p)
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
    
    // إذا لم يكن للمنتج متغيرات، أضفه مباشرة
    const existingItem = cartItems.find(item => item.product.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        toast.error(`لا يمكن إضافة المزيد من "${product.name}". الكمية المتاحة: ${product.stock_quantity}`);
        return;
      }
      
      const updatedCart = cartItems.map(item =>
        item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
      setCartItems(updatedCart);
    } else {
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
    
    // إزالة الأحرف العربية والرموز الخاصة، والاحتفاظ بالأرقام والحروف الانجليزية فقط
    let cleaned = input.replace(/[^\w\d-]/g, '');
    
    // إذا كان النص فارغ بعد التنظيف، جرب إزالة كل شيء عدا الأرقام
    if (!cleaned || cleaned.length === 0) {
      cleaned = input.replace(/[^\d]/g, '');
    }
    
    // إزالة المسافات الإضافية
    cleaned = cleaned.trim();
    return cleaned;
  };

  // البحث عن منتج بواسطة الباركود أو SKU
  const handleBarcodeScanned = (rawBarcode: string) => {
    // تنظيف البيانات الواردة من قارئ الباركود
    const barcode = cleanBarcodeInput(rawBarcode);
    
    // التحقق من أن الباركود ليس فارغ بعد التنظيف
    if (!barcode || barcode.length === 0) {
      toast.error('الباركود المُدخل غير صالح. تأكد من إعدادات قارئ الباركود.');
      return;
    }
    
    // البحث في المنتجات الأساسية (barcode أو sku)
    const product = products.find(p => p.barcode === barcode || p.sku === barcode);
    if (product) {
      addItemToCart(product);
      return;
    }
    
    // البحث في متغيرات المنتجات (ألوان ومقاسات)
    let foundVariant = false;
    
    for (const product of products) {
      // البحث في الألوان
      if (product.colors && product.colors.length > 0) {
        const color = product.colors.find(c => c.barcode === barcode);
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
              const size = color.sizes.find(s => s.barcode === barcode);
              if (size) {
                                  addVariantToCart(
                    product,
                    color.id,
                    size.id,
                    size.price,
                    color.name,
                    color.color_code,
                    size.name,
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
      toast.error(`لم يتم العثور على منتج بالباركود: ${barcode}`);
    }
  };

  // Eliminar producto del carrito
  const removeItemFromCart = (index: number) => {
    const updatedCart = [...cartItems];
    updatedCart.splice(index, 1);
    setCartItems(updatedCart);
  };

  // Actualizar cantidad del producto en carrito
  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    
    const item = cartItems[index];
    
    // حساب الكمية المتاحة بناءً على المتغير المحدد
    let availableQuantity = item.product.stock_quantity;
    
    if (item.sizeId) {
      // البحث عن المقاس المحدد
      const color = item.product.colors?.find(c => c.id === item.colorId);
      const size = color?.sizes?.find(s => s.id === item.sizeId);
      if (size) {
        availableQuantity = size.quantity;
      }
    } else if (item.colorId) {
      // البحث عن اللون المحدد
      const color = item.product.colors?.find(c => c.id === item.colorId);
      if (color) {
        availableQuantity = color.quantity;
      }
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
        updatedAt: new Date()
      };

      // حفظ الطلب محلياً للمرجع
      setCurrentOrder(newOrder);
      
      // تحسين #8: إنشاء الطلب في قاعدة البيانات
      const createdOrder = await addOrder(newOrder);
      
      // التحقق من نجاح إنشاء الطلب
      if (!createdOrder) {
        throw new Error('فشل في إنشاء الطلب');
      }
      
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
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      
      // إذا مرت أكثر من 200ms منذ آخر مفتاح، ابدأ باركود جديد
      if (timeDiff > 200) {
        setBarcodeBuffer('');
      }
      
      // تجاهل المفاتيح الخاصة والتركيز على الحقول
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }
      
      // تجاهل إذا كان المستخدم يكتب في حقل إدخال
      const target = event.target as HTMLElement;
      if (target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.contentEditable === 'true' ||
        target.closest('[contenteditable="true"]') ||
        target.closest('input') ||
        target.closest('textarea')
      )) {
        return;
      }
      
      setLastKeyTime(currentTime);
      
      // إذا كان Enter، قم بمعالجة الباركود المتراكم
      if (event.key === 'Enter') {
        event.preventDefault();
        if (barcodeBuffer.length > 0) {
          const barcode = barcodeBuffer.replace(/[^\w\d-]/g, '').trim();
          if (barcode) {
            const product = products.find(p => p.barcode === barcode || p.sku === barcode);
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
              // البحث في متغيرات المنتجات
              let foundVariant = false;
              for (const prod of products) {
                if (prod.colors && prod.colors.length > 0) {
                  const color = prod.colors.find(c => c.barcode === barcode);
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
                }
              }
              
              if (!foundVariant) {
                toast.error(`لم يتم العثور على منتج بالباركود: ${barcode}`);
              }
            }
          }
          setBarcodeBuffer('');
        }
        return;
      }
      
      // إضافة الحرف إلى buffer إذا كان صالحاً
      if (event.key.length === 1) {
        setBarcodeBuffer(prev => prev + event.key);
      }
    };

    // إضافة مستمع الأحداث
    document.addEventListener('keypress', handleKeyPress);
    
    // تنظيف buffer بعد فترة من عدم النشاط
    const clearBufferTimeout = setTimeout(() => {
      setBarcodeBuffer('');
    }, 500);

    return () => {
      document.removeEventListener('keypress', handleKeyPress);
      clearTimeout(clearBufferTimeout);
    };
  }, [barcodeBuffer, lastKeyTime, products]);

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
                  "mb-4 w-full bg-muted/50 p-1 rounded-lg border",
                  isAppEnabled('subscription-services') ? "grid grid-cols-2" : "grid grid-cols-1"
                )}>
                  <TabsTrigger 
                    value="products" 
                    className="flex items-center gap-2 py-3 px-4 transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span className="font-medium">المنتجات</span>
                    {products.length > 0 && (
                      <span className="ml-auto bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
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
                      <div className="text-center p-6 bg-muted/30 rounded-lg">
                        <ShoppingCart className="h-12 w-12 mb-3 mx-auto opacity-20" />
                        <h3 className="text-xl font-medium mb-2">لا توجد منتجات</h3>
                        <p className="text-sm text-muted-foreground">لم يتم العثور على أي منتجات في قاعدة البيانات.</p>
                      </div>
                    </div>
                  ) : (
                    <ProductCatalog 
                      products={products}
                      onAddToCart={addItemToCart}
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
                    cartItems={cartItems}
                    customers={(users || []).filter(u => {
                      // Si el usuario no tiene organization_id, inclúyelo de todas formas (compatibilidad)
                      if (!u.organization_id) {
                        return u.role === 'customer';
                      }
                      
                      // Comprobar el ID de la organización actual
                      const currentOrgId = user?.user_metadata?.organization_id || localStorage.getItem('bazaar_organization_id');
                      
                      return u.role === 'customer' && u.organization_id === currentOrgId;
                    })}
                    updateItemQuantity={updateItemQuantity}
                    removeItemFromCart={removeItemFromCart}
                    clearCart={clearCart}
                    submitOrder={submitOrder}
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
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة اختيار المتغيرات */}
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
          onSuccess={(orderId) => {
            setIsRepairDialogOpen(false);
            toast.success('تم إنشاء طلبية تصليح جديدة بنجاح');
          }}
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
    </Layout>
  );
};

export default POS;
