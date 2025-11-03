import React, { memo, useState, useCallback, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

import OrdersTable from "./table/OrdersTable";
import { type ExtendedOrdersTableProps } from "./table/OrderTableTypes";
import MobileOrdersList from "./lists/MobileOrdersList";
import BlockDialogs from "./dialogs/BlockDialogs";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";
import { getAvailableWilayas, getMunicipalitiesByWilayaId } from "@/data/yalidine-municipalities-complete";
import { calculateDeliveryFeesOptimized } from "@/lib/delivery-calculator";
import { blockCustomer, unblockCustomer, isPhoneBlocked, checkMultiplePhonesBlocked } from "@/lib/api/blocked-customers";
import { formatCurrency } from "@/utils/ordersHelpers";

interface ResponsiveOrdersTableProps extends ExtendedOrdersTableProps {
  callConfirmationStatuses?: Array<{ id: number; name: string; color?: string | null }>;
}

const ResponsiveOrdersTable = memo(({ ...props }: ResponsiveOrdersTableProps) => {
  const { orders = [], loading } = props as any;

  const [updatingById, setUpdatingById] = useState<Record<string, boolean>>({});
  const [updatingCallById, setUpdatingCallById] = useState<Record<string, boolean>>({});
  const [localUpdates, setLocalUpdates] = useState<Record<string, any>>({});
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<string | null>(null);
  
  // حالات التعديل في الـ Sheet
  const [editMode, setEditMode] = useState<string | null>(null); // order id في وضع التعديل
  const [editedData, setEditedData] = useState<any>({});
  const [availableMunicipalities, setAvailableMunicipalities] = useState<any[]>([]);
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState<number | null>(null);
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  
  // حالات الحظر/إلغاء الحظر
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const [blockingCustomer, setBlockingCustomer] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [selectedOrderForBlock, setSelectedOrderForBlock] = useState<any>(null);
  const [blockedPhones, setBlockedPhones] = useState<Set<string>>(new Set());
  const checkedPhonesRef = useRef<Set<string>>(new Set()); // للأرقام التي تم فحصها
  const checkingPhonesRef = useRef<boolean>(false); // لمنع الفحص المتزامن


  const handleStatusChange = useCallback(async (orderId: string, newStatus: string) => {
    if (!props.onUpdateStatus || newStatus === '') return;
    try {
      setUpdatingById(prev => ({ ...prev, [orderId]: true }));
      await props.onUpdateStatus(orderId, newStatus);
    } finally {
      setUpdatingById(prev => ({ ...prev, [orderId]: false }));
    }
  }, [props.onUpdateStatus]);

  const handleCallConfirmationChange = useCallback(async (orderId: string, statusId: number, notes?: string) => {
    if (!props.onUpdateCallConfirmation) return;
    
    // تحديث محلي فوري
    const status = props.callConfirmationStatuses?.find(s => s.id === statusId);
    setLocalUpdates(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        call_confirmation_status_id: statusId,
        call_confirmation_notes: notes,
        call_confirmation_status: status,
        call_confirmation_updated_at: new Date().toISOString()
      }
    }));
    
    try {
      setUpdatingCallById(prev => ({ ...prev, [orderId]: true }));
      await props.onUpdateCallConfirmation(orderId, statusId, notes);
    } finally {
      setUpdatingCallById(prev => ({ ...prev, [orderId]: false }));
    }
  }, [props.onUpdateCallConfirmation, props.callConfirmationStatuses]);

  const navigate = useNavigate();
  const { currentOrganization } = useTenant();

  // دالة لتحديث الطلبيات (لنوع التوصيل والمكتب)
  const handleUpdateOrder = useCallback(async (orderId: string, updates: any) => {
    if (!currentOrganization?.id) return;
    
    try {
      // تحديث محلي فوري
      setLocalUpdates(prev => ({
        ...prev,
        [orderId]: {
          ...prev[orderId],
          ...updates
        }
      }));
      
      const { error } = await supabase
        .from('online_orders')
        .update(updates)
        .eq('id', orderId)
        .eq('organization_id', currentOrganization.id);
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating order:', error);
      // إلغاء التحديث المحلي في حالة الخطأ
      setLocalUpdates(prev => {
        const newState = { ...prev };
        delete newState[orderId];
        return newState;
      });
      throw error;
    }
  }, [currentOrganization?.id]);
  const availableProvinces = useMemo(() => getAvailableWilayas(), []);

  // فحص حالة الحظر للأرقام عند تحميل البيانات (مُحسّن لتجنب الاستدعاءات المتكررة)
  useEffect(() => {
    if (!currentOrganization?.id || !orders.length || checkingPhonesRef.current) return;
    
    const checkBlockedPhones = async () => {
      checkingPhonesRef.current = true;
      const newPhones: string[] = [];
      
      // جمع الأرقام الجديدة فقط التي لم يتم فحصها بعد
      for (const order of orders) {
        const phone = order.customer?.phone || order.form_data?.phone;
        if (phone && !checkedPhonesRef.current.has(phone)) {
          newPhones.push(phone);
          checkedPhonesRef.current.add(phone);
        }
      }
      
      // إذا لم تكن هناك أرقام جديدة، نتوقف
      if (newPhones.length === 0) {
        checkingPhonesRef.current = false;
        return;
      }
      
      // فحص جميع الأرقام في طلب واحد محسن
      try {
        const blockedResults = await checkMultiplePhonesBlocked(currentOrganization.id, newPhones);
        const foundBlockedPhones: string[] = [];
        
        for (const phone of newPhones) {
          const result = blockedResults.get(phone);
          if (result && result.isBlocked) {
            foundBlockedPhones.push(phone);
          }
        }
        
        // تحديث الحالة مرة واحدة فقط
        if (foundBlockedPhones.length > 0) {
          setBlockedPhones(prev => new Set([...prev, ...foundBlockedPhones]));
        }
      } catch (error) {
        console.error('Error checking blocked status for phones', error);
      }
      
      checkingPhonesRef.current = false;
    };
    
    // استخدام debounce لتقليل الاستدعاءات
    const timeoutId = setTimeout(checkBlockedPhones, 300);
    return () => {
      clearTimeout(timeoutId);
      // إذا تم إلغاء التحميل قبل الانتهاء، نرجع الحالة
      if (checkingPhonesRef.current) {
        checkingPhonesRef.current = false;
      }
    };
  }, [currentOrganization?.id, orders]);

  // دالة حظر العميل
  const handleBlockCustomer = async () => {
    if (!currentOrganization?.id || !selectedOrderForBlock) return;
    
    const phone = selectedOrderForBlock.customer?.phone || selectedOrderForBlock.form_data?.phone;
    const name = selectedOrderForBlock.customer?.name || selectedOrderForBlock.form_data?.fullName;
    
    if (!phone) {
      toast.error('لا يوجد رقم هاتف لهذا العميل');
      return;
    }
    
    setBlockingCustomer(true);
    try {
      await blockCustomer(currentOrganization.id, phone, name, blockReason || null);
      toast.success(`تم حظر ${name || phone} بنجاح`);
      setBlockedPhones(prev => new Set([...prev, phone]));
      checkedPhonesRef.current.add(phone); // تحديث الأرقام المفحوصة
      setShowBlockDialog(false);
      setBlockReason('');
      setSelectedOrderForBlock(null);
    } catch (error: any) {
      toast.error(error.message || 'فشل في حظر العميل');
    } finally {
      setBlockingCustomer(false);
    }
  };

  // دالة إلغاء حظر العميل
  const handleUnblockCustomer = async () => {
    if (!currentOrganization?.id || !selectedOrderForBlock) return;
    
    const phone = selectedOrderForBlock.customer?.phone || selectedOrderForBlock.form_data?.phone;
    const name = selectedOrderForBlock.customer?.name || selectedOrderForBlock.form_data?.fullName;
    
    if (!phone) {
      toast.error('لا يوجد رقم هاتف لهذا العميل');
      return;
    }
    
    setBlockingCustomer(true);
    try {
      await unblockCustomer(currentOrganization.id, phone);
      toast.success(`تم إلغاء حظر ${name || phone} بنجاح`);
      setBlockedPhones(prev => {
        const newSet = new Set(prev);
        newSet.delete(phone);
        return newSet;
      });
      // إعادة تعيين الرقم في المفحوصة ليتم فحصه مجدداً
      checkedPhonesRef.current.delete(phone);
      setShowUnblockDialog(false);
      setSelectedOrderForBlock(null);
    } catch (error: any) {
      toast.error(error.message || 'فشل في إلغاء حظر العميل');
    } finally {
      setBlockingCustomer(false);
    }
  };

  // فحص إذا كان العميل محظوراً
  const isCustomerBlocked = (order: any) => {
    const phone = order.customer?.phone || order.form_data?.phone;
    return phone && blockedPhones.has(phone);
  };

  // دالة تفعيل وضع التعديل
  const enableEditMode = useCallback((order: any) => {
    // استخدام form_data كأولوية (لأنها المصدر الأساسي بعد التحديث)
    const provinceId = order.form_data?.province || (order.shipping_address as any)?.province;
    const municipalityValue = order.form_data?.municipality || order.shipping_address?.municipality;
    
    // تحميل البلديات إذا كانت الولاية محددة
    let municipalities: any[] = [];
    if (provinceId) {
      municipalities = getMunicipalitiesByWilayaId(Number(provinceId));
      setAvailableMunicipalities(municipalities);
    }
    
    // إذا كانت البلدية اسماً بدلاً من ID، نحاول إيجاد الـ ID المطابق
    let municipalityId = municipalityValue;
    if (municipalityValue && typeof municipalityValue === 'string' && municipalities.length > 0) {
      // تحقق إذا كانت القيمة رقمية
      if (!/^\d+$/.test(municipalityValue)) {
        // البحث عن البلدية بالاسم
        const foundMunicipality = municipalities.find(m => 
          m.name === municipalityValue || 
          m.name.toLowerCase() === municipalityValue.toLowerCase()
        );
        if (foundMunicipality) {
          municipalityId = foundMunicipality.id.toString();
        }
      }
    }
    
    setEditMode(order.id);
    setEditedData({
      fullName: order.customer?.name || order.form_data?.fullName || '',
      phone: order.customer?.phone || order.form_data?.phone || '',
      province: provinceId ? String(provinceId) : '',
      municipality: municipalityId ? String(municipalityId) : '',
      address: order.form_data?.address || order.shipping_address?.street_address || '',
      shipping_cost: order.shipping_cost || 0,
      subtotal: order.subtotal || 0,
      discount: order.discount || 0,
      items: order.order_items || [],
      // إضافة حقول التوصيل من form_data
      deliveryType: order.form_data?.deliveryType || order.form_data?.delivery_type || 'home',
      delivery_type: order.form_data?.deliveryType || order.form_data?.delivery_type || 'home',
      stopdesk_id: order.form_data?.stopdesk_id || order.form_data?.stopdeskId || null,
      stopdeskId: order.form_data?.stopdesk_id || order.form_data?.stopdeskId || null,
      // حفظ الأسماء والمعرفات للمرجعية
      wilayaName: order.form_data?.wilayaName || null,
      communeName: order.form_data?.communeName || null,
      wilaya: order.form_data?.wilaya || order.form_data?.wilayaId || provinceId,
      wilayaId: order.form_data?.wilaya || order.form_data?.wilayaId || provinceId,
      commune: order.form_data?.commune || order.form_data?.communeId || municipalityId,
      communeId: order.form_data?.commune || order.form_data?.communeId || municipalityId,
    });
  }, []);

  // دالة تحديث حقل في البيانات المعدلة
  const updateEditedField = useCallback((field: string, value: any) => {
    setEditedData((prev: any) => ({ ...prev, [field]: value }));
    
    // إذا تم تغيير الولاية، نحمل البلديات ونعيد حساب التوصيل
    if (field === 'province') {
      const municipalities = getMunicipalitiesByWilayaId(Number(value));
      setAvailableMunicipalities(municipalities);
      setEditedData((prev: any) => ({ ...prev, municipality: '' }));
    }
  }, []);

  // حساب سعر التوصيل تلقائياً
  useEffect(() => {
    if (!editMode || !editedData.province || !editedData.municipality || !currentOrganization?.id) {
      return;
    }

    const calculateDelivery = async () => {
      setIsCalculatingDelivery(true);
      try {
        const result = await calculateDeliveryFeesOptimized({
          organizationId: currentOrganization.id,
          selectedProvinceId: editedData.province,
          selectedMunicipalityId: editedData.municipality,
          deliveryType: 'home',
          weight: editedData.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 1,
          productPrice: editedData.subtotal || 0,
          quantity: editedData.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 1
        });
        
        if (result && result.deliveryFee !== undefined) {
          setCalculatedDeliveryFee(result.deliveryFee);
          setEditedData((prev: any) => ({ ...prev, shipping_cost: result.deliveryFee }));
        }
      } catch (error) {
        console.error('Failed to calculate delivery:', error);
      } finally {
        setIsCalculatingDelivery(false);
      }
    };

    const timeoutId = setTimeout(calculateDelivery, 500);
    return () => clearTimeout(timeoutId);
  }, [editMode, editedData.province, editedData.municipality, editedData.subtotal, editedData.items, currentOrganization?.id]);

  // دالة حفظ التعديلات
  const saveOrderEdits = useCallback(async () => {
    if (!editMode || !currentOrganization?.id) return;

    setSavingOrder(true);
    try {
      const order = orders.find((o: any) => o.id === editMode);
      if (!order) throw new Error('Order not found');

      // حساب المجموع النهائي مع التخفيض
      const finalTotal = editedData.subtotal + editedData.shipping_cost - (editedData.discount || 0);

      // تحديث بيانات الطلب
      const { error: orderError } = await supabase
        .from('online_orders')
        .update({
          shipping_cost: editedData.shipping_cost,
          subtotal: editedData.subtotal,
          discount: editedData.discount || 0,
          total: finalTotal,
          updated_at: new Date().toISOString()
        })
        .eq('id', editMode)
        .eq('organization_id', currentOrganization.id);

      if (orderError) throw orderError;

      // تحديث معلومات العميل
      if (order.customer?.id) {
        const { error: customerError } = await supabase
          .from('customers')
          .update({
            name: editedData.fullName,
            phone: editedData.phone,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.customer.id);

        if (customerError) console.error('Failed to update customer:', customerError);
      }

      // تحديث عنوان الشحن بشكل غير مباشر عبر order update
      // سنعتمد على form_data كمصدر أساسي للبيانات

      // تحديث form_data مع جميع البيانات الجديدة
      const { error: formDataError } = await supabase
        .from('online_orders')
        .update({
          form_data: {
            ...(order.form_data || {}),
            fullName: editedData.fullName,
            phone: editedData.phone,
            province: editedData.province,
            municipality: editedData.municipality,
            address: editedData.address,
            // إضافة حقول التوصيل إذا كانت موجودة
            ...(editedData.deliveryType !== undefined && { 
              deliveryType: editedData.deliveryType,
              delivery_type: editedData.deliveryType 
            }),
            ...(editedData.stopdesk_id !== undefined && { 
              stopdesk_id: editedData.stopdesk_id,
              stopdeskId: editedData.stopdesk_id 
            }),
            // حفظ أسماء الولاية والبلدية للمرجعية
            ...(editedData.wilayaName && { wilayaName: editedData.wilayaName }),
            ...(editedData.communeName && { communeName: editedData.communeName }),
            ...(editedData.wilaya && { wilaya: editedData.wilaya, wilayaId: editedData.wilaya }),
            ...(editedData.commune && { commune: editedData.commune, communeId: editedData.commune }),
          } as any
        })
        .eq('id', editMode)
        .eq('organization_id', currentOrganization.id);

      if (formDataError) {
        console.error('Failed to update form_data:', formDataError);
      } else {
        console.log('Form data updated successfully with all fields:', {
          deliveryType: editedData.deliveryType,
          stopdesk_id: editedData.stopdesk_id
        });
      }

      // تحديث المنتجات في جدول online_order_items
      if (editedData.items && editedData.items.length > 0) {
        // حذف المنتجات القديمة
        const { error: deleteError } = await supabase
          .from('online_order_items')
          .delete()
          .eq('order_id', editMode);

        if (deleteError) {
          console.error('Failed to delete old items:', deleteError);
        }

        // إضافة المنتجات الجديدة/المحدثة
        const itemsToInsert = editedData.items.map((item: any) => ({
          order_id: editMode,
          product_id: item.product_id,
          product_name: item.product_name,
          name: item.product_name, // إضافة name مطلوب
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          color_id: item.color_id || null,
          color_name: item.color_name || null,
          size_id: item.size_id || null,
          size_name: item.size_name || null,
          organization_id: currentOrganization.id,
          slug: item.product_name?.toLowerCase().replace(/\s+/g, '-') || `product-${item.product_id}`,
        }));

        const { error: insertError } = await supabase
          .from('online_order_items')
          .insert(itemsToInsert);

        if (insertError) {
          console.error('Failed to insert new items:', insertError);
          toast.error('فشل في تحديث المنتجات');
        } else {
          console.log('Items updated successfully:', itemsToInsert.length);
        }
      }

      // تحديث محلي للطلبات في الذاكرة
      setLocalUpdates(prev => ({
        ...prev,
        [editMode]: {
          ...order,
          shipping_cost: editedData.shipping_cost,
          subtotal: editedData.subtotal,
          discount: editedData.discount || 0,
          total: finalTotal,
          customer: {
            ...order.customer,
            name: editedData.fullName,
            phone: editedData.phone
          },
          form_data: {
            ...(order.form_data || {}),
            fullName: editedData.fullName,
            phone: editedData.phone,
            province: editedData.province,
            municipality: editedData.municipality,
            address: editedData.address,
            // إضافة حقول التوصيل
            ...(editedData.deliveryType !== undefined && { 
              deliveryType: editedData.deliveryType,
              delivery_type: editedData.deliveryType 
            }),
            ...(editedData.stopdesk_id !== undefined && { 
              stopdesk_id: editedData.stopdesk_id,
              stopdeskId: editedData.stopdesk_id 
            }),
            ...(editedData.wilayaName && { wilayaName: editedData.wilayaName }),
            ...(editedData.communeName && { communeName: editedData.communeName }),
            ...(editedData.wilaya && { wilaya: editedData.wilaya, wilayaId: editedData.wilaya }),
            ...(editedData.commune && { commune: editedData.commune, communeId: editedData.commune }),
          },
          shipping_address: {
            ...order.shipping_address,
            province: editedData.province,
            municipality: editedData.municipality,
            street_address: editedData.address
          },
          order_items: editedData.items,
          updated_at: new Date().toISOString()
        }
      }));

      toast.success('تم حفظ التعديلات بنجاح');
      setEditMode(null);
      setEditedData({});
      setAvailableMunicipalities([]);
    } catch (error: any) {
      console.error('Failed to save order edits:', error);
      toast.error(error.message || 'فشل في حفظ التعديلات');
    } finally {
      setSavingOrder(false);
    }
  }, [editMode, editedData, currentOrganization?.id, orders]);

  // دالة إلغاء التعديل
  const cancelEdit = useCallback(() => {
    setEditMode(null);
    setEditedData({});
    setAvailableMunicipalities([]);
    setCalculatedDeliveryFee(null);
  }, []);

  // دالة مشاركة التفاصيل
  const shareOrderDetails = async (order: any) => {
    const text = `طلب #${order.customer_order_number || order.id}\nالعميل: ${order.customer?.name || order.form_data?.fullName}\nالمبلغ: ${formatCurrency(order.total)}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (err) {
        navigator.clipboard.writeText(text).then(() => {
          toast.success("تم نسخ تفاصيل الطلب");
        }).catch(() => {
          toast.error("فشل النسخ");
        });
      }
    } else {
      navigator.clipboard.writeText(text).then(() => {
        toast.success("تم نسخ تفاصيل الطلب");
      }).catch(() => {
        toast.error("فشل النسخ");
      });
    }
  };

  // دمج التحديثات المحلية مع الطلبات - محسّن لتقليل re-renders
  const displayedOrders = useMemo(() => {
    // إذا لم تكن هناك تحديثات محلية، نرجع الطلبات كما هي
    if (Object.keys(localUpdates).length === 0) {
      return orders;
    }
    
    return orders.map((order: any) => {
      const localUpdate = localUpdates[order.id];
      return localUpdate ? { ...order, ...localUpdate } : order;
    });
  }, [orders, localUpdates]);

  // دالة لتحديث الطلب محلياً
  const handleOrderUpdated = useCallback((orderId: string, updatedOrder: any) => {
    setLocalUpdates(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        ...updatedOrder
      }
    }));
  }, []);

  return (
    <div className="relative">
      {/* عرض الجوال */}
      <div className="md:hidden">
        <MobileOrdersList
          orders={displayedOrders}
          loading={loading}
          localUpdates={localUpdates}
          updatingById={updatingById}
          updatingCallById={updatingCallById}
          editMode={editMode}
          editedData={editedData}
          savingOrder={savingOrder}
          isCalculatingDelivery={isCalculatingDelivery}
          isCustomerBlocked={isCustomerBlocked}
          onStatusChange={handleStatusChange}
          onCallConfirmationChange={handleCallConfirmationChange}
          onBlockCustomer={(order) => {
                            setSelectedOrderForBlock(order);
            setShowBlockDialog(true);
          }}
          onUnblockCustomer={(order) => {
                            setSelectedOrderForBlock(order);
            setShowUnblockDialog(true);
          }}
          onNavigateToDetails={(orderId) => navigate(`/dashboard/orders-v2/${orderId}`)}
          onShareOrder={shareOrderDetails}
          onEditMode={enableEditMode}
          onCancelEdit={cancelEdit}
          onSaveOrderEdits={saveOrderEdits}
                            onFieldChange={updateEditedField}
          callConfirmationStatuses={props.callConfirmationStatuses}
          shippingProviders={props.shippingProviders}
          onSendToProvider={props.onSendToProvider}
          organizationId={currentOrganization?.id}
          onUpdateOrder={handleUpdateOrder}
          totalItems={props.totalItems}
          currentPage={props.currentPage}
          pageSize={props.pageSize}
          hasPreviousPage={props.hasPreviousPage}
          hasNextPage={props.hasNextPage}
          hasMoreOrders={props.hasMoreOrders}
          onPageChange={props.onPageChange}
          onLoadMore={props.onLoadMore}
        />
      </div>

      {/* عرض الجدول لسطح المكتب والأجهزة المتوسطة فما فوق */}
      <div className={cn("hidden md:block transition-none")}>
        <OrdersTable
          {...props}
          orders={displayedOrders}
          onOrderUpdated={handleOrderUpdated}
          localUpdates={localUpdates}
        />
      </div>

      {/* حوارات الحظر */}
      <BlockDialogs
        showBlockDialog={showBlockDialog}
        showUnblockDialog={showUnblockDialog}
        blockingCustomer={blockingCustomer}
        blockReason={blockReason}
        selectedOrderForBlock={selectedOrderForBlock}
        onBlockDialogChange={setShowBlockDialog}
        onUnblockDialogChange={setShowUnblockDialog}
        onBlockReasonChange={setBlockReason}
        onBlockCustomer={handleBlockCustomer}
        onUnblockCustomer={handleUnblockCustomer}
      />
    </div>
  );
});

ResponsiveOrdersTable.displayName = "ResponsiveOrdersTable";

export default ResponsiveOrdersTable;
