import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Package,
  ShoppingCart,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { unifiedOrderService } from '@/services/UnifiedOrderService';
import { unifiedCustomerService } from '@/services/UnifiedCustomerService';
import { createLocalProductReturn } from '@/api/localProductReturnService';
import { RETURN_REASONS_ARRAY } from '@/constants/returnReasons';

interface QuickReturnDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onReturnCreated?: () => void;
  /**
   * ⚡ طلبية محددة مسبقاً - لتخطي خطوة البحث
   * يُستخدم عند الإرجاع من صفحة الطلبيات
   */
  preselectedOrder?: {
    id: string;
    customer_order_number?: string | number;
    customer_id?: string;
    customer_name?: string;
    total: number;
    created_at: string;
    order_items?: Array<{
      id: string;
      product_id: string;
      product_name?: string;
      product_sku?: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      color_id?: string;
      size_id?: string;
      color_name?: string;
      size_name?: string;
      selling_unit_type?: 'piece' | 'weight' | 'meter' | 'box';
      weight_sold?: number;
      weight_unit?: string;
      price_per_weight_unit?: number;
      meters_sold?: number;
      price_per_meter?: number;
      boxes_sold?: number;
      units_per_box?: number;
      box_price?: number;
      is_wholesale?: boolean;
      sale_type?: 'retail' | 'wholesale' | 'partial_wholesale';
    }>;
  } | null;
}

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  // ⚡ حقول المتغيرات
  color_id?: string;
  size_id?: string;
  color_name?: string;
  size_name?: string;
  // ⚡ حقول أنواع البيع المختلفة
  selling_unit_type?: 'piece' | 'weight' | 'meter' | 'box';
  weight_sold?: number;
  weight_unit?: string;
  price_per_weight_unit?: number;
  meters_sold?: number;
  price_per_meter?: number;
  boxes_sold?: number;
  units_per_box?: number;
  box_price?: number;
  // ⚡ حقول الجملة
  is_wholesale?: boolean;
  sale_type?: 'retail' | 'wholesale' | 'partial_wholesale';
}

interface Order {
  id: string;
  customer_order_number: string;
  customer_name: string;
  total: number;
  created_at: string;
  order_items: OrderItem[];
}

interface OrderResponse {
  id: string;
  customer_order_number: string | number;
  total: number;
  created_at: string;
  customer: { name: string } | null;
  order_items: OrderItem[];
}

const QuickReturnDialog: React.FC<QuickReturnDialogProps> = ({
  isOpen,
  onOpenChange,
  onReturnCreated,
  preselectedOrder
}) => {
  const { user } = useAuth();
  const { currentOrganization } = useTenant();

  // State
  const [step, setStep] = useState<'search' | 'details' | 'processing'>('search');
  const [searchOrderId, setSearchOrderId] = useState('');
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [searchingOrder, setSearchingOrder] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Return form
  const [returnForm, setReturnForm] = useState({
    returnType: 'partial' as 'full' | 'partial',
    returnReason: 'customer_request',
    description: '',
    refundMethod: 'cash' as 'cash' | 'card' | 'credit' | 'exchange' | 'store_credit',
    notes: '',
    selectedItems: [] as Array<{
      order_item_id: string;
      return_quantity: number;
      condition_status: string;
      // ⚡ حقول أنواع البيع المختلفة
      selling_unit_type?: 'piece' | 'weight' | 'meter' | 'box';
      weight_returned?: number;
      weight_unit?: string;
      price_per_weight_unit?: number;
      meters_returned?: number;
      price_per_meter?: number;
      boxes_returned?: number;
      units_per_box?: number;
      box_price?: number;
      // ⚡ حقول الجملة
      is_wholesale?: boolean;
      sale_type?: 'retail' | 'wholesale' | 'partial_wholesale';
    }>
  });

  /**
   * ⚡ حساب مبلغ الإرجاع حسب نوع البيع
   */
  const calculateItemReturnAmount = (item: OrderItem, returnItem: typeof returnForm.selectedItems[0]): number => {
    const sellingType = item.selling_unit_type || 'piece';

    switch (sellingType) {
      case 'weight':
        return (returnItem.weight_returned || 0) * (item.price_per_weight_unit || 0);
      case 'meter':
        return (returnItem.meters_returned || 0) * (item.price_per_meter || 0);
      case 'box':
        return (returnItem.boxes_returned || 0) * (item.box_price || 0);
      case 'piece':
      default:
        return (returnItem.return_quantity || 0) * (item.unit_price || 0);
    }
  };

  // Search for order
  const searchOrder = async () => {
    if (!searchOrderId || !currentOrganization?.id) return;

    setSearchingOrder(true);
    try {
      // استخراج الجزء الرقمي من معرف البحث
      const numericOrderId = searchOrderId.replace(/[^\d]/g, '');
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchOrderId);
      
      // ⚡ استخدام UnifiedOrderService للبحث محلياً
      unifiedOrderService.setOrganizationId(currentOrganization.id);
      let orderData = null;
      
      if (isUUID) {
        // إذا كان UUID، ابحث في معرف الطلبية
        orderData = await unifiedOrderService.getOrder(searchOrderId);
      } else if (numericOrderId) {
        // إذا كان رقمياً، ابحث في رقم الطلبية
        const orders = await unifiedOrderService.searchOrdersWithFilters({
          organizationId: currentOrganization.id,
          customerOrderNumber: parseInt(numericOrderId),
          is_online: false
        });
        orderData = orders.length > 0 ? orders[0] : null;
      } else {
        toast.error('معرف الطلبية غير صحيح');
        setSearchingOrder(false);
        return;
      }

      if (!orderData) {
        toast.error('الطلبية غير موجودة');
        setSearchingOrder(false);
        return;
      }

      // ⚡ جلب تفاصيل الطلبية مع العناصر
      unifiedOrderService.setOrganizationId(currentOrganization.id);
      const orderWithItems = await unifiedOrderService.getOrder(orderData.id);
      if (!orderWithItems) {
        toast.error('لم يتم العثور على طلبية بهذا الرقم');
        setSearchingOrder(false);
        return;
      }

      // جلب بيانات العميل
      let customerName = 'زائر';
      if (orderWithItems.customer_id) {
        unifiedCustomerService.setOrganizationId(currentOrganization.id);
        const customer = await unifiedCustomerService.getCustomer(orderWithItems.customer_id);
        customerName = customer?.name || 'زائر';
      }
      
      setFoundOrder({
        id: orderWithItems.id,
        customer_order_number: String(orderWithItems.customer_order_number || ''),
        customer_name: customerName,
        total: orderWithItems.total,
        created_at: orderWithItems.created_at,
        order_items: orderWithItems.items.map(item => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name || item.name,
          product_sku: item.product_sku || item.sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          // ⚡ حقول المتغيرات
          color_id: item.color_id,
          color_name: item.color_name,
          size_id: item.size_id,
          size_name: item.size_name,
          // ⚡ حقول نوع البيع
          selling_unit_type: item.selling_unit_type,
          weight_sold: item.weight_sold,
          weight_unit: item.weight_unit,
          price_per_weight_unit: item.price_per_weight_unit,
          meters_sold: item.meters_sold,
          price_per_meter: item.price_per_meter,
          boxes_sold: item.boxes_sold,
          units_per_box: item.units_per_box,
          box_price: item.box_price,
          // ⚡ حقول الجملة
          is_wholesale: item.is_wholesale,
          sale_type: item.sale_type,
        }))
      });
      setStep('details');
    } catch (error) {
      toast.error('حدث خطأ في البحث عن الطلبية');
    } finally {
      setSearchingOrder(false);
    }
  };

  // Create return request
  const createReturnRequest = async () => {
    if (!foundOrder || !user?.id || !currentOrganization?.id) return;

    setProcessing(true);
    try {
      // ⚡ استخدام createLocalProductReturn لإنشاء الإرجاع محلياً
      const returnNumber = `RET-${Date.now()}`;
      const itemsToReturn = returnForm.returnType === 'partial'
        ? returnForm.selectedItems
        : foundOrder.order_items.map(item => ({
            order_item_id: item.id,
            return_quantity: item.quantity,
            condition_status: 'good',
            // ⚡ نقل معلومات أنواع البيع من الطلب
            selling_unit_type: item.selling_unit_type,
            weight_returned: item.weight_sold,
            weight_unit: item.weight_unit,
            price_per_weight_unit: item.price_per_weight_unit,
            meters_returned: item.meters_sold,
            price_per_meter: item.price_per_meter,
            boxes_returned: item.boxes_sold,
            units_per_box: item.units_per_box,
            box_price: item.box_price,
            // ⚡ حقول الجملة
            is_wholesale: item.is_wholesale,
            sale_type: item.sale_type,
          }));

      // ⚡ إنشاء عناصر الإرجاع مع دعم أنواع البيع المختلفة
      const returnItems = itemsToReturn.map(selectedItem => {
        const orderItem = foundOrder.order_items.find(item => item.id === selectedItem.order_item_id);
        const totalPrice = calculateItemReturnAmount(orderItem!, selectedItem);

        return {
          organization_id: currentOrganization.id, // ⚡ مطلوب
          original_order_item_id: orderItem!.id, // ⚡ ربط بالعنصر الأصلي
          product_id: orderItem!.product_id,
          product_name: orderItem!.product_name,
          product_sku: orderItem!.product_sku || null,
          original_quantity: orderItem!.quantity, // ⚡ الكمية الأصلية في الطلب
          return_quantity: selectedItem.return_quantity,
          original_unit_price: orderItem!.unit_price, // ⚡ السعر الأصلي
          return_unit_price: orderItem!.unit_price, // ⚡ سعر الإرجاع (عادة نفس السعر الأصلي)
          total_return_amount: totalPrice, // ⚡ الاسم الصحيح للحقل
          condition_status: selectedItem.condition_status,
          resellable: selectedItem.condition_status === 'good',
          inventory_returned: selectedItem.condition_status === 'good',
          // ⚡ حقول المتغيرات
          color_id: orderItem!.color_id || null,
          color_name: orderItem!.color_name || null,
          size_id: orderItem!.size_id || null,
          size_name: orderItem!.size_name || null,
          // ⚡ حقول أنواع البيع المختلفة
          selling_unit_type: selectedItem.selling_unit_type || orderItem!.selling_unit_type || 'piece',
          weight_returned: selectedItem.weight_returned || null,
          weight_unit: selectedItem.weight_unit || orderItem!.weight_unit || null,
          price_per_weight_unit: selectedItem.price_per_weight_unit || orderItem!.price_per_weight_unit || null,
          meters_returned: selectedItem.meters_returned || null,
          price_per_meter: selectedItem.price_per_meter || orderItem!.price_per_meter || null,
          boxes_returned: selectedItem.boxes_returned || null,
          units_per_box: selectedItem.units_per_box || orderItem!.units_per_box || null,
          box_price: selectedItem.box_price || orderItem!.box_price || null,
          // ⚡ حقول الجملة - نقلها من الطلب الأصلي
          original_sale_type: orderItem!.sale_type || 'retail',
          original_is_wholesale: orderItem!.is_wholesale || false,
        };
      });

      // ⚡ حساب المبلغ الإجمالي
      const totalReturnAmount = returnItems.reduce((sum, item) => sum + item.total_return_amount, 0);

      const { return: returnRecord } = await createLocalProductReturn({
        returnData: {
          organization_id: currentOrganization.id,
          return_number: returnNumber,
          customer_id: foundOrder.customer_name !== 'زائر' ? undefined : undefined, // TODO: get customer_id
          customer_name: foundOrder.customer_name,
          original_order_id: foundOrder.id,
          original_order_number: foundOrder.customer_order_number,
          return_type: returnForm.returnType === 'full' ? 'full' : 'partial', // ⚡ مطلوب في Supabase
          return_reason: returnForm.returnReason, // ⚡ مطلوب في Supabase
          return_reason_description: returnForm.description || null,
          status: 'pending',
          return_amount: totalReturnAmount,
          refund_amount: totalReturnAmount,
          refund_method: returnForm.refundMethod,
          notes: returnForm.notes || null,
          created_by: user.id
        },
        items: returnItems
      });

      toast.success('تم إنشاء طلب الإرجاع بنجاح');
      resetForm();
      onOpenChange(false);
      onReturnCreated?.();
    } catch (error) {
      console.error('[QuickReturnDialog] Error creating return:', error);
      toast.error('حدث خطأ في إنشاء طلب الإرجاع');
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setStep('search');
    setSearchOrderId('');
    setFoundOrder(null);
    setReturnForm({
      returnType: 'partial',
      returnReason: 'customer_request',
      description: '',
      refundMethod: 'cash',
      notes: '',
      selectedItems: []
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' دج';
  };

  // Handle item selection for partial returns - ⚡ يحفظ كل تفاصيل نوع البيع
  const toggleItemSelection = (itemId: string, quantity: number) => {
    setReturnForm(prev => {
      const existingIndex = prev.selectedItems.findIndex(item => item.order_item_id === itemId);

      if (existingIndex > -1) {
        // Remove item if already selected
        return {
          ...prev,
          selectedItems: prev.selectedItems.filter(item => item.order_item_id !== itemId)
        };
      } else {
        // ⚡ جلب بيانات المنتج الأصلية
        const originalItem = foundOrder?.order_items.find(i => i.id === itemId);

        // Add item if not selected - مع كل تفاصيل نوع البيع
        return {
          ...prev,
          selectedItems: [
            ...prev.selectedItems,
            {
              order_item_id: itemId,
              return_quantity: quantity,
              condition_status: 'good',
              // ⚡ نوع البيع
              selling_unit_type: originalItem?.selling_unit_type || 'piece',
              // ⚡ بيع الوزن
              weight_returned: originalItem?.weight_sold,
              weight_unit: originalItem?.weight_unit,
              price_per_weight_unit: originalItem?.price_per_weight_unit,
              // ⚡ بيع المتر
              meters_returned: originalItem?.meters_sold,
              price_per_meter: originalItem?.price_per_meter,
              // ⚡ بيع العلبة
              boxes_returned: originalItem?.boxes_sold,
              units_per_box: originalItem?.units_per_box,
              box_price: originalItem?.box_price,
              // ⚡ بيع الجملة
              is_wholesale: originalItem?.is_wholesale,
              sale_type: originalItem?.sale_type,
            }
          ]
        };
      }
    });
  };

  // Reset when dialog closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // ⚡ معالجة الطلبية المحددة مسبقاً - تخطي خطوة البحث
  useEffect(() => {
    if (isOpen && preselectedOrder && preselectedOrder.order_items && preselectedOrder.order_items.length > 0) {
      // تحويل الطلبية المحددة إلى الصيغة المطلوبة
      const order: Order = {
        id: preselectedOrder.id,
        customer_order_number: String(preselectedOrder.customer_order_number || ''),
        customer_name: preselectedOrder.customer_name || 'زائر',
        total: preselectedOrder.total,
        created_at: preselectedOrder.created_at,
        order_items: preselectedOrder.order_items.map(item => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name || 'منتج',
          product_sku: item.product_sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          color_id: item.color_id,
          size_id: item.size_id,
          color_name: item.color_name,
          size_name: item.size_name,
          selling_unit_type: item.selling_unit_type,
          weight_sold: item.weight_sold,
          weight_unit: item.weight_unit,
          price_per_weight_unit: item.price_per_weight_unit,
          meters_sold: item.meters_sold,
          price_per_meter: item.price_per_meter,
          boxes_sold: item.boxes_sold,
          units_per_box: item.units_per_box,
          box_price: item.box_price,
          is_wholesale: item.is_wholesale,
          sale_type: item.sale_type
        }))
      };

      setFoundOrder(order);
      setStep('details');
    }
  }, [isOpen, preselectedOrder]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            إرجاع سريع
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {step === 'search' && (
            <div className="space-y-4">
              <div>
                <Label>البحث عن الطلبية</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="رقم الطلبية أو معرف الطلبية"
                    value={searchOrderId}
                    onChange={(e) => setSearchOrderId(e.target.value)}
                    className="flex-1"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && searchOrderId) {
                        searchOrder();
                      }
                    }}
                  />
                  <Button 
                    onClick={searchOrder}
                    disabled={!searchOrderId || searchingOrder}
                  >
                    {searchingOrder ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    البحث
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                يمكنك البحث باستخدام:
                <ul className="mt-1 space-y-1">
                  <li>• رقم الطلبية (مثل: POS-68939377 أو 68939377)</li>
                  <li>• معرف الطلبية الكامل (UUID)</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'details' && foundOrder && (
            <div className="space-y-6">
              {/* معلومات الطلبية */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    تفاصيل الطلبية #{foundOrder.customer_order_number}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>العميل</Label>
                      <p className="font-medium">{foundOrder.customer_name}</p>
                    </div>
                    <div>
                      <Label>المجموع الإجمالي</Label>
                      <p className="font-medium">{formatCurrency(foundOrder.total)}</p>
                    </div>
                  </div>

                  {/* عناصر الطلبية */}
                  <div>
                    <Label>عناصر الطلبية للإرجاع</Label>
                    <div className="mt-2 border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[200px]">المنتج</TableHead>
                            <TableHead>نوع البيع</TableHead>
                            <TableHead>الكمية المباعة</TableHead>
                            <TableHead>السعر</TableHead>
                            <TableHead>المجموع</TableHead>
                            {returnForm.returnType === 'partial' && (
                              <TableHead className="text-center">إرجاع؟</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {foundOrder.order_items.map((item) => {
                            // ⚡ تحديد نوع البيع والكمية المعروضة
                            const sellingType = item.selling_unit_type || 'piece';
                            const getSellingTypeLabel = () => {
                              switch (sellingType) {
                                case 'weight': return `وزن (${item.weight_unit || 'كغ'})`;
                                case 'meter': return 'متر';
                                case 'box': return `علبة (${item.units_per_box || 0} قطعة)`;
                                case 'piece':
                                default: return 'قطعة';
                              }
                            };

                            const getQuantityDisplay = () => {
                              switch (sellingType) {
                                case 'weight':
                                  return `${item.weight_sold || 0} ${item.weight_unit || 'كغ'}`;
                                case 'meter':
                                  return `${item.meters_sold || 0} متر`;
                                case 'box':
                                  return `${item.boxes_sold || 0} علبة`;
                                case 'piece':
                                default:
                                  return `${item.quantity} قطعة`;
                              }
                            };

                            const getPriceDisplay = () => {
                              switch (sellingType) {
                                case 'weight':
                                  return `${formatCurrency(item.price_per_weight_unit || 0)}/${item.weight_unit || 'كغ'}`;
                                case 'meter':
                                  return `${formatCurrency(item.price_per_meter || 0)}/متر`;
                                case 'box':
                                  return `${formatCurrency(item.box_price || 0)}/علبة`;
                                case 'piece':
                                default:
                                  return formatCurrency(item.unit_price);
                              }
                            };

                            // ⚡ بناء اسم المنتج مع المتغيرات
                            const buildProductName = () => {
                              let name = item.product_name;
                              const variants = [];
                              if (item.color_name) variants.push(item.color_name);
                              if (item.size_name) variants.push(item.size_name);
                              if (variants.length > 0) {
                                name += ` (${variants.join(' - ')})`;
                              }
                              return name;
                            };

                            return (
                              <TableRow key={item.id} className="hover:bg-muted/50">
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    <span className="font-medium">{buildProductName()}</span>
                                    {/* شارات إضافية */}
                                    <div className="flex flex-wrap gap-1">
                                      {item.is_wholesale && (
                                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                          جملة
                                        </Badge>
                                      )}
                                      {item.sale_type === 'partial_wholesale' && (
                                        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                                          نصف جملة
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="whitespace-nowrap">
                                    {getSellingTypeLabel()}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium text-primary">
                                  {getQuantityDisplay()}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {getPriceDisplay()}
                                </TableCell>
                                <TableCell className="font-semibold">
                                  {formatCurrency(item.total_price)}
                                </TableCell>
                                {returnForm.returnType === 'partial' && (
                                  <TableCell className="text-center">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-gray-300"
                                      checked={returnForm.selectedItems.some(
                                        si => si.order_item_id === item.id
                                      )}
                                      onChange={() => toggleItemSelection(item.id, item.quantity)}
                                    />
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* ⚡ ملخص الإرجاع */}
                    <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                          {returnForm.returnType === 'full' ? 'إرجاع كامل' : `إرجاع جزئي (${returnForm.selectedItems.length} منتج)`}
                        </span>
                        <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                          {formatCurrency(
                            returnForm.returnType === 'full'
                              ? foundOrder.total
                              : returnForm.selectedItems.reduce((sum, si) => {
                                  const item = foundOrder.order_items.find(i => i.id === si.order_item_id);
                                  return sum + (item?.total_price || 0);
                                }, 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* إعدادات الإرجاع */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>نوع الإرجاع</Label>
                      <Select 
                        value={returnForm.returnType} 
                        onValueChange={(value: 'full' | 'partial') => 
                          setReturnForm(prev => ({ ...prev, returnType: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">إرجاع كامل</SelectItem>
                          <SelectItem value="partial">إرجاع جزئي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>سبب الإرجاع</Label>
                      <Select 
                        value={returnForm.returnReason} 
                        onValueChange={(value) => 
                          setReturnForm(prev => ({ ...prev, returnReason: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RETURN_REASONS_ARRAY.map((reason) => (
                            <SelectItem key={reason.value} value={reason.value}>
                              {reason.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>وصف السبب</Label>
                    <Textarea
                      placeholder="اكتب تفاصيل سبب الإرجاع..."
                      value={returnForm.description}
                      onChange={(e) => setReturnForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>طريقة الاسترداد</Label>
                    <Select 
                      value={returnForm.refundMethod} 
                      onValueChange={(value: any) => 
                        setReturnForm(prev => ({ ...prev, refundMethod: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">نقدي</SelectItem>
                        <SelectItem value="card">بطاقة</SelectItem>
                        <SelectItem value="credit">رصيد</SelectItem>
                        <SelectItem value="exchange">استبدال</SelectItem>
                        <SelectItem value="store_credit">رصيد متجر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>ملاحظات إضافية</Label>
                    <Textarea
                      placeholder="أي ملاحظات إضافية..."
                      value={returnForm.notes}
                      onChange={(e) => setReturnForm(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* أزرار التحكم */}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('search')}>
                  العودة للبحث
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    إلغاء
                  </Button>
                  <Button 
                    onClick={createReturnRequest}
                    disabled={
                      processing ||
                      (returnForm.returnType === 'partial' && returnForm.selectedItems.length === 0)
                    }
                  >
                    {processing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        جاري المعالجة...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        إنشاء طلب الإرجاع
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickReturnDialog;
