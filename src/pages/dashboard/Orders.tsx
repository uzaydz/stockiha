import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import OrdersList from "@/components/orders/OrdersList";
import OrderDetails from "@/components/orders/OrderDetails";
import OrderFilters from "@/components/orders/OrderFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/context/TenantContext";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { checkUserPermissions } from "@/lib/api/permissions";

// تعريف نوع الطلب
type Order = {
  id: string;
  customer_id: string | null;
  subtotal: number;
  tax: number;
  discount: number | null;
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  shipping_address_id: string | null;
  shipping_method: string | null;
  shipping_cost: number | null;
  notes: string | null;
  employee_id: string | null;
  created_at: string;
  updated_at: string;
  organization_id: string;
  slug: string | null;
  customer_order_number: number | null;
  // خصائص مضافة من العلاقات
  customer?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  shipping_address?: {
    id: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string | null;
    postal_code: string;
    country: string;
  };
  order_items?: {
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
};

// تعريف حالات الطلب
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'all';

// تعريف أنواع الصلاحيات المتعلقة بالطلبات
type OrderPermissions = 'viewOrders' | 'updateOrderStatus' | 'cancelOrders';

const Orders = () => {
  const { currentOrganization } = useTenant();
  const { toast } = useToast();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<OrderStatus>('all');
  const [orderCounts, setOrderCounts] = useState({
    all: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0
  });
  // إضافة حالات للصلاحيات
  const [hasViewPermission, setHasViewPermission] = useState(false);
  const [hasUpdatePermission, setHasUpdatePermission] = useState(false);
  const [hasCancelPermission, setHasCancelPermission] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(true);

  // التحقق من صلاحيات المستخدم
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) return;
      setPermissionLoading(true);
      
      try {
        // التحقق من صلاحية مشاهدة الطلبات
        const canViewOrders = await checkUserPermissions(user, 'viewOrders' as any);
        setHasViewPermission(canViewOrders);
        
        // التحقق من صلاحية تحديث حالة الطلبات
        const canUpdateOrders = await checkUserPermissions(user, 'updateOrderStatus' as any);
        setHasUpdatePermission(canUpdateOrders);
        
        // التحقق من صلاحية إلغاء الطلبات
        const canCancelOrders = await checkUserPermissions(user, 'cancelOrders' as any);
        setHasCancelPermission(canCancelOrders);
      } catch (error) {
        console.error('خطأ في التحقق من الصلاحيات:', error);
        toast({
          variant: "destructive",
          title: "خطأ في التحقق من الصلاحيات",
          description: "حدث خطأ أثناء التحقق من صلاحياتك للوصول إلى هذه الصفحة"
        });
      } finally {
        setPermissionLoading(false);
      }
    };
    
    checkPermissions();
  }, [user, toast]);

  // استرجاع الطلبات
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // الرجوع إذا لم يكن لدى المستخدم صلاحية عرض الطلبات
        if (!hasViewPermission && !permissionLoading) {
          setLoading(false);
          return;
        }
        
        // الرجوع إذا كان التحقق من الصلاحيات جاريًا
        if (permissionLoading) {
          return;
        }
        
        setLoading(true);
        if (!currentOrganization?.id) return;

        // استرجاع الطلبات من جدول online_orders بدلاً من جدول orders
        const { data: ordersData, error } = await supabase
          .from('online_orders')
          .select(`
            *,
            order_items:online_order_items(id, product_id, product_name, quantity, unit_price, total_price, color_id, color_name, size_id, size_name),
            shipping_address:addresses!shipping_address_id(id, name, street_address, state, country, phone)
          `)
          .eq('organization_id', currentOrganization.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // استخراج معرفات الألوان والمقاسات من جميع عناصر الطلبات
        const colorIds = [];
        const sizeIds = [];
        
        ordersData.forEach(order => {
          if (order.order_items && order.order_items.length > 0) {
            order.order_items.forEach(item => {
              if (item.color_id && !colorIds.includes(item.color_id)) {
                colorIds.push(item.color_id);
              }
              if (item.size_id && !sizeIds.includes(item.size_id)) {
                sizeIds.push(item.size_id);
              }
            });
          }
        });
        
        // جلب معلومات الألوان إذا كانت موجودة
        if (colorIds.length > 0) {
          const { data: colorsData, error: colorsError } = await supabase
            .from('product_colors')
            .select('id, color_code')
            .in('id', colorIds);
            
          if (colorsError) {
            console.error('Error fetching color details:', colorsError);
          } else if (colorsData) {
            // إضافة رموز الألوان إلى عناصر الطلبات
            ordersData.forEach(order => {
              if (order.order_items && order.order_items.length > 0) {
                order.order_items = order.order_items.map(item => {
                  if (item.color_id) {
                    const colorInfo = colorsData.find(c => c.id === item.color_id);
                    if (colorInfo) {
                      return { ...item, color_code: colorInfo.color_code };
                    }
                  }
                  return item;
                });
              }
            });
          }
        }
        
        // جلب بيانات العملاء بناءً على customer_id
        const customerIds = ordersData
          .filter(order => order.customer_id)
          .map(order => order.customer_id);
          
        if (customerIds.length > 0) {
          // 1. أولاً، جلب بيانات العملاء المسجلين
          const { data: customersData, error: customersError } = await supabase
            .from('customers')
            .select('id, name, phone, email, organization_id')
            .in('id', customerIds)
            .eq('organization_id', currentOrganization.id);
            
          if (customersError) {
            console.error('Error fetching customers:', customersError);
          }
          
          // 2. جلب بيانات العملاء الضيوف
          const { data: guestCustomersData, error: guestCustomersError } = await supabase
            .from('guest_customers')
            .select('id, name, phone, organization_id')
            .in('id', customerIds)
            .eq('organization_id', currentOrganization.id);
            
          if (guestCustomersError) {
            console.error('Error fetching guest customers:', guestCustomersError);
          }
          
          // دمج بيانات العملاء والضيوف
          const allCustomersData = [
            ...(customersData || []),
            ...(guestCustomersData || []).map(guest => ({
              ...guest,
              email: null // إضافة حقل email فارغ للتوافق مع نموذج بيانات العملاء
            }))
          ];
          
          // ربط بيانات العملاء بالطلبات
          const ordersWithCustomers = ordersData.map(order => {
            if (order.customer_id) {
              const customer = allCustomersData.find(c => c.id === order.customer_id);
              return {
                ...order,
                customer: customer || null
              };
            }
            return {
              ...order,
              customer: null
            };
          });
          
          console.log('Orders with customers:', ordersWithCustomers);
          setOrders(ordersWithCustomers || []);
        } else {
          setOrders(ordersData || []);
        }
        
        // حساب عدد الطلبات حسب الحالة
        const counts = {
          all: ordersData.length,
          pending: ordersData.filter(o => o.status === 'pending').length,
          processing: ordersData.filter(o => o.status === 'processing').length,
          shipped: ordersData.filter(o => o.status === 'shipped').length,
          delivered: ordersData.filter(o => o.status === 'delivered').length,
          cancelled: ordersData.filter(o => o.status === 'cancelled').length
        };

        setOrderCounts(counts);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast({
          variant: "destructive",
          title: "فشل في استرجاع الطلبات",
          description: error.message || "حدث خطأ أثناء استرجاع الطلبات"
        });
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentOrganization?.id, toast, hasViewPermission, permissionLoading]);

  // تصفية الطلبات حسب الحالة
  useEffect(() => {
    let filtered = [...orders];
    if (filterStatus !== 'all') {
      filtered = orders.filter(order => order.status === filterStatus);
    }
    setFilteredOrders(filtered);
  }, [orders, filterStatus]);

  // تحديث حالة الطلب
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      // التحقق من صلاحية تحديث حالة الطلب
      if (!hasUpdatePermission) {
        toast({
          variant: "destructive",
          title: "ليس لديك صلاحية",
          description: "ليس لديك صلاحية لتحديث حالة الطلبات"
        });
        return;
      }
      
      // التحقق من صلاحية إلغاء الطلب إذا كانت الحالة الجديدة هي "ملغي"
      if (status === 'cancelled' && !hasCancelPermission) {
        toast({
          variant: "destructive",
          title: "ليس لديك صلاحية",
          description: "ليس لديك صلاحية لإلغاء الطلبات"
        });
        return;
      }

      // إذا كان تغيير الحالة إلى "ملغي"، استعادة المخزون أولا
      if (status === 'cancelled') {
        await restoreInventoryForCancelledOrder(orderId);
      }

      const { error } = await supabase
        .from('online_orders')  // استخدام جدول online_orders بدلاً من orders
        .update({ status })
        .eq('id', orderId)
        .eq('organization_id', currentOrganization?.id);

      if (error) throw error;

      // تحديث الطلبات في الحالة المحلية
      const updatedOrders = orders.map(order => 
        order.id === orderId ? { ...order, status } : order
      );
      setOrders(updatedOrders);
      
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status });
      }

      toast({
        title: "تم تحديث الطلب",
        description: `تم تغيير حالة الطلب إلى ${status}`,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        variant: "destructive",
        title: "فشل في تحديث الطلب",
        description: error.message || "حدث خطأ أثناء تحديث حالة الطلب"
      });
    }
  };

  // استعادة المخزون للطلب الملغي
  const restoreInventoryForCancelledOrder = async (orderId: string) => {
    try {
      // 1. استرجاع عناصر الطلب
      const { data: orderItems, error: itemsError } = await supabase
        .from('online_order_items')
        .select('*')
        .eq('order_id', orderId);
      
      if (itemsError) throw itemsError;
      
      if (!orderItems || orderItems.length === 0) {
        console.warn('لا توجد عناصر لهذا الطلب:', orderId);
        return;
      }
      
      console.log('استعادة المخزون للعناصر:', orderItems);
      
      // 2. استعادة المخزون لكل عنصر
      for (const item of orderItems) {
        // التحقق من وجود المقاس أو اللون
        if (item.size_id) {
          // استعادة المخزون للمقاس
          await restoreInventoryForSize(item);
        } else if (item.color_id) {
          // استعادة المخزون للون
          await restoreInventoryForColor(item);
        } else {
          // استعادة المخزون للمنتج الرئيسي
          await restoreInventoryForProduct(item);
        }
      }
      
      toast({
        title: "تم استعادة المخزون",
        description: "تم استعادة المخزون للمنتجات بعد إلغاء الطلب",
      });
      
    } catch (error) {
      console.error('Error restoring inventory:', error);
      toast({
        variant: "destructive",
        title: "فشل في استعادة المخزون",
        description: error.message || "حدث خطأ أثناء استعادة المخزون للمنتجات"
      });
      // لا نريد إيقاف عملية إلغاء الطلب حتى لو فشلت استعادة المخزون
    }
  };

  // استعادة المخزون للمقاس
  const restoreInventoryForSize = async (item) => {
    try {
      // أ. الحصول على قيمة المخزون الحالية للمقاس
      const { data: sizeData, error: sizeError } = await supabase
        .from('product_sizes')
        .select('quantity')
        .eq('id', item.size_id)
        .single();
      
      if (sizeError) {
        console.error('فشل في الحصول على معلومات المقاس:', item.size_id, sizeError);
        return;
      }
      
      // حساب الكمية الجديدة
      const currentStock = sizeData.quantity || 0;
      const newStock = currentStock + item.quantity;
      
      // ب. تحديث جدول المقاسات لزيادة الكمية
      const { error: updateError } = await supabase
        .from('product_sizes')
        .update({ quantity: newStock })
        .eq('id', item.size_id);
      
      if (updateError) {
        console.error('فشل في تحديث مخزون المقاس:', item.size_id, updateError);
        return;
      }
      
      // ج. إضافة سجل في جدول inventory_log
      await logInventoryChange(item.product_id, item.quantity, currentStock, newStock, item.order_id, `استعادة المخزون للمقاس ${item.size_name} بسبب إلغاء الطلب`);
    } catch (error) {
      console.error('Error restoring size inventory:', error);
    }
  };

  // استعادة المخزون للون
  const restoreInventoryForColor = async (item) => {
    try {
      // أ. الحصول على قيمة المخزون الحالية للون
      const { data: colorData, error: colorError } = await supabase
        .from('product_colors')
        .select('quantity')
        .eq('id', item.color_id)
        .single();
      
      if (colorError) {
        console.error('فشل في الحصول على معلومات اللون:', item.color_id, colorError);
        return;
      }
      
      // حساب الكمية الجديدة
      const currentStock = colorData.quantity || 0;
      const newStock = currentStock + item.quantity;
      
      // ب. تحديث جدول الألوان لزيادة الكمية
      const { error: updateError } = await supabase
        .from('product_colors')
        .update({ quantity: newStock })
        .eq('id', item.color_id);
      
      if (updateError) {
        console.error('فشل في تحديث مخزون اللون:', item.color_id, updateError);
        return;
      }
      
      // ج. إضافة سجل في جدول inventory_log
      await logInventoryChange(item.product_id, item.quantity, currentStock, newStock, item.order_id, `استعادة المخزون للون ${item.color_name} بسبب إلغاء الطلب`);
    } catch (error) {
      console.error('Error restoring color inventory:', error);
    }
  };

  // استعادة المخزون للمنتج الرئيسي
  const restoreInventoryForProduct = async (item) => {
    try {
      // أ. الحصول على قيمة المخزون الحالية
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', item.product_id)
        .eq('organization_id', currentOrganization?.id)
        .single();
      
      if (productError) {
        console.error('فشل في الحصول على معلومات المنتج:', item.product_id, productError);
        return;
      }
      
      // حساب الكمية الجديدة
      const currentStock = productData.stock_quantity || 0;
      const newStock = currentStock + item.quantity;
      
      // ب. تحديث جدول المنتجات لزيادة الكمية
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', item.product_id)
        .eq('organization_id', currentOrganization?.id);
      
      if (updateError) {
        console.error('فشل في تحديث مخزون المنتج:', item.product_id, updateError);
        return;
      }
      
      // ج. إضافة سجل في جدول inventory_log
      await logInventoryChange(item.product_id, item.quantity, currentStock, newStock, item.order_id, `استعادة المخزون بسبب إلغاء الطلب`);
    } catch (error) {
      console.error('Error restoring product inventory:', error);
    }
  };

  // تسجيل تغيير المخزون في جدول inventory_log
  const logInventoryChange = async (productId, quantity, previousStock, newStock, referenceId, notes) => {
    try {
      const { error: logError } = await supabase
        .from('inventory_log')
        .insert({
          product_id: productId,
          type: 'return',
          quantity: quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          reference_id: referenceId,
          reference_type: 'cancelled_order',
          notes: notes,
          organization_id: currentOrganization?.id,
          created_by: user?.id || null
        });
      
      if (logError) {
        console.error('فشل في إضافة سجل المخزون:', logError);
      }
    } catch (error) {
      console.error('Error logging inventory change:', error);
    }
  };

  // تحديث معلومات التوصيل
  const updateShippingInfo = async (orderId: string, shippingData: {
    shipping_method: string,
    shipping_cost: number,
    notes?: string
  }) => {
    try {
      const { error } = await supabase
        .from('online_orders')  // استخدام جدول online_orders بدلاً من orders
        .update({
          shipping_method: shippingData.shipping_method,
          shipping_cost: shippingData.shipping_cost,
          notes: shippingData.notes || null
        })
        .eq('id', orderId)
        .eq('organization_id', currentOrganization?.id);

      if (error) throw error;

      // تحديث الطلبات في الحالة المحلية
      const updatedOrders = orders.map(order => 
        order.id === orderId ? { 
          ...order, 
          shipping_method: shippingData.shipping_method,
          shipping_cost: shippingData.shipping_cost,
          notes: shippingData.notes || null
        } : order
      );
      setOrders(updatedOrders);
      
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          shipping_method: shippingData.shipping_method,
          shipping_cost: shippingData.shipping_cost,
          notes: shippingData.notes || null
        });
      }

      toast({
        title: "تم تحديث معلومات الشحن",
        description: "تم تحديث معلومات الشحن الخاصة بالطلب بنجاح.",
      });
    } catch (error) {
      console.error('Error updating shipping info:', error);
      toast({
        variant: "destructive",
        title: "فشل في تحديث معلومات الشحن",
        description: error.message || "حدث خطأ أثناء تحديث معلومات الشحن والتوصيل"
      });
    }
  };

  // تحديث معلومات العميل
  const updateCustomerInfo = async (customerId: string, customerData: {
    name: string,
    email: string,
    phone?: string
  }) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone || null
        })
        .eq('id', customerId)
        .eq('organization_id', currentOrganization?.id);

      if (error) throw error;

      // تحديث الطلبات في الحالة المحلية
      const updatedOrders = orders.map(order => {
        if (order.customer_id === customerId) {
          return {
            ...order,
            customer: {
              ...order.customer,
              name: customerData.name,
              email: customerData.email,
              phone: customerData.phone || null
            }
          };
        }
        return order;
      });
      setOrders(updatedOrders);
      
      if (selectedOrder?.customer_id === customerId) {
        setSelectedOrder({
          ...selectedOrder,
          customer: {
            ...selectedOrder.customer!,
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone || null
          }
        });
      }

      toast({
        title: "تم تحديث معلومات العميل",
        description: "تم تحديث معلومات العميل بنجاح.",
      });
    } catch (error) {
      console.error('Error updating customer info:', error);
      toast({
        variant: "destructive",
        title: "فشل في تحديث معلومات العميل",
        description: error.message || "حدث خطأ أثناء تحديث معلومات العميل"
      });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">إدارة الطلبات عبر الإنترنت</h1>
          <Badge variant="outline" className="px-4 py-2 text-lg">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
            ) : (
              `إجمالي الطلبات: ${orderCounts.all}`
            )}
          </Badge>
        </div>

        {/* رسالة تحذير عند عدم وجود صلاحية */}
        {!permissionLoading && !hasViewPermission && (
          <Alert variant="destructive" className="mb-4">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>غير مصرح</AlertTitle>
            <AlertDescription>ليس لديك صلاحية لمشاهدة الطلبات.</AlertDescription>
          </Alert>
        )}

        {/* عرض محتوى الصفحة فقط إذا كان لدى المستخدم صلاحية */}
        {(hasViewPermission || permissionLoading) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>قائمة الطلبات</CardTitle>
                    <OrderFilters 
                      filterStatus={filterStatus}
                      setFilterStatus={setFilterStatus}
                      orderCounts={orderCounts}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <OrdersList 
                    orders={filteredOrders}
                    loading={loading || permissionLoading}
                    selectedOrderId={selectedOrder?.id}
                    onSelectOrder={setSelectedOrder}
                  />
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-4">
              <Card>
                <CardHeader>
                  <CardTitle>تفاصيل الطلب</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedOrder ? (
                    <OrderDetails 
                      order={selectedOrder}
                      updateOrderStatus={updateOrderStatus}
                      updateShippingInfo={updateShippingInfo}
                      updateCustomerInfo={updateCustomerInfo}
                      hasUpdatePermission={hasUpdatePermission}
                      hasCancelPermission={hasCancelPermission}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>الرجاء اختيار طلب لعرض التفاصيل</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Orders; 