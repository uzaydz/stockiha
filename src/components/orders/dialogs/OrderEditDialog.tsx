import React, { memo, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { User, MapPin, Phone, Package2, Loader2, Plus, Trash2, Home, Building2, Truck, Save, X } from 'lucide-react';
import { formatCurrency } from '@/utils/ordersHelpers';
import { getAvailableWilayas, getMunicipalitiesByWilayaId } from '@/data/yalidine-municipalities-complete';
import { StopDeskSelectionDialog } from './StopDeskSelectionDialog';
import AddProductDialog from './AddProductDialog';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface OrderEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onOrderUpdated: (updatedOrder: any) => void;
}

const OrderEditDialog = memo<OrderEditDialogProps>(({ open, onOpenChange, order, onOrderUpdated }) => {
  const [editedData, setEditedData] = useState<any>({});
  const [availableMunicipalities, setAvailableMunicipalities] = useState<any[]>([]);
  const [stopDeskDialogOpen, setStopDeskDialogOpen] = useState(false);
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false);
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const availableProvinces = getAvailableWilayas();
  const { currentOrganization } = useTenant();
  
  // تهيئة البيانات عند فتح الحوار
  useEffect(() => {
    if (open && order) {
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
        if (!/^\d+$/.test(municipalityValue)) {
          const foundMunicipality = municipalities.find(m => 
            m.name === municipalityValue || 
            m.name.toLowerCase() === municipalityValue.toLowerCase()
          );
          if (foundMunicipality) {
            municipalityId = foundMunicipality.id.toString();
          }
        }
      }
      
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
    }
  }, [open, order]);

  // استخراج معلومات التوصيل
  const deliveryType = editedData.deliveryType || editedData.delivery_type || 'home';
  const isStopDesk = deliveryType === 'office' || 
                     deliveryType === 'stop_desk' || 
                     deliveryType === 'stopdesk' || 
                     deliveryType === 2 ||
                     deliveryType === '2';
  const stopdeskId = editedData.stopdesk_id || editedData.stopdeskId || null;

  // تحديث حقل في البيانات المعدلة
  const updateEditedField = (field: string, value: any) => {
    setEditedData((prev: any) => ({ ...prev, [field]: value }));
    
    // إذا تم تغيير الولاية، نحمل البلديات ونعيد حساب التوصيل
    if (field === 'province') {
      const municipalities = getMunicipalitiesByWilayaId(Number(value));
      setAvailableMunicipalities(municipalities);
      setEditedData((prev: any) => ({ ...prev, municipality: '' }));
    }
  };

  // تحديث كمية المنتج
  const updateItemQuantity = (index: number, quantity: number) => {
    const newItems = [...editedData.items];
    newItems[index].quantity = Math.max(1, quantity);
    newItems[index].total_price = newItems[index].unit_price * newItems[index].quantity;
    
    const newSubtotal = newItems.reduce((sum, item) => sum + item.total_price, 0);
    updateEditedField('items', newItems);
    updateEditedField('subtotal', newSubtotal);
  };

  // حذف منتج
  const removeItem = (index: number) => {
    const newItems = editedData.items.filter((_: any, i: number) => i !== index);
    const newSubtotal = newItems.reduce((sum: number, item: any) => sum + item.total_price, 0);
    updateEditedField('items', newItems);
    updateEditedField('subtotal', newSubtotal);
  };

  // إضافة منتج جديد
  const addNewProduct = (product: any) => {
    const newItems = [...(editedData.items || []), product];
    const newSubtotal = newItems.reduce((sum: number, item: any) => sum + item.total_price, 0);
    updateEditedField('items', newItems);
    updateEditedField('subtotal', newSubtotal);
  };

  // تغيير نوع التوصيل
  const handleDeliveryTypeChange = (newType: string) => {
    updateEditedField('deliveryType', newType);
    updateEditedField('delivery_type', newType);
    
    // إذا تم التغيير للمنزل، حذف معرف المكتب
    if (newType === 'home') {
      updateEditedField('stopdesk_id', null);
      updateEditedField('stopdeskId', null);
    }
  };

  // تأكيد اختيار المكتب
  const handleStopDeskConfirm = async (stopdeskId: number, selectedCenter: any) => {
    try {
      console.log('Selected center:', selectedCenter);
      
      // تحديث البيانات المحلية
      updateEditedField('stopdesk_id', stopdeskId);
      updateEditedField('stopdeskId', stopdeskId);
      
      // تحديث الولاية أولاً لتحديث قائمة البلديات
      const newWilayaId = selectedCenter.wilaya_id.toString();
      updateEditedField('province', newWilayaId);
      updateEditedField('wilaya', newWilayaId);
      updateEditedField('wilayaId', newWilayaId);
      
      // تحديث قائمة البلديات المتاحة بناءً على الولاية الجديدة
      const newMunicipalities = getMunicipalitiesByWilayaId(Number(newWilayaId));
      setAvailableMunicipalities(newMunicipalities);
      
      // ثم تحديث البلدية
      const newCommuneId = selectedCenter.commune_id.toString();
      updateEditedField('municipality', newCommuneId);
      updateEditedField('commune', newCommuneId);
      updateEditedField('communeId', newCommuneId);
      
      // حفظ الأسماء للمرجعية
      updateEditedField('communeName', selectedCenter.commune_name);
      updateEditedField('wilayaName', selectedCenter.wilaya_name);
      
      console.log('Updated values:', {
        province: newWilayaId,
        municipality: newCommuneId,
        stopdesk_id: stopdeskId
      });
      
      toast.success('تم اختيار المكتب وتحديث البيانات بنجاح');
    } catch (error) {
      console.error('Error selecting stop desk:', error);
      toast.error('فشل في اختيار المكتب');
    }
  };

  // حفظ التعديلات
  const handleSave = async () => {
    if (!currentOrganization?.id) return;

    setSaving(true);
    try {
      const finalTotal = editedData.subtotal + editedData.shipping_cost - (editedData.discount || 0);

      // استخدام RPC function محسن لتحديث الطلب والعناصر في استدعاء واحد
      const { data: rpcResult, error: rpcError } = await supabase.rpc('update_order_complete' as any, {
        p_order_id: order.id,
        p_organization_id: currentOrganization.id,
        p_order_data: {
          shipping_cost: editedData.shipping_cost,
          subtotal: editedData.subtotal,
          discount: editedData.discount || 0,
          total: finalTotal
        },
        p_form_data: {
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
          // حفظ معلومات العنوان في form_data
          street_address: editedData.address,
          shipping_address: {
            province: editedData.province,
            municipality: editedData.municipality,
            street_address: editedData.address
          }
        },
        p_items: editedData.items || []
      });

      if (rpcError) throw rpcError;
      
      const result = rpcResult as any;
      if (!result?.success) {
        throw new Error(result?.error || 'فشل في تحديث الطلب');
      }

      // تحديث معلومات العميل (منفصل لأنه جدول مختلف)
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

      // تحديث الطلب محلياً
      const updatedOrder = {
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
      };

      onOrderUpdated(updatedOrder);
      toast.success('تم حفظ التعديلات بنجاح');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to save order edits:', error);
      toast.error(error.message || 'فشل في حفظ التعديلات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package2 className="w-5 h-5" />
              تعديل الطلبية #{order?.customer_order_number || order?.id?.slice(0, 8)}
            </DialogTitle>
            <DialogDescription>
              تعديل شامل لجميع تفاصيل الطلبية
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* معلومات العميل */}
            <div className="bg-card rounded-lg p-6 border border-border/20">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                معلومات العميل
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium">
                    الاسم الكامل <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    value={editedData.fullName || ''}
                    onChange={(e) => updateEditedField('fullName', e.target.value)}
                    placeholder="أدخل الاسم الكامل"
                    className="h-10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">
                    رقم الهاتف <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={editedData.phone || ''}
                    onChange={(e) => updateEditedField('phone', e.target.value)}
                    placeholder="0555123456"
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* معلومات العنوان */}
            <div className="bg-card rounded-lg p-6 border border-border/20">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                معلومات العنوان والشحن
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="province" className="text-sm font-medium">
                    الولاية <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={editedData.province?.toString() || ''}
                    onValueChange={(value) => updateEditedField('province', value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="اختر الولاية" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {availableProvinces.map((province) => (
                        <SelectItem key={province.id} value={province.id.toString()}>
                          {province.name_ar || province.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="municipality" className="text-sm font-medium">
                    البلدية <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={editedData.municipality?.toString() || ''}
                    onValueChange={(value) => updateEditedField('municipality', value)}
                    disabled={!editedData.province}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={editedData.province ? "اختر البلدية" : "اختر الولاية أولاً"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {availableMunicipalities.map((municipality) => (
                        <SelectItem key={municipality.id} value={municipality.id.toString()}>
                          {municipality.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium">
                  العنوان التفصيلي
                </Label>
                <Textarea
                  id="address"
                  value={editedData.address || ''}
                  onChange={(e) => updateEditedField('address', e.target.value)}
                  placeholder="أدخل العنوان التفصيلي"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>

            {/* نوع التوصيل */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-6 border-2 border-indigo-200 dark:border-indigo-800/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                  <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                نوع التوصيل
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deliveryType" className="text-sm font-medium">
                    اختر نوع التوصيل
                  </Label>
                  <Select
                    value={isStopDesk ? 'office' : 'home'}
                    onValueChange={handleDeliveryTypeChange}
                  >
                    <SelectTrigger className="h-10" id="deliveryType">
                      <SelectValue placeholder="اختر نوع التوصيل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4" />
                          <span>توصيل للمنزل</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="office">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          <span>توصيل للمكتب</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* اختيار المكتب إذا كان التوصيل للمكتب */}
                {isStopDesk && (
                  <div className="space-y-2 pt-3 border-t border-indigo-200 dark:border-indigo-800">
                    <Label className="text-sm font-medium">
                      المكتب <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      {stopdeskId ? (
                        <div className="flex-1 p-3 bg-white dark:bg-gray-800 rounded-lg border border-indigo-200 dark:border-indigo-800">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-sm font-medium">
                              مكتب رقم: {stopdeskId}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            ⚠️ يرجى اختيار مكتب التوصيل
                          </p>
                        </div>
                      )}
                      {currentOrganization?.id && editedData.province && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setStopDeskDialogOpen(true)}
                          className="gap-1.5"
                        >
                          <Building2 className="w-4 h-4" />
                          {stopdeskId ? 'تغيير' : 'اختيار'}
                        </Button>
                      )}
                    </div>
                    {!editedData.province && (
                      <p className="text-xs text-muted-foreground">
                        يرجى اختيار الولاية والبلدية أولاً
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* المنتجات */}
            <div className="bg-card rounded-lg p-6 border border-border/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <div className="p-1.5 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                    <Package2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  المنتجات ({editedData.items?.length || 0})
                </h3>
                {currentOrganization?.id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAddProductDialogOpen(true)}
                    className="gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة منتج
                  </Button>
                )}
              </div>
              
              {editedData.items && editedData.items.length > 0 ? (
                <div className="space-y-3">
                  {editedData.items.map((item: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-muted/10 rounded-lg border border-border/10">
                      {/* صورة المنتج */}
                      <div className="w-12 h-12 rounded bg-muted/30 flex items-center justify-center flex-shrink-0">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.product_name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <Package2 className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      
                      {/* معلومات المنتج */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm mb-1">{item.product_name}</div>
                        <div className="flex items-center gap-2 text-xs">
                          {item.color_name && (
                            <Badge variant="outline" className="h-5 px-1.5">
                              {item.color_code && (
                                <div 
                                  className="w-2.5 h-2.5 rounded-full border mr-1" 
                                  style={{ backgroundColor: item.color_code }}
                                />
                              )}
                              {item.color_name}
                            </Badge>
                          )}
                          {item.size_name && (
                            <Badge variant="outline" className="h-5 px-1.5">
                              {item.size_name}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatCurrency(item.unit_price)} × {item.quantity}
                        </div>
                      </div>
                      
                      {/* عناصر التحكم */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => updateItemQuantity(index, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => updateItemQuantity(index, item.quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                        <div className="font-bold text-sm w-20 text-center">
                          {formatCurrency(item.total_price)}
                        </div>
                        {editedData.items.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  لا توجد منتجات في هذا الطلب
                </p>
              )}
            </div>

            {/* الملخص المالي */}
            <div className="bg-card rounded-lg p-6 border border-border/20">
              <h3 className="text-lg font-semibold mb-4">
                الملخص المالي
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">المجموع الفرعي:</span>
                  <span className="font-medium">{formatCurrency(editedData.subtotal || 0)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <Label htmlFor="shipping_cost" className="text-sm text-muted-foreground">
                    سعر التوصيل:
                  </Label>
                  <div className="flex items-center gap-2">
                    {isCalculatingDelivery && (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                    <Input
                      id="shipping_cost"
                      type="number"
                      value={editedData.shipping_cost || 0}
                      onChange={(e) => updateEditedField('shipping_cost', parseFloat(e.target.value) || 0)}
                      className="h-9 w-32 text-right"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <Label htmlFor="discount" className="text-sm text-muted-foreground">
                    التخفيض:
                  </Label>
                  <Input
                    id="discount"
                    type="number"
                    value={editedData.discount || 0}
                    onChange={(e) => updateEditedField('discount', parseFloat(e.target.value) || 0)}
                    className="h-9 w-32 text-right"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
                
                <div className="flex justify-between items-center pt-3 border-t text-base font-bold">
                  <span>المجموع الكلي:</span>
                  <span className="text-primary text-lg">
                    {formatCurrency(
                      (editedData.subtotal || 0) + 
                      (editedData.shipping_cost || 0) - 
                      (editedData.discount || 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              <X className="w-4 h-4 ml-2" />
              إلغاء
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  حفظ التعديلات
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* نافذة اختيار المكتب */}
      {currentOrganization?.id && stopDeskDialogOpen && (
        <StopDeskSelectionDialog
          open={stopDeskDialogOpen}
          onOpenChange={setStopDeskDialogOpen}
          onConfirm={handleStopDeskConfirm}
          wilayaId={editedData.province || editedData.wilaya || editedData.wilayaId}
          communeId={editedData.municipality || editedData.commune || editedData.communeId}
          organizationId={currentOrganization.id}
        />
      )}

      {/* نافذة إضافة منتج */}
      {currentOrganization?.id && (
        <AddProductDialog
          open={addProductDialogOpen}
          onOpenChange={setAddProductDialogOpen}
          onAddProduct={addNewProduct}
          organizationId={currentOrganization.id}
        />
      )}
    </>
  );
});

OrderEditDialog.displayName = 'OrderEditDialog';

export default OrderEditDialog;
