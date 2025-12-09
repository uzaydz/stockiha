import { supabase } from '@/lib/supabase';
import { Order, OrderItem, OrderStatus } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { isValidUUID } from './mappers';
import { updateProductsInventory } from './productService';
import { ensureCustomerExists } from '@/lib/fallback_customer';
import { createPOSOrder } from './posOrderService';
// ⚡ Phase 4: استيراد DeltaWriteService لاستخدام عمليات Delta للمخزون
import { deltaWriteService } from '@/services/DeltaWriteService';
// ⚡ PowerSync: استخدام PowerSync للبحث عن الموظفين
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// معرف المنتج الافتراضي للمنتجات اليدوية (تم جلبه من قاعدة البيانات)
const DEFAULT_PRODUCT_ID = "7b973625-5c3d-484f-a7e0-bf9e01f00ed2";

// وظيفة لإضافة طلب جديد
export const addOrder = async (
  order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>, 
  currentOrganizationId: string | undefined
): Promise<Order> => {
  try {
    // إذا كان طلب نقطة بيع، استخدم الدالة المخصصة
    if (!order.isOnline) {
      return await createPOSOrder(order, currentOrganizationId);
    }

    // التحقق من وجود العميل وإنشائه إذا لم يكن موجودًا
    const customerId = await ensureCustomerExists(order.customerId, currentOrganizationId);

    const orderSlug = `order-${new Date().getTime()}`;
    
    // التحقق من صحة employee_id قبل إنشاء الطلب
    // ⚡ استخدام PowerSync للبحث محلياً أولاً
    let validEmployeeId = null;
    if (order.employeeId && order.employeeId !== "" && currentOrganizationId) {
      try {
        // البحث في PowerSync أولاً (أوفلاين)
        if (!powerSyncService.db) {
          console.warn('[orderService] PowerSync DB not initialized');
        } else {
          const employee = await powerSyncService.queryOne<{ id: string; auth_user_id?: string }>({
            sql: 'SELECT id, auth_user_id FROM users WHERE (id = ? OR auth_user_id = ?) AND organization_id = ? LIMIT 1',
            params: [order.employeeId, order.employeeId, currentOrganizationId]
          });
          
          if (employee) {
            validEmployeeId = employee.id;
          } else {
            // Fallback: البحث في Supabase (أونلاين فقط)
            try {
              let { data: employeeExists } = await supabase
                .from('users')
                .select('id')
                .eq('id', order.employeeId)
                .single();
              
              if (employeeExists) {
                validEmployeeId = order.employeeId;
              } else {
                const { data: employeeByAuthId } = await supabase
                  .from('users')
                  .select('id')
                  .eq('auth_user_id', order.employeeId)
                  .single();
                
                if (employeeByAuthId) {
                  validEmployeeId = employeeByAuthId.id;
                }
              }
            } catch (supabaseError) {
              // تجاهل الأخطاء - سنستخدم null
              console.warn('[OrderService] Failed to find employee:', supabaseError);
            }
          }
        }
        
        if (employee) {
          validEmployeeId = employee.id;
        } else {
          // Fallback: البحث في Supabase (أونلاين فقط)
          try {
            let { data: employeeExists } = await supabase
              .from('users')
              .select('id')
              .eq('id', order.employeeId)
              .single();
            
            if (employeeExists) {
              validEmployeeId = order.employeeId;
            } else {
              const { data: employeeByAuthId } = await supabase
                .from('users')
                .select('id')
                .eq('auth_user_id', order.employeeId)
                .single();
              
              if (employeeByAuthId) {
                validEmployeeId = employeeByAuthId.id;
              }
            }
          } catch (supabaseError) {
            // تجاهل الأخطاء - سنستخدم null
            console.warn('[OrderService] Failed to find employee:', supabaseError);
          }
        }
      } catch (error) {
        console.warn('[OrderService] Error checking employee:', error);
      }
    }
    
    // ⚡ Offline-First: استخدام UnifiedOrderService لإنشاء الطلب
    const { unifiedOrderService } = await import('@/services/UnifiedOrderService');
    if (!currentOrganizationId) {
      throw new Error('Organization ID is required');
    }
    
    unifiedOrderService.setOrganizationId(currentOrganizationId);
    
    // تحويل البيانات إلى صيغة UnifiedOrderService
    const orderInput: CreateOrderInput = {
      customerId,
      items: order.items?.map(item => ({
        productId: item.productId || DEFAULT_PRODUCT_ID,
        quantity: item.quantity,
        unitPrice: item.unitPrice || item.price,
        variantInfo: item.variant_info
      })) || [],
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount,
      total: order.total,
      status: order.status as any,
      paymentMethod: order.paymentMethod as any,
      paymentStatus: order.paymentStatus as any,
      amountPaid: order.partialPayment?.amountPaid || order.total,
      remainingAmount: order.partialPayment?.remainingAmount || 0,
      shippingAddressId: order.shippingAddress?.id,
      shippingMethod: order.shippingMethod,
      shippingCost: order.shippingCost,
      notes: order.notes || '',
      employeeId: validEmployeeId || undefined,
      isOnline: order.isOnline || false
    };
    
    // ⚡ UnifiedOrderService يقوم تلقائياً بـ:
    // - إنشاء الطلب
    // - إضافة عناصر الطلب
    // - تحديث المخزون
    // - المزامنة مع السيرفر عند الاتصال
    const createdOrder = await unifiedOrderService.createOrder(orderInput);
    const newOrderId = createdOrder.id;

    // تحسين السرعة: تشغيل العمليات بالتوازي
    const parallelOperations = [];
    
    // ⚡ ملاحظة: تحديث المخزون يتم تلقائياً عبر UnifiedOrderService
    // لا حاجة لتحديث المخزون يدوياً هنا
    
    // إضافة حجوزات الخدمات
    if (order.services && order.services.length > 0) {
      parallelOperations.push(
        addServiceBookings(order.services, newOrderId, order.customerId, order.employeeId, currentOrganizationId)
      );
    }
    
    // إضافة معاملة مالية
    parallelOperations.push(
      addOrderTransaction(newOrderId, order, currentOrganizationId)
    );
    
    // تشغيل جميع العمليات بالتوازي للحصول على أقصى سرعة
    await Promise.allSettled(parallelOperations);
    
    // إعادة الطلب المضاف
    return {
      ...order,
      id: newOrderId,
      customer_order_number: createdOrder.customer_order_number || `ORDER-${newOrderId.substring(0, 8)}`,
      createdAt: new Date(createdOrder.created_at || new Date()),
      updatedAt: new Date(createdOrder.updated_at || new Date()),
      slug: orderSlug
    };
  } catch (error) {
    throw error;
  }
};

// وظيفة مساعدة لإضافة حجوزات الخدمات
const addServiceBookings = async (
  services: any[], 
  orderId: string, 
  defaultCustomerId: string, 
  employeeId: string | undefined,
  organizationId: string | undefined
) => {

  // معالجة كل خدمة على حدة مع الحفاظ على معرف العميل الخاص بها
  for (const service of services) {
    try {
      // 1. تحديد معرف العميل للخدمة (من الخدمة نفسها أو من الطلب الرئيسي)
      let customerId = service.customerId || defaultCustomerId;
      
      // 2. جلب اسم العميل واستخدامه بدلاً من "زائر" الافتراضي
      let customerName = "زائر"; // القيمة الافتراضية

      // إذا كان العميل مرتبطًا بالخدمة، استخدم اسمه مباشرة
      if (service.customer_name) {
        customerName = service.customer_name;
        
      }
      // استخراج اسم العميل من الطلب إذا كان متاحًا
      else if (defaultCustomerId && defaultCustomerId !== 'guest' && defaultCustomerId !== 'walk-in') {
        // البحث عن اسم العميل في قاعدة البيانات
        const { data: customerData } = await supabase
          .from('customers')
          .select('name')
          .eq('id', defaultCustomerId)
          .single();
          
        if (customerData?.name) {
          customerName = customerData.name;
          
        }
      }
      
      // تحقق من صحة معرف العميل
      let validCustomerId = customerId;
      if (customerId && customerId !== '00000000-0000-0000-0000-000000000000' && 
          customerId !== 'guest' && customerId !== 'walk-in') {
        const { data: userExists } = await supabase
          .from('users')
          .select('id')
          .eq('id', customerId)
          .maybeSingle();
          
        if (!userExists) {
          
          validCustomerId = null;
        } else {
          
        }
      }
     
      // 4. إنشاء كائن حجز الخدمة
      const serviceBookingData = {
        id: service.id || uuidv4(),
        order_id: orderId,
        service_id: service.serviceId,
        service_name: service.serviceName,
        price: service.price,
        scheduled_date: service.scheduledDate,
        notes: service.notes || "",
        customer_name: customerName,
        customer_id: validCustomerId, // استخدام المعرف الصالح بعد التحقق
        assigned_to: service.assignedTo || employeeId || null,
        status: service.status,
        public_tracking_code: service.public_tracking_code || `SRV-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
        slug: `booking-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`,
        organization_id: organizationId
      };

      // 5. إدراج حجز الخدمة في قاعدة البيانات

      try {
        let insertedBookingData = null;
        const { data: insertedBooking, error: serviceBookingError } = await supabase
          .from('service_bookings')
          .insert(serviceBookingData)
          .select();
          
        if (serviceBookingError) {
          
          // في حالة كان الخطأ متعلقًا بالعميل، حاول مرة أخرى مع معرف عميل فارغ
          if (serviceBookingError.message.includes('service_bookings_customer_id_fkey')) {

            const { data: retryData, error: retryError } = await supabase
              .from('service_bookings')
              .insert({...serviceBookingData, customer_id: null})
              .select();
              
            if (retryError) {
              continue;
            } else {
              
              insertedBookingData = retryData;
            }
          } else {
            // خطأ آخر غير متعلق بالعميل
            continue;
          }
        } else {
          
          insertedBookingData = insertedBooking;
        }
        
        // 6. إضافة تقدم أولي للخدمة
        try {
          // تحقق من صلاحية معرف المسؤول
          let createdById = employeeId || "";
          if (!createdById || createdById === "walk-in" || createdById === "guest") {
            
            const { data: userData } = await supabase.auth.getUser();
            createdById = userData?.user?.id || null;
          }
          
          // التحقق من وجود المسؤول
          if (createdById) {
            const { data: userExists } = await supabase
              .from('users')
              .select('id')
              .eq('id', createdById)
              .maybeSingle();
            
            if (!userExists) {
              
              createdById = null;
            }
          }
          
          const { error: progressError } = await supabase
            .from('service_progress')
            .insert({
              id: uuidv4(),
              service_booking_id: serviceBookingData.id,
              status: 'pending',
              note: 'تم إنشاء طلب الخدمة',
              timestamp: new Date().toISOString(),
              created_by: createdById,
              slug: `progress-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`,
              organization_id: organizationId
            });
            
          if (progressError) {
          } else {
            
          }
        } catch (error) {
        }
      } catch (error) {
      }
    } catch (error) {
    }
  }
};

// وظيفة مساعدة لإضافة معاملة مالية للطلب
const addOrderTransaction = async (
  orderId: string, 
  order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>,
  organizationId: string | undefined
) => {
  try {
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        id: uuidv4(),
        order_id: orderId,
        amount: order.paymentStatus === 'paid' ? order.total : (order.partialPayment?.amountPaid || 0),
        type: 'sale',
        payment_method: order.paymentMethod,
        description: order.paymentStatus === 'paid' 
          ? `Payment for order #${orderId.substring(0, 8)}` 
          : `Partial payment for order #${orderId.substring(0, 8)}`,
        employee_id: order.employeeId,
        organization_id: organizationId,
        created_at: new Date().toISOString(),
        slug: `transaction-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`
      });
      
    if (transactionError) {
      throw new Error(`Error adding transaction: ${transactionError.message}`);
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};

// وظيفة لتحديث حالة الطلب
export const updateOrderStatus = async (
  orderId: string, 
  status: OrderStatus
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
      
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};

// وظيفة لحذف طلب
export const deleteOrder = async (orderId: string): Promise<boolean> => {
  try {
    // حذف العناصر والخدمات المرتبطة بالطلب
    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);
      
    if (itemsError) {
    }
    
    const { error: servicesError } = await supabase
      .from('service_bookings')
      .delete()
      .eq('order_id', orderId);
      
    if (servicesError) {
    }
    
    // حذف المعاملات المرتبطة بالطلب
    const { error: transactionsError } = await supabase
      .from('transactions')
      .delete()
      .eq('order_id', orderId);
      
    if (transactionsError) {
    }
    
    // حذف الطلب نفسه
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);
      
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};

// دالة مساعدة لتحديث كمية اللون بناءً على مجموع كميات المقاسات
async function updateColorQuantityFromSizes(colorId: string) {
  try {
    // الحصول على مجموع كميات المقاسات لهذا اللون
    const { data: sizesData, error: sizesError } = await supabase
      .from('product_sizes')
      .select('quantity')
      .eq('color_id', colorId);
      
    if (sizesError) {
      return;
    }
    
    const totalQuantity = sizesData?.reduce((sum, size) => sum + (size.quantity || 0), 0) || 0;
    
    // تحديث كمية اللون
    const { error: updateError } = await supabase
      .from('product_colors')
      .update({ quantity: totalQuantity })
      .eq('id', colorId);
      
    if (updateError) {
    } else {
      
    }
  } catch (error) {
  }
}

// دالة مساعدة لتحديث كمية المنتج بناءً على مجموع كميات الألوان
async function updateProductQuantityFromColors(productId: string) {
  try {
    // الحصول على مجموع كميات الألوان لهذا المنتج
    const { data: colorsData, error: colorsError } = await supabase
      .from('product_colors')
      .select('quantity')
      .eq('product_id', productId);
      
    if (colorsError) {
      return;
    }
    
    const totalQuantity = colorsData?.reduce((sum, color) => sum + (color.quantity || 0), 0) || 0;
    
    // تحديث كمية المنتج
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock_quantity: totalQuantity })
      .eq('id', productId);
      
    if (updateError) {
    } else {
      
    }
  } catch (error) {
  }
}

// ⚡ Phase 4: دالة مساعدة لتحديث مخزون المنتج باستخدام Delta operations
async function updateProductStock(productId: string, quantity: number) {
  try {
    // ⚡ Phase 4: استخدام Delta operation بدلاً من UPDATE مباشر
    // هذا يسهل: replay, conflict resolution, audit
    await deltaWriteService.deltaUpdate(
      'products',
      productId,
      'stock_quantity',
      -quantity // سالب للخصم
    );
  } catch (deltaError) {
    console.error(`[OrderService] Delta update failed, using fallback:`, deltaError);
    // Fallback: التحديث المباشر (للتوافق مع الطلبات Online)
    try {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', productId)
        .single();
        
      if (productError) {
        return;
      }
      
      const currentStock = productData?.stock_quantity || 0;
      const newStock = Math.max(0, currentStock - quantity);
      
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', productId);
        
      if (updateError) {
        console.error(`[OrderService] Fallback update also failed:`, updateError);
      }
    } catch (error) {
      console.error(`[OrderService] Fallback error:`, error);
    }
  }
}
