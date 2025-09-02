import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  Package,
  Loader2,
  AlertTriangle,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// Types
interface POSOrderWithDetails {
  id: string;
  organization_id: string;
  customer_id?: string;
  employee_id?: string;
  slug?: string;
  customer_order_number?: number;
  status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  subtotal: number;
  tax: number;
  discount?: number;
  amount_paid?: number;
  remaining_amount?: number;
  is_online: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  employee?: {
    id: string;
    name: string;
    email: string;
  };
  order_items: any[];
  items_count: number;
  effective_status?: string;
  effective_total?: number;
  original_total?: number;
  has_returns?: boolean;
  is_fully_returned?: boolean;
  total_returned_amount?: number;
}

interface EditOrderItemsDialogProps {
  order: POSOrderWithDetails | null;
  open: boolean;
  onClose: () => void;
  onSave: (orderId: string, updatedItems: OrderItem[]) => Promise<boolean>;
  onRefresh: () => void;
}

interface OrderItem {
  id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_wholesale: boolean;
  color_id?: string;
  size_id?: string;
  color_name?: string;
  size_name?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  wholesale_price: number;
  stock_quantity: number;
  barcode?: string;
}

export const EditOrderItemsDialog: React.FC<EditOrderItemsDialogProps> = ({
  order,
  open,
  onClose,
  onSave,
  onRefresh
}) => {
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [subtotal, setSubtotal] = useState(0);
  const [originalTotal, setOriginalTotal] = useState(0);

  // تحميل المنتجات عند فتح النافذة
  useEffect(() => {
    if (open && order) {
      setItems(order.order_items.map(item => ({
        ...item,
        product_name: item.product_name || item.name || ''
      })));
      setOriginalTotal(parseFloat(order.total.toString()));
      loadProducts();
    }
  }, [open, order]);

  // حساب المجموع الفرعي عند تغيير العناصر
  useEffect(() => {
    const total = items.reduce((sum, item) => sum + item.total_price, 0);
    setSubtotal(total);
  }, [items]);

  const loadProducts = async () => {
    if (!order?.organization_id) return;
    
    try {
      setSearchLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, wholesale_price, stock_quantity, barcode')
        .eq('organization_id', order.organization_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      toast.error('فشل في تحميل المنتجات');
    } finally {
      setSearchLoading(false);
    }
  };

  const searchProducts = async (query: string) => {
    if (!query || query.length < 2) {
      loadProducts();
      return;
    }

    if (!order?.organization_id) return;

    try {
      setSearchLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, wholesale_price, stock_quantity, barcode')
        .eq('organization_id', order.organization_id)
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,barcode.ilike.%${query}%`)
        .order('name')
        .limit(50);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      toast.error('فشل في البحث عن المنتجات');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const updatedItems = [...items];
    updatedItems[index].quantity = quantity;
    updatedItems[index].total_price = quantity * updatedItems[index].unit_price;
    setItems(updatedItems);
  };

  const handlePriceChange = (index: number, price: number) => {
    const updatedItems = [...items];
    updatedItems[index].unit_price = price;
    updatedItems[index].total_price = updatedItems[index].quantity * price;
    setItems(updatedItems);
  };

  const handleWholesaleToggle = (index: number, isWholesale: boolean) => {
    const updatedItems = [...items];
    const product = products.find(p => p.id === updatedItems[index].product_id);
    if (product) {
      updatedItems[index].is_wholesale = isWholesale;
      updatedItems[index].unit_price = isWholesale ? product.wholesale_price : product.price;
      updatedItems[index].total_price = updatedItems[index].quantity * updatedItems[index].unit_price;
      setItems(updatedItems);
    }
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  const handleAddItem = () => {
    if (!selectedProductId) {
      toast.error('الرجاء اختيار منتج');
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const existingItemIndex = items.findIndex(item => item.product_id === selectedProductId);
    
    if (existingItemIndex >= 0) {
      // إذا كان المنتج موجود، زيادة الكمية
      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity += 1;
      updatedItems[existingItemIndex].total_price = 
        updatedItems[existingItemIndex].quantity * updatedItems[existingItemIndex].unit_price;
      setItems(updatedItems);
    } else {
      // إضافة منتج جديد
      const newItem: OrderItem = {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
        total_price: product.price,
        is_wholesale: false
      };
      setItems([...items, newItem]);
    }
    
    setSelectedProductId('');
  };

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error('لا يمكن حفظ طلبية بدون منتجات');
      return;
    }

    setLoading(true);
    try {
      const success = await onSave(order!.id, items);
      if (success) {
        toast.success('تم تحديث عناصر الطلبية بنجاح');
        onRefresh();
        onClose();
      } else {
        toast.error('فشل في تحديث عناصر الطلبية');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ التغييرات');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ar-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' دج';
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            تعديل عناصر الطلبية #{order.slug?.slice(-8) || order.id.slice(-8)}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* إضافة منتج جديد */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" />
                إضافة منتج
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="ابحث عن المنتجات بالاسم أو الباركود..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchProducts(e.target.value);
                    }}
                    className="pr-10"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="اختر منتج..." />
                  </SelectTrigger>
                  <SelectContent>
                    {searchLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : products.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        لا توجد منتجات
                      </div>
                    ) : (
                      products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{product.name}</span>
                            <span className="text-xs text-muted-foreground mr-2">
                              {formatCurrency(product.price)}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleAddItem} 
                  disabled={!selectedProductId}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  إضافة
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* جدول العناصر */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  عناصر الطلبية ({items.length})
                </span>
                <Badge variant="secondary">
                  المجموع: {formatCurrency(subtotal)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>لا توجد منتجات في الطلبية</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المنتج</TableHead>
                      <TableHead className="text-center">الكمية</TableHead>
                      <TableHead className="text-center">السعر</TableHead>
                      <TableHead className="text-center">نوع البيع</TableHead>
                      <TableHead className="text-center">المجموع</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={item.id || index}>
                        <TableCell className="font-medium">
                          {item.product_name}
                          {(item.color_name || item.size_name) && (
                            <div className="text-xs text-muted-foreground">
                              {item.color_name && <span>اللون: {item.color_name}</span>}
                              {item.color_name && item.size_name && <span> • </span>}
                              {item.size_name && <span>المقاس: {item.size_name}</span>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                            className="w-20 text-center mx-auto"
                            min="1"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handlePriceChange(index, parseFloat(e.target.value) || 0)}
                            className="w-24 text-center mx-auto"
                            min="0"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Select 
                            value={item.is_wholesale ? 'wholesale' : 'retail'}
                            onValueChange={(value) => handleWholesaleToggle(index, value === 'wholesale')}
                          >
                            <SelectTrigger className="w-24 mx-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="retail">تجزئة</SelectItem>
                              <SelectItem value="wholesale">جملة</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {formatCurrency(item.total_price)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* ملخص التغييرات */}
          {Math.abs(subtotal - originalTotal) > 0.01 && (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">تنبيه: سيتم تحديث قيمة الطلبية</span>
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>القيمة الأصلية:</span>
                    <span>{formatCurrency(originalTotal)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>القيمة الجديدة:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between">
                    <span>الفرق:</span>
                    <span className={subtotal > originalTotal ? 'text-red-600' : 'text-green-600'}>
                      {subtotal > originalTotal ? '+' : ''}{formatCurrency(subtotal - originalTotal)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={loading || items.length === 0}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                حفظ التغييرات
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
