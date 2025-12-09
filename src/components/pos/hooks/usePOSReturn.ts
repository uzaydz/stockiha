import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { Product, Order, User as AppUser } from '@/types';
import { createLocalProductReturn } from '@/api/localProductReturnService';
import { v4 as uuidv4 } from 'uuid';
import type { SaleType, SellingUnit } from '@/lib/pricing/wholesalePricing';
import { usePOSMode } from '@/context/POSModeContext';

// ⚡ واجهة CartItem الموحدة - تدعم جميع أنواع البيع مثل سلة البيع العادية
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
  customPrice?: number;
  // ⚡ حقول أنواع البيع المتقدمة
  saleType?: SaleType;
  isWholesale?: boolean;
  originalPrice?: number;
  sellingUnit?: SellingUnit;
  weight?: number;
  weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
  pricePerWeightUnit?: number;
  boxCount?: number;
  unitsPerBox?: number;
  boxPrice?: number;
  length?: number;
  pricePerMeter?: number;
  // ⚡ حقول الدفعات والأرقام التسلسلية
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  serialNumbers?: string[];
}

interface UsePOSReturnOptions {
  currentUser?: AppUser | null;
  currentOrganizationId?: string;
  updateProductStockInCache: (
    productId: string,
    colorId: string | null,
    sizeId: string | null,
    quantityChange: number,
    // ⚡ معامل جديد لتحديد نوع البيع (اختياري للتوافق مع الاستدعاءات القديمة)
    sellingUnit?: 'piece' | 'weight' | 'meter' | 'box'
  ) => void;
  refreshPOSData?: () => Promise<void>;
}

export const usePOSReturn = ({
  currentUser,
  currentOrganizationId,
  updateProductStockInCache,
  refreshPOSData
}: UsePOSReturnOptions) => {

  const initRef = useRef(false);

  if (!initRef.current && process.env.NODE_ENV === 'development') {
    initRef.current = true;
  }

  // ⚡ استخدام POSModeContext للتزامن مع التايتل بار
  const { mode, setMode, toggleReturnMode: contextToggleReturn } = usePOSMode();

  // ⚡ حالة الوضع مرتبطة بالـ Context
  const isReturnMode = mode === 'return';

  const [returnItems, setReturnItems] = useState<CartItem[]>(() => {
    // 🔧 استرجاع returnItems من localStorage لمنع فقدانها عند re-mount
    try {
      const saved = localStorage.getItem('pos_return_items');
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed;
    } catch (error) {
      return [];
    }
  });
  const [returnReason, setReturnReason] = useState('customer_request');
  const [returnNotes, setReturnNotes] = useState('');

  // 🔍 تتبع تغيرات returnItems لمعرفة سبب عدم التحديث + حفظ في localStorage
  useEffect(() => {
    
    // حفظ في localStorage
    try {
      localStorage.setItem('pos_return_items', JSON.stringify(returnItems));
    } catch (error) {
    }
  }, [returnItems]);

  // ⚡ CSS class يتم إدارته من POSModeContext - لا حاجة لإدارته هنا
  // مسح السلة عند الخروج من وضع الإرجاع
  useEffect(() => {
    if (mode !== 'return' && returnItems.length > 0) {
      setReturnItems([]);
      setReturnNotes('');
      try {
        localStorage.removeItem('pos_return_items');
      } catch (error) {
      }
      console.log('[usePOSReturn] Mode changed to', mode, '- clearing return cart');
    }
  }, [mode]);

  // ⚡ إضافة منتج لسلة الإرجاع - مع دعم كامل لأنواع البيع (متر/وزن/علبة/قطعة)
  const addItemToReturnCart = useCallback((product: Product) => {
    // ⚡ قراءة نوع البيع من المنتج - مع دعم كامل لـ SQLite (0/1 و true/false و '0'/'1')
    const getSellingUnit = (): SellingUnit => {
      // أولاً: تحقق من selling_unit_type أو sellingUnit مباشرة
      if ((product as any).selling_unit_type) return (product as any).selling_unit_type;
      if ((product as any).sellingUnit) return (product as any).sellingUnit;
      // ثانياً: تحقق من الخصائص البديلة
      const sellByMeter = (product as any).sell_by_meter;
      const sellByWeight = (product as any).sell_by_weight;
      const sellByBox = (product as any).sell_by_box;
      if (sellByMeter === true || sellByMeter === 1 || sellByMeter === '1') return 'meter';
      if (sellByWeight === true || sellByWeight === 1 || sellByWeight === '1') return 'weight';
      if (sellByBox === true || sellByBox === 1 || sellByBox === '1') return 'box';
      return 'piece';
    };
    const productSellingUnit = getSellingUnit();

    console.log('[addItemToReturnCart] 📦 Adding product:', {
      productName: product.name,
      productSellingUnit,
      selling_unit_type: (product as any).selling_unit_type,
      sellingUnit: (product as any).sellingUnit,
      sell_by_meter: (product as any).sell_by_meter,
      sell_by_weight: (product as any).sell_by_weight,
      sell_by_box: (product as any).sell_by_box
    });

    // استخدام functional update للحصول على أحدث قيمة
    setReturnItems(currentItems => {
      const existingItem = currentItems.find(item =>
        item.product.id === product.id &&
        !item.colorId &&
        !item.sizeId &&
        (item.sellingUnit || 'piece') === productSellingUnit
      );

      if (existingItem) {
        // ⚡ تحديث الكمية حسب نوع البيع
        const updatedItems = currentItems.map(item => {
          if (item.product.id === product.id && !item.colorId && !item.sizeId) {
            switch (productSellingUnit) {
              case 'weight':
                return { ...item, weight: (item.weight || 0) + 1 };
              case 'box':
                return { ...item, boxCount: (item.boxCount || 0) + 1 };
              case 'meter':
                return { ...item, length: (item.length || 0) + 1 };
              default:
                return { ...item, quantity: item.quantity + 1 };
            }
          }
          return item;
        });
        return updatedItems;
      } else {
        // ⚡ إضافة عنصر جديد مع بيانات نوع البيع من المنتج
        const newItem: CartItem = {
          product,
          quantity: productSellingUnit === 'piece' ? 1 : 0,
          sellingUnit: productSellingUnit as SellingUnit,
          // بيانات الوزن
          weight: productSellingUnit === 'weight' ? 1 : undefined,
          weightUnit: (product as any).weight_unit || 'kg',
          pricePerWeightUnit: (product as any).price_per_weight_unit,
          // بيانات العلبة
          boxCount: productSellingUnit === 'box' ? 1 : undefined,
          unitsPerBox: (product as any).units_per_box,
          boxPrice: (product as any).box_price,
          // بيانات المتر
          length: productSellingUnit === 'meter' ? 1 : undefined,
          pricePerMeter: (product as any).price_per_meter,
          // السعر الأساسي
          variantPrice: product.price
        };
        return [...currentItems, newItem];
      }
    });

    // لا نحدث المخزون هنا - سيتم التحديث فقط عند إنهاء الإرجاع
    toast.success(`تم إضافة ${product.name} لسلة الإرجاع`);
  }, []);

  // ⚡ إضافة منتج مع متغيرات لسلة الإرجاع - مع دعم كامل لأنواع البيع
  const addVariantToReturnCart = useCallback((
    product: Product,
    colorId?: string,
    sizeId?: string,
    variantPrice?: number,
    colorName?: string,
    colorCode?: string,
    sizeName?: string,
    variantImage?: string,
    // ⚡ معاملات أنواع البيع المتقدمة
    sellingUnit?: SellingUnit,
    weight?: number,
    weightUnit?: 'kg' | 'g' | 'lb' | 'oz',
    boxCount?: number,
    length?: number,
    saleType?: SaleType
  ) => {
    const variantName = `${product.name}${colorName ? ` - ${colorName}` : ''}${sizeName ? ` - ${sizeName}` : ''}`;

    // ⚡ تحديد نوع البيع من المنتج إذا لم يتم تمريره - مع دعم SQLite (0/1)
    const getSellingUnit = (): SellingUnit => {
      if (sellingUnit) return sellingUnit;
      if ((product as any).selling_unit_type) return (product as any).selling_unit_type;
      if ((product as any).sellingUnit) return (product as any).sellingUnit;
      const sellByMeter = (product as any).sell_by_meter;
      const sellByWeight = (product as any).sell_by_weight;
      const sellByBox = (product as any).sell_by_box;
      if (sellByMeter === true || sellByMeter === 1 || sellByMeter === '1') return 'meter';
      if (sellByWeight === true || sellByWeight === 1 || sellByWeight === '1') return 'weight';
      if (sellByBox === true || sellByBox === 1 || sellByBox === '1') return 'box';
      return 'piece';
    };
    const productSellingUnit = getSellingUnit();

    console.log('[addVariantToReturnCart] 📦 Adding variant:', {
      productName: product.name,
      productSellingUnit,
      sellingUnitParam: sellingUnit,
      productSellByMeter: (product as any).sell_by_meter,
      productSellByWeight: (product as any).sell_by_weight,
      productSellByBox: (product as any).sell_by_box
    });

    // استخدام functional update لتجنب stale closure
    setReturnItems(currentItems => {
      // البحث عن نفس المتغير في سلة الإرجاع
      const existingItem = currentItems.find(item =>
        item.product.id === product.id &&
        item.colorId === colorId &&
        item.sizeId === sizeId &&
        item.sellingUnit === productSellingUnit
      );

      if (existingItem) {
        // ⚡ تحديث الكمية حسب نوع البيع
        return currentItems.map(item => {
          if (item.product.id === product.id && item.colorId === colorId && item.sizeId === sizeId) {
            switch (productSellingUnit) {
              case 'weight':
                return { ...item, weight: (item.weight || 0) + (weight || 1) };
              case 'box':
                return { ...item, boxCount: (item.boxCount || 0) + (boxCount || 1) };
              case 'meter':
                return { ...item, length: (item.length || 0) + (length || 1) };
              default:
                return { ...item, quantity: item.quantity + 1 };
            }
          }
          return item;
        });
      } else {
        // ⚡ إضافة عنصر جديد مع كل البيانات - تعيين القيم الأولية حسب نوع البيع
        const newItem: CartItem = {
          product,
          // كمية القطع - 1 إذا كان البيع بالقطعة، 0 لغيرها
          quantity: productSellingUnit === 'piece' ? 1 : 0,
          colorId,
          colorName,
          colorCode,
          sizeId,
          sizeName,
          variantPrice: variantPrice || product.price,
          variantImage,
          // ⚡ بيانات أنواع البيع
          sellingUnit: productSellingUnit,
          saleType: saleType || 'retail',
          // بيانات الوزن
          weight: productSellingUnit === 'weight' ? (weight || 1) : weight,
          weightUnit: weightUnit || (product as any).weight_unit || 'kg',
          pricePerWeightUnit: (product as any).price_per_weight_unit,
          // بيانات العلبة
          boxCount: productSellingUnit === 'box' ? (boxCount || 1) : boxCount,
          unitsPerBox: (product as any).units_per_box,
          boxPrice: (product as any).box_price,
          // بيانات المتر
          length: productSellingUnit === 'meter' ? (length || 1) : length,
          pricePerMeter: (product as any).price_per_meter
        };

        return [...currentItems, newItem];
      }
    });

    // لا نحدث المخزون هنا - سيتم التحديث فقط عند إنهاء الإرجاع
    toast.success(`تم إضافة ${variantName} لسلة الإرجاع`);
  }, []);

  // تحديث كمية عنصر الإرجاع
  const updateReturnItemQuantity = useCallback((index: number, quantity: number) => {
    if (quantity <= 0) {
      setReturnItems(currentItems => currentItems.filter((_, i) => i !== index));
      return;
    }
    
    setReturnItems(currentItems => {
      const updatedItems = [...currentItems];
      updatedItems[index] = { ...updatedItems[index], quantity };
      return updatedItems;
    });
    
    // لا نحدث المخزون هنا - سيتم التحديث فقط عند إنهاء الإرجاع
  }, []);

  // تحديث سعر عنصر الإرجاع
  const updateReturnItemPrice = useCallback((index: number, price: number) => {
    if (price < 0) return;

    setReturnItems(currentItems => {
      const updatedItems = [...currentItems];
      updatedItems[index] = {
        ...updatedItems[index],
        variantPrice: price,
        customPrice: price
      };
      return updatedItems;
    });
  }, []);

  // ⚡ تحديث وزن عنصر الإرجاع
  const updateReturnItemWeight = useCallback((index: number, weight: number) => {
    if (weight < 0) return;

    setReturnItems(currentItems => {
      const updatedItems = [...currentItems];
      updatedItems[index] = {
        ...updatedItems[index],
        weight: weight,
        sellingUnit: 'weight'
      };
      return updatedItems;
    });
  }, []);

  // ⚡ تحديث عدد العلب لعنصر الإرجاع
  const updateReturnItemBoxCount = useCallback((index: number, boxCount: number) => {
    if (boxCount < 0) return;

    setReturnItems(currentItems => {
      const updatedItems = [...currentItems];
      updatedItems[index] = {
        ...updatedItems[index],
        boxCount: boxCount,
        sellingUnit: 'box'
      };
      return updatedItems;
    });
  }, []);

  // ⚡ تحديث طول (أمتار) عنصر الإرجاع
  const updateReturnItemLength = useCallback((index: number, length: number) => {
    if (length < 0) return;

    setReturnItems(currentItems => {
      const updatedItems = [...currentItems];
      updatedItems[index] = {
        ...updatedItems[index],
        length: length,
        sellingUnit: 'meter'
      };
      return updatedItems;
    });
  }, []);

  // ⚡ تحديث نوع وحدة البيع لعنصر الإرجاع
  const updateReturnItemSellingUnit = useCallback((index: number, sellingUnit: SellingUnit) => {
    setReturnItems(currentItems => {
      const updatedItems = [...currentItems];
      updatedItems[index] = {
        ...updatedItems[index],
        sellingUnit: sellingUnit
      };
      return updatedItems;
    });
  }, []);

  // ⚡ تحديث نوع البيع (تجزئة/جملة) لعنصر الإرجاع
  const updateReturnItemSaleType = useCallback((index: number, saleType: SaleType) => {
    setReturnItems(currentItems => {
      const updatedItems = [...currentItems];
      updatedItems[index] = {
        ...updatedItems[index],
        saleType: saleType,
        isWholesale: saleType !== 'retail'
      };
      return updatedItems;
    });
  }, []);

  // ⚡ تحديث كامل لإعدادات عنصر الإرجاع (من Modal التعديل)
  const updateReturnItemFullConfig = useCallback((index: number, config: {
    sellingUnit: SellingUnit;
    quantity?: number;
    weight?: number;
    weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
    boxCount?: number;
    length?: number;
  }) => {
    setReturnItems(currentItems => {
      const updatedItems = [...currentItems];
      updatedItems[index] = {
        ...updatedItems[index],
        sellingUnit: config.sellingUnit,
        quantity: config.quantity ?? updatedItems[index].quantity,
        weight: config.weight ?? updatedItems[index].weight,
        weightUnit: config.weightUnit ?? updatedItems[index].weightUnit,
        boxCount: config.boxCount ?? updatedItems[index].boxCount,
        length: config.length ?? updatedItems[index].length
      };
      return updatedItems;
    });
  }, []);

  // إزالة عنصر من سلة الإرجاع
  const removeReturnItem = useCallback((index: number) => {
    setReturnItems(currentItems => currentItems.filter((_, i) => i !== index));
    
    // لا نحدث المخزون هنا - سيتم التحديث فقط عند إنهاء الإرجاع
  }, []);

  // مسح سلة الإرجاع
  const clearReturnCart = useCallback(() => {
    setReturnItems([]);
    setReturnNotes('');
    // مسح localStorage أيضاً
    try {
      localStorage.removeItem('pos_return_items');
    } catch (error) {
    }
  }, []);

  // ⚡ التبديل بين وضع البيع ووضع الإرجاع - مرتبط بالـ Context
  const toggleReturnMode = useCallback(() => {
    if (mode !== 'return') {
      // تفعيل وضع الإرجاع
      contextToggleReturn();
      toast.info('تم التبديل إلى وضع الإرجاع');
    } else {
      // إلغاء وضع الإرجاع والعودة للبيع
      setReturnItems([]);
      setReturnNotes('');
      try {
        localStorage.removeItem('pos_return_items');
      } catch (error) {
      }

      setMode('sales');
      toast.info('تم العودة إلى وضع البيع');
    }
  }, [mode, contextToggleReturn, setMode]);

  // ⚡ حساب إجمالي عنصر حسب نوع البيع
  const calculateReturnItemTotal = useCallback((item: CartItem): number => {
    const sellingUnit = item.sellingUnit || 'piece';

    switch (sellingUnit) {
      case 'weight':
        const pricePerWeight = item.pricePerWeightUnit || (item.product as any).price_per_weight_unit || item.product.price || 0;
        return (item.weight || 0) * pricePerWeight;
      case 'box':
        const boxPrice = item.boxPrice || (item.product as any).box_price || item.product.price || 0;
        return (item.boxCount || 0) * boxPrice;
      case 'meter':
        const pricePerMeter = item.pricePerMeter || (item.product as any).price_per_meter || item.product.price || 0;
        return (item.length || 0) * pricePerMeter;
      case 'piece':
      default:
        const unitPrice = item.customPrice || item.variantPrice || item.product.price || 0;
        return (item.quantity || 0) * unitPrice;
    }
  }, []);

  // معالجة إرجاع العناصر - ⚡ Offline-First باستخدام PowerSync
  const processReturn = useCallback(async (orderDetails?: Partial<Order>): Promise<{orderId: string, customerOrderNumber: number}> => {

    if (!currentUser) {
      toast.error('يجب تسجيل الدخول لإجراء عملية الإرجاع');
      return Promise.reject('No user logged in');
    }

    if (!currentOrganizationId) {
      toast.error('خطأ: لم يتم تحديد المؤسسة');
      return Promise.reject('No organization ID');
    }

    if (returnItems.length === 0) {
      toast.error("لا توجد منتجات للإرجاع");
      return Promise.reject('No items to return');
    }

    // ⚡ حساب إجمالي قيمة الإرجاع (مع دعم جميع أنواع البيع)
    const returnTotal = returnItems.reduce((total, item) => {
      return total + calculateReturnItemTotal(item);
    }, 0);

    try {
      // ⚡ إنشاء رقم الإرجاع المحلي
      const returnNumber = `RET-${Date.now()}`;
      const now = new Date().toISOString();

      // ⚡ إعداد بيانات العناصر للحفظ المحلي (أسماء الأعمدة من PowerSync Schema)
      const returnItemsData = returnItems.map(item => {
        const sellingUnit = item.sellingUnit || 'piece';
        const unitPrice = item.customPrice || item.variantPrice || item.product.price || 0;
        const totalPrice = calculateReturnItemTotal(item);

        // ⚡ حساب الكمية الصحيحة حسب نوع البيع
        let returnQuantity = 1;
        switch (sellingUnit) {
          case 'weight':
            returnQuantity = item.weight || 1;
            break;
          case 'meter':
            returnQuantity = item.length || 1;
            break;
          case 'box':
            returnQuantity = item.boxCount || 1;
            break;
          case 'piece':
          default:
            returnQuantity = item.quantity || 1;
            break;
        }

        console.log('[processReturn] 📦 Preparing item:', {
          productName: item.product.name,
          sellingUnit,
          returnQuantity,
          quantity: item.quantity,
          weight: item.weight,
          length: item.length,
          boxCount: item.boxCount
        });

        return {
          organization_id: currentOrganizationId,
          product_id: item.product.id,
          product_name: item.product.name,
          product_sku: item.product.sku || '',
          return_quantity: returnQuantity, // ⚡ استخدام الكمية الصحيحة
          return_unit_price: unitPrice,
          total_return_amount: totalPrice,
          condition_status: 'good',
          resellable: true,
          inventory_returned: true,
          color_id: item.colorId || null,
          color_name: item.colorName || null,
          size_id: item.sizeId || null,
          size_name: item.sizeName || null,
          // ⚡ بيانات أنواع البيع (من PowerSync Schema)
          selling_unit_type: sellingUnit,
          weight_returned: sellingUnit === 'weight' ? (item.weight || 0) : null,
          weight_unit: sellingUnit === 'weight' ? (item.weightUnit || 'kg') : null,
          price_per_weight_unit: sellingUnit === 'weight' ? (item.pricePerWeightUnit || (item.product as any).price_per_weight_unit || 0) : null,
          meters_returned: sellingUnit === 'meter' ? (item.length || 0) : null,
          price_per_meter: sellingUnit === 'meter' ? (item.pricePerMeter || (item.product as any).price_per_meter || 0) : null,
          boxes_returned: sellingUnit === 'box' ? (item.boxCount || 0) : null,
          units_per_box: sellingUnit === 'box' ? (item.unitsPerBox || (item.product as any).units_per_box || 1) : null,
          box_price: sellingUnit === 'box' ? (item.boxPrice || (item.product as any).box_price || 0) : null,
          original_sale_type: item.saleType || 'retail',
          original_is_wholesale: item.isWholesale || false,
        };
      });

      // ⚡ استخدام createLocalProductReturn (PowerSync) بدلاً من Supabase RPC
      const { return: returnRecord } = await createLocalProductReturn({
        returnData: {
          organization_id: currentOrganizationId,
          return_number: returnNumber,
          customer_name: (orderDetails as any)?.customer_name || 'زائر',
          return_type: 'direct', // ⚡ مطلوب في Supabase - إرجاع مباشر
          status: 'approved', // إرجاع مباشر = موافق عليه تلقائياً
          return_reason: returnReason || 'customer_request',
          return_amount: returnTotal,
          refund_amount: returnTotal,
          refund_method: orderDetails?.paymentMethod || 'cash',
          notes: returnNotes || null,
          created_by: currentUser.id,
          approved_by: currentUser.id,
          approved_at: now,
        },
        items: returnItemsData
      });

      console.log('[usePOSReturn] ⚡ Created return via PowerSync:', returnRecord.id);

      // ⚡ تحديث cache محلياً للمنتجات المرجعة (حسب نوع البيع)
      returnItems.forEach(item => {
        const sellingUnit = item.sellingUnit || 'piece';
        let quantityChange = 0;

        switch (sellingUnit) {
          case 'weight':
            quantityChange = item.weight || 0;
            break;
          case 'box':
            // ⚡ تمرير عدد العلب مباشرة - سيتم التعامل معها في updateProductStockInCache
            quantityChange = item.boxCount || 0;
            break;
          case 'meter':
            quantityChange = item.length || 0;
            break;
          case 'piece':
          default:
            quantityChange = item.quantity || 0;
            break;
        }

        console.log('[usePOSReturn] ⚡ Updating cache for item:', {
          productId: item.product.id,
          sellingUnit,
          quantityChange
        });

        // ⚡ تمرير نوع البيع لتحديث الحقل الصحيح
        updateProductStockInCache(
          item.product.id,
          item.colorId || null,
          item.sizeId || null,
          quantityChange, // إضافة للمخزون (قيمة موجبة)
          sellingUnit as 'piece' | 'weight' | 'meter' | 'box'
        );
      });

      toast.success(`تم إنشاء إرجاع مباشر بنجاح - المبلغ: ${returnTotal.toLocaleString()} د.ج`);
      clearReturnCart();
      setMode('sales'); // ⚡ استخدام Context بدلاً من setIsReturnMode

      // ⚡ ملاحظة: لا نستدعي refreshPOSData هنا لأن:
      // 1. الكاش تم تحديثه بالفعل بـ updateProductStockInCache
      // 2. PowerSync يُزامن البيانات تلقائياً مع قاعدة البيانات
      // 3. استدعاء refreshPOSData سيُعيد القيمة القديمة قبل اكتمال المزامنة
      //
      // إذا كانت هناك حاجة لإعادة التحميل، يمكن للمستخدم سحب الصفحة للأسفل
      console.log('[usePOSReturn] ✅ Return completed. Cache updated. PowerSync will sync automatically.');

      return {
        orderId: returnRecord.id,
        customerOrderNumber: parseInt(returnNumber.replace(/[^\d]/g, '')) || Date.now()
      };

    } catch (error) {
      console.error('[usePOSReturn] ❌ Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      toast.error(`حدث خطأ في معالجة الإرجاع: ${errorMessage}`);
      throw error;
    }
  }, [returnItems, currentUser, currentOrganizationId, returnReason, returnNotes, updateProductStockInCache, refreshPOSData, clearReturnCart, calculateReturnItemTotal]);

  return {
    // حالة الإرجاع
    isReturnMode,
    returnItems,
    returnReason,
    returnNotes,

    // دوال إدارة الإرجاع
    setReturnReason,
    setReturnNotes,
    addItemToReturnCart,
    addVariantToReturnCart,
    updateReturnItemQuantity,
    updateReturnItemPrice,
    removeReturnItem,
    clearReturnCart,
    toggleReturnMode,
    processReturn,
    // ⚡ دوال أنواع البيع المتقدمة
    updateReturnItemWeight,
    updateReturnItemBoxCount,
    updateReturnItemLength,
    updateReturnItemSellingUnit,
    updateReturnItemSaleType,
    updateReturnItemFullConfig,
    calculateReturnItemTotal
  };
};
