import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package2, Loader2, Search, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/utils/ordersHelpers';
import { toast } from 'sonner';

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProduct: (product: any) => void;
  organizationId: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  sku?: string;
  product_colors?: Array<{
    id: string;
    name: string;
    color_code: string;
    image_url?: string;
    price: number;
    has_sizes?: boolean;
    product_sizes?: Array<{
      id: string;
      size_name: string;
      price: number;
      quantity: number;
    }>;
  }>;
}

const AddProductDialog: React.FC<AddProductDialogProps> = ({
  open,
  onOpenChange,
  onAddProduct,
  organizationId,
}) => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);

  // جلب المنتجات
  useEffect(() => {
    if (open && organizationId) {
      fetchProducts();
    }
  }, [open, organizationId]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          sku,
          product_colors (
            id,
            name,
            color_code,
            image_url,
            price,
            has_sizes,
            product_sizes (
              id,
              size_name,
              price,
              quantity
            )
          )
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error('فشل في تحميل المنتجات');
    } finally {
      setLoading(false);
    }
  };

  // تصفية المنتجات بناءً على البحث
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // إعادة تعيين الحوار
  const resetDialog = () => {
    setSelectedProduct(null);
    setSelectedColor(null);
    setSelectedSize(null);
    setQuantity(1);
    setSearchQuery('');
  };

  // إضافة المنتج
  const handleAddProduct = () => {
    if (!selectedProduct) {
      toast.error('يرجى اختيار منتج');
      return;
    }

    // حساب السعر بناءً على اللون والمقاس المحدد
    let finalPrice = selectedProduct.price;
    if (selectedSize && selectedSize.price) {
      finalPrice = selectedSize.price;
    } else if (selectedColor && selectedColor.price) {
      finalPrice = selectedColor.price;
    }

    let productToAdd: any = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity: quantity,
      unit_price: finalPrice,
      total_price: finalPrice * quantity,
      image_url: selectedColor?.image_url || null,
    };

    // إضافة معلومات اللون إذا تم اختياره
    if (selectedColor) {
      productToAdd.color_id = selectedColor.id;
      productToAdd.color_name = selectedColor.name;
    }

    // إضافة معلومات المقاس إذا تم اختياره
    if (selectedSize) {
      productToAdd.size_id = selectedSize.id;
      productToAdd.size_name = selectedSize.size_name;
    }

    onAddProduct(productToAdd);
    resetDialog();
    onOpenChange(false);
    toast.success('تم إضافة المنتج بنجاح');
  };

  // عند اختيار منتج
  const handleSelectProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    setSelectedProduct(product || null);
    setSelectedColor(null);
    setSelectedSize(null);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetDialog();
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package2 className="w-5 h-5" />
            إضافة منتج للطلبية
          </DialogTitle>
          <DialogDescription>
            اختر منتج لإضافته إلى الطلبية
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* بحث عن المنتجات */}
          <div className="space-y-2">
            <Label>البحث عن منتج</Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بالاسم أو الكود..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          {/* اختيار المنتج */}
          <div className="space-y-2">
            <Label>المنتج</Label>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select
                value={selectedProduct?.id || ''}
                onValueChange={handleSelectProduct}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر منتج" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {filteredProducts.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      {searchQuery ? 'لا توجد منتجات تطابق البحث' : 'لا توجد منتجات متاحة'}
                    </div>
                  ) : (
                    filteredProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                            <Package2 className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{product.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(product.price)}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* اختيار اللون (إذا كانت متوفرة) */}
          {selectedProduct && selectedProduct.product_colors && selectedProduct.product_colors.length > 0 && (
            <div className="space-y-2">
              <Label>اللون</Label>
              <Select
                value={selectedColor?.id || ''}
                onValueChange={(colorId) => {
                  const color = selectedProduct.product_colors?.find((c) => c.id === colorId);
                  setSelectedColor(color || null);
                  setSelectedSize(null); // إعادة تعيين المقاس عند تغيير اللون
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر اللون (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون لون محدد</SelectItem>
                  {selectedProduct.product_colors.map((color) => (
                    <SelectItem key={color.id} value={color.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: color.color_code }}
                        />
                        <span>{color.name}</span>
                        {color.price && (
                          <span className="text-xs text-muted-foreground">
                            ({formatCurrency(color.price)})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* اختيار المقاس (إذا كانت متوفرة للون المحدد) */}
          {selectedColor && selectedColor.has_sizes && selectedColor.product_sizes && selectedColor.product_sizes.length > 0 && (
            <div className="space-y-2">
              <Label>المقاس</Label>
              <Select
                value={selectedSize?.id || ''}
                onValueChange={(sizeId) => {
                  const size = selectedColor.product_sizes?.find((s) => s.id === sizeId);
                  setSelectedSize(size || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المقاس" />
                </SelectTrigger>
                <SelectContent>
                  {selectedColor.product_sizes.map((size) => (
                    <SelectItem key={size.id} value={size.id}>
                      <div className="flex items-center gap-2">
                        <span>{size.size_name}</span>
                        {size.price && (
                          <span className="text-xs text-muted-foreground">
                            ({formatCurrency(size.price)})
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          - متوفر: {size.quantity}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* الكمية */}
          <div className="space-y-2">
            <Label>الكمية</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                -
              </Button>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center"
                min="1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </Button>
            </div>
          </div>

          {/* معاينة السعر */}
          {selectedProduct && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">السعر الإجمالي:</span>
                <span className="text-lg font-bold">
                  {formatCurrency(
                    (selectedSize?.price || selectedColor?.price || selectedProduct.price) * quantity
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetDialog();
              onOpenChange(false);
            }}
          >
            إلغاء
          </Button>
          <Button onClick={handleAddProduct} disabled={!selectedProduct}>
            <Plus className="w-4 h-4 ml-1" />
            إضافة المنتج
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductDialog;

