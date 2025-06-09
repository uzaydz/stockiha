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
import { supabase } from '@/lib/supabase';

interface QuickReturnDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onReturnCreated?: () => void;
}

interface Order {
  id: string;
  customer_order_number: string;
  customer_name: string;
  total: number;
  created_at: string;
  order_items: Array<{
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

interface OrderResponse {
  id: string;
  customer_order_number: string | number;
  total: number;
  created_at: string;
  customer: { name: string } | null;
  order_items: Array<{
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

const QuickReturnDialog: React.FC<QuickReturnDialogProps> = ({
  isOpen,
  onOpenChange,
  onReturnCreated
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
    }>
  });

  // Search for order
  const searchOrder = async () => {
    if (!searchOrderId || !currentOrganization?.id) return;

    setSearchingOrder(true);
    try {
      // استخراج الجزء الرقمي من معرف البحث
      const numericOrderId = searchOrderId.replace(/[^\d]/g, '');
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchOrderId);
      
      let query = supabase
        .from('orders')
        .select(`
          id,
          customer_order_number,
          total,
          created_at,
          customer:customers(name),
          order_items(
            id,
            product_id,
            product_name,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('is_online', false);

      // البحث حسب نوع المعرف
      if (isUUID) {
        // إذا كان UUID، ابحث في معرف الطلبية
        query = query.eq('id', searchOrderId);
      } else if (numericOrderId) {
        // إذا كان رقمياً، ابحث في رقم الطلبية
        query = query.eq('customer_order_number', parseInt(numericOrderId));
      } else {
        toast.error('معرف الطلبية غير صحيح');
        setSearchingOrder(false);
        return;
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        if (data.length === 1) {
          // نتيجة واحدة فقط
          const orderData = data[0] as unknown as OrderResponse;
          setFoundOrder({
            id: orderData.id,
            customer_order_number: String(orderData.customer_order_number),
            customer_name: orderData.customer?.name || 'زائر',
            total: orderData.total,
            created_at: orderData.created_at,
            order_items: orderData.order_items
          });
          setStep('details');
        } else {
          // عدة نتائج - اختر أحدث طلبية
          const latestOrder = data.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0] as unknown as OrderResponse;
          
          setFoundOrder({
            id: latestOrder.id,
            customer_order_number: String(latestOrder.customer_order_number),
            customer_name: latestOrder.customer?.name || 'زائر',
            total: latestOrder.total,
            created_at: latestOrder.created_at,
            order_items: latestOrder.order_items
          });
          setStep('details');
          
          toast.success(`تم العثور على ${data.length} طلبيات برقم ${numericOrderId}. تم اختيار أحدث طلبية.`);
        }
      } else {
        toast.error('لم يتم العثور على طلبية بهذا الرقم');
      }
    } catch (error) {
      console.error('Error searching order:', error);
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
      const { data, error } = await supabase.rpc('create_return_request' as any, {
        p_original_order_id: foundOrder.id,
        p_return_type: returnForm.returnType,
        p_return_reason: returnForm.returnReason,
        p_return_reason_description: returnForm.description,
        p_items_to_return: returnForm.returnType === 'partial' ? returnForm.selectedItems : [],
        p_refund_method: returnForm.refundMethod,
        p_notes: returnForm.notes,
        p_created_by: user.id,
        p_organization_id: currentOrganization.id
      });

      if (error) throw error;

      if ((data as any)?.success) {
        toast.success('تم إنشاء طلب الإرجاع بنجاح');
        resetForm();
        onOpenChange(false);
        onReturnCreated?.();
      } else {
        toast.error((data as any)?.error || 'حدث خطأ في إنشاء طلب الإرجاع');
      }
    } catch (error) {
      console.error('Error creating return:', error);
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

  // Handle item selection for partial returns
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
        // Add item if not selected
        return {
          ...prev,
          selectedItems: [
            ...prev.selectedItems,
            {
              order_item_id: itemId,
              return_quantity: quantity,
              condition_status: 'good'
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
                    <Label>عناصر الطلبية</Label>
                    <div className="mt-2 border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>المنتج</TableHead>
                            <TableHead>الكمية</TableHead>
                            <TableHead>السعر</TableHead>
                            <TableHead>المجموع</TableHead>
                            {returnForm.returnType === 'partial' && (
                              <TableHead>إرجاع؟</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {foundOrder.order_items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.product_name}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                              <TableCell>{formatCurrency(item.total_price)}</TableCell>
                              {returnForm.returnType === 'partial' && (
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={returnForm.selectedItems.some(
                                      si => si.order_item_id === item.id
                                    )}
                                    onChange={() => toggleItemSelection(item.id, item.quantity)}
                                  />
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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
                          <SelectItem value="defective">منتج معيب</SelectItem>
                          <SelectItem value="wrong_item">منتج خاطئ</SelectItem>
                          <SelectItem value="customer_request">طلب العميل</SelectItem>
                          <SelectItem value="damaged">تالف</SelectItem>
                          <SelectItem value="expired">منتهي الصلاحية</SelectItem>
                          <SelectItem value="wrong_size">مقاس خاطئ</SelectItem>
                          <SelectItem value="wrong_color">لون خاطئ</SelectItem>
                          <SelectItem value="quality_issue">مشكلة في الجودة</SelectItem>
                          <SelectItem value="other">أخرى</SelectItem>
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