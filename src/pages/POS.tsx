import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from "sonner";
import { Link } from 'react-router-dom';
import { Product, Order, User as AppUser, Service, OrderItem, ServiceBooking } from '@/types';
import { useShop } from '@/context/ShopContext';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import ProductCatalog from '@/components/pos/ProductCatalog';
import Cart from '@/components/pos/Cart';
import QuickActions from '@/components/pos/QuickActions';
import ServiceManager from '@/components/pos/ServiceManager';
import PrintReceipt from '@/components/pos/PrintReceipt';
import ProductVariantSelector from '@/components/pos/ProductVariantSelector';
import POSSettings from '@/components/pos/settings/POSSettings';
import RepairServiceDialog from '@/components/repair/RepairServiceDialog';
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
import { ShoppingCart, Wrench, Settings2 } from 'lucide-react';
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
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedServices, setSelectedServices] = useState<(Service & { 
    scheduledDate?: Date; 
    notes?: string; 
    customerId?: string;
    public_tracking_code?: string;
    repair_location_id?: string;
  })[]>([]);
  const [activeView, setActiveView] = useState<'products' | 'services'>('products');
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
          // استدعاء مباشر لتجنب مشكلة التبعية
                     const barcode = barcodeBuffer.replace(/[^\w\d-]/g, '').trim();
           if (barcode) {
             const product = shopProducts.find(p => p.barcode === barcode || p.sku === barcode);
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
                     // صوت النجاح (اختياري)
                     try {
                       const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DvNBkAl9fy' );
                       audio.volume = 0.3;
                       audio.play().catch(() => {}); // تجاهل أخطاء الصوت
                     } catch (e) {}
                     return [...prevCart, { product, quantity: 1 }];
                   }
                 });
               }
             } else {
               // البحث في متغيرات المنتجات
               let foundVariant = false;
               for (const prod of shopProducts) {
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
  }, [barcodeBuffer, lastKeyTime]);

  // تعديل: مباشرة تعيين المنتجات من متجر التطبيق
  useEffect(() => {
    if (shopProducts.length > 0) {
      
      setProducts(shopProducts);
    }
  }, [shopProducts]);

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
    // تحقق خاص لمنتج "أسيمة قنطري"
    if (product.name === 'أسيمة قنطري') {
      
    }
    
    // طباعة تشخيصية لبيانات المنتج

    // تحقق محسن من متغيرات المنتج
    if ((product.has_variants || product.use_sizes) || (product.colors && product.colors.length > 0)) {
      
      // فتح نافذة اختيار المتغيرات
      setSelectedProductForVariant(product);
      setIsVariantDialogOpen(true);
      return;
    }
    
    // المنتج بدون متغيرات، تابع كالمعتاد
    if (product.stock_quantity <= 0) {
      toast.error(`المنتج "${product.name}" غير متوفر في المخزون`);
      return;
    }
    
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

  // Crear orden
  const submitOrder = async (orderDetails: Partial<Order>) => {
    if (cartItems.length === 0 && selectedServices.length === 0) {
      toast.error("لا يمكن إنشاء طلب فارغ");
      return;
    }

    try {
      // Get wholesale prices from Cart component
      const cartItemsWithWholesale = await Promise.all(
        cartItems.map(async (item) => {
          const wholesalePrice = await getProductPriceForQuantity(item.product.id, item.quantity);
          const isWholesale = wholesalePrice !== null && wholesalePrice < item.product.price;
          
          return {
            ...item,
            wholesalePrice: wholesalePrice !== null ? wholesalePrice : (item.variantPrice || item.product.price),
            isWholesale
          };
        })
      );

      // Crear items de productos - تحسين إنشاء معرفات عناصر الطلب
      const orderItems: OrderItem[] = cartItemsWithWholesale.map(item => {
        const itemId = uuidv4();
        const timestamp = new Date().getTime();
        const randomSuffix = Math.floor(Math.random() * 1000);
        
        // استخدام سعر المتغير إذا كان موجوداً، وإلا استخدام سعر الجملة أو سعر المنتج العادي
        const unitPrice = item.isWholesale 
          ? item.wholesalePrice 
          : (item.variantPrice || item.product.price);
        
        // اسم المنتج مع إضافة معلومات اللون والمقاس
        const productName = item.colorName || item.sizeName
          ? `${item.product.name} ${item.colorName ? `- ${item.colorName}` : ''}${item.sizeName ? ` - ${item.sizeName}` : ''}`
          : item.product.name;
        
        return {
          id: itemId, // استخدام UUID صالح دائماً
          productId: item.product.id,
          productName: productName,
          quantity: item.quantity,
          price: unitPrice, // استخدام price بدلاً من unitPrice
          unitPrice: unitPrice,
          totalPrice: unitPrice * item.quantity,
          isDigital: item.product.isDigital,
          // Store wholesale information
          isWholesale: item.isWholesale,
          originalPrice: item.product.price,
          // إضافة حقول إضافية تحتاجها قاعدة البيانات
          slug: `item-${timestamp}-${randomSuffix}`,
          name: item.product.name,
          // إضافة معلومات المتغيرات (الألوان والمقاسات)
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
      
      // Crear reservas de servicios
      const serviceBookings: ServiceBooking[] = selectedServices.map((service, index) => {
        // إنشاء معرف UUID صالح
        const serviceId = uuidv4();
        
        // إنشاء كود تتبع عام ثابت لكل خدمة (للتأكد من توافقه مع قاعدة البيانات)
        const orderPrefix = Math.floor(1000 + Math.random() * 9000).toString();
        const serviceIndex = (1001 + index).toString();
        const publicTrackingCode = `SRV-${orderPrefix}-${serviceIndex}`;
        
        // تحديث الخدمة المحلية بكود التتبع الجديد لاستخدامه عند الطباعة
        service.public_tracking_code = publicTrackingCode;
        
        return {
          id: serviceId, // استخدام UUID بدلاً من كود التتبع كمعرف
          serviceId: service.id,
          serviceName: service.name,
          price: service.price,
          scheduledDate: service.scheduledDate,
          notes: service.notes,
          customerId: service.customerId || orderDetails.customerId,
          customer_name: service.customerId 
            ? users.find(u => u.id === service.customerId)?.name || "زائر"
            : (orderDetails.customerId
                ? users.find(u => u.id === orderDetails.customerId)?.name || "زائر"
                : "زائر"),
          status: 'pending',
          assignedTo: user?.id || "",
          public_tracking_code: publicTrackingCode, // إضافة كود التتبع العام
          repair_location_id: service.repair_location_id // إضافة معرف مكان التصليح
        };
      });
      
      // Calcular subtotal de productos
      const productsSubtotal = cartItemsWithWholesale.reduce(
        (sum, item) => sum + ((item.variantPrice || item.wholesalePrice) * item.quantity), 
        0
      );
      
      // Calcular subtotal de servicios
      const servicesSubtotal = selectedServices.reduce(
        (sum, service) => sum + service.price, 
        0
      );
      
      // Subtotal total
      const subtotal = productsSubtotal + servicesSubtotal;
      
      // Tax calculation
      const taxRate = 0; // إزالة الضريبة (تم تغييرها من 15% إلى 0%)
      const discountAmount = orderDetails.discount || 0;
      const taxableAmount = subtotal - discountAmount;
      const tax = taxableAmount * taxRate;
      
      // Total
      const total = taxableAmount + tax;
      
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

      // حفظ الطلب للاستخدام لاحقاً
      setCurrentOrder(newOrder);
      
      // هام: addOrder تقوم بتحديث المخزون تلقائيًا - أي وظيفة إضافية لتحديث المخزون ستؤدي إلى تحديثه مرتين
      
      await addOrder(newOrder);
      
      toast.success("تم إنشاء الطلب بنجاح");
      
      // ملاحظة: تم إلغاء فتح نافذة الطباعة هنا لمنع ظهور نافذتين
      // يتم فتح نافذة الطباعة في مكون Cart.tsx فقط
      
    } catch (error) {
      toast.error("حدث خطأ أثناء إنشاء الطلب");
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
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant={activeView === 'products' ? 'default' : 'outline'} 
                onClick={() => setActiveView('products')}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                المنتجات
              </Button>
              <Button 
                size="sm" 
                variant={activeView === 'services' ? 'default' : 'outline'} 
                onClick={() => setActiveView('services')}
              >
                <Wrench className="h-4 w-4 mr-2" />
                الخدمات
              </Button>
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
            
            <div className="flex gap-2">
              <Button 
                size="sm"
                variant="outline"
                onClick={() => setIsPOSSettingsOpen(true)}
              >
                <Settings2 className="h-4 w-4 mr-2" />
                الإعدادات
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsRepairDialogOpen(true)}
              >
                <Wrench className="h-4 w-4 mr-2" />
                خدمة تصليح جديدة
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-12 gap-4 h-full">
            {/* عمود المنتجات والخدمات */}
            <div className="col-span-12 md:col-span-8 h-full flex flex-col">
              <Tabs 
                defaultValue="products" 
                value={activeView} 
                onValueChange={(value) => setActiveView(value as 'products' | 'services')}
                className="flex-1 flex flex-col"
                dir="rtl"
              >
                <TabsList className="mb-4 w-full grid grid-cols-2">
                  <TabsTrigger value="products" className="flex items-center gap-2 py-3">
                    <ShoppingCart className="h-4 w-4" />
                    <span>المنتجات</span>
                  </TabsTrigger>
                  <TabsTrigger value="services" className="flex items-center gap-2 py-3">
                    <Wrench className="h-4 w-4" />
                    <span>الخدمات</span>
                  </TabsTrigger>
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
                
                <TabsContent value="services" className="flex-1 flex mt-0 data-[state=active]:block data-[state=inactive]:hidden">
                  {services.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center p-6 bg-muted/30 rounded-lg">
                        <Wrench className="h-12 w-12 mb-3 mx-auto opacity-20" />
                        <h3 className="text-xl font-medium mb-2">لا توجد خدمات</h3>
                        <p className="text-sm text-muted-foreground">لم يتم العثور على أي خدمات في قاعدة البيانات.</p>
                      </div>
                    </div>
                  ) : (
                    <ServiceManager
                      services={services}
                      customers={users.filter(u => u.role === 'customer')}
                      onAddService={handleAddService}
                      organizationId={user?.user_metadata?.organization_id || localStorage.getItem('bazaar_organization_id') || ''}
                    />
                  )}
                </TabsContent>
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
          className="sm:max-w-md"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>اختيار متغيرات المنتج</DialogTitle>
            <DialogDescription>
              اختر اللون والمقاس المناسب
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
      
      {/* نافذة خدمة التصليح */}
      <RepairServiceDialog
        isOpen={isRepairDialogOpen}
        onClose={() => setIsRepairDialogOpen(false)}
        onSuccess={(orderId) => {
          setIsRepairDialogOpen(false);
          toast.success('تم إنشاء طلبية تصليح جديدة بنجاح');
        }}
      />
    </Layout>
  );
};

export default POS;
