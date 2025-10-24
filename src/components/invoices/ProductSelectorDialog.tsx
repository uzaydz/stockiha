import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Barcode, Package, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/lib/api/products';
import { cn } from '@/lib/utils';

interface ProductSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onSelectProduct: (products: Array<{ product: Product; quantity: number }>) => void;
}

const ProductSelectorDialog = ({
  open,
  onOpenChange,
  products,
  onSelectProduct,
}: ProductSelectorDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map());
  const [isScanning, setIsScanning] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // تركيز على حقل الباركود عند فتح النافذة
  useEffect(() => {
    if (open && barcodeInputRef.current) {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // معالجة مسح الباركود
  useEffect(() => {
    if (!open) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // إذا كان المستخدم يكتب في حقل البحث، لا تفعل شيء
      if (document.activeElement === searchInputRef.current) return;

      // إذا كان Enter، ابحث عن المنتج بالباركود
      if (e.key === 'Enter' && barcodeInput) {
        handleBarcodeSearch();
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [open, barcodeInput]);

  // البحث بالباركود
  const handleBarcodeSearch = () => {
    if (!barcodeInput.trim()) return;

    const product = products.find(
      (p) => p.barcode === barcodeInput || p.sku === barcodeInput
    );

    if (product) {
      // إضافة المنتج أو زيادة الكمية
      const currentQty = selectedProducts.get(product.id) || 0;
      const newQty = currentQty + 1;
      setSelectedProducts(new Map(selectedProducts.set(product.id, newQty)));
      
      toast.success(`تمت إضافة ${product.name} - الكمية: ${newQty}`);
      setBarcodeInput('');
      
      // التركيز مرة أخرى على حقل الباركود
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    } else {
      toast.error('لم يتم العثور على منتج بهذا الباركود');
      setBarcodeInput('');
    }
  };

  // تصفية المنتجات حسب البحث
  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query) ||
      product.barcode?.toLowerCase().includes(query)
    );
  });

  // إضافة منتج من القائمة
  const handleAddProduct = (product: Product) => {
    const currentQty = selectedProducts.get(product.id) || 0;
    const newQty = currentQty + 1;
    setSelectedProducts(new Map(selectedProducts.set(product.id, newQty)));
    toast.success(`تمت إضافة ${product.name}`);
  };

  // تغيير كمية منتج
  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      const newMap = new Map(selectedProducts);
      newMap.delete(productId);
      setSelectedProducts(newMap);
    } else {
      setSelectedProducts(new Map(selectedProducts.set(productId, quantity)));
    }
  };

  // إزالة منتج
  const handleRemoveProduct = (productId: string) => {
    const newMap = new Map(selectedProducts);
    newMap.delete(productId);
    setSelectedProducts(newMap);
  };

  // تأكيد الاختيار
  const handleConfirm = () => {
    if (selectedProducts.size === 0) {
      toast.warning('الرجاء اختيار منتج واحد على الأقل');
      return;
    }

    // جمع جميع المنتجات المختارة
    const selectedItems: Array<{ product: Product; quantity: number }> = [];
    selectedProducts.forEach((quantity, productId) => {
      const product = products.find((p) => p.id === productId);
      if (product) {
        selectedItems.push({ product, quantity });
      }
    });

    // إرسال جميع المنتجات دفعة واحدة
    onSelectProduct(selectedItems);

    // إعادة تعيين وإغلاق
    setSelectedProducts(new Map());
    setSearchQuery('');
    setBarcodeInput('');
    onOpenChange(false);
  };

  // إلغاء وإغلاق
  const handleCancel = () => {
    setSelectedProducts(new Map());
    setSearchQuery('');
    setBarcodeInput('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            اختيار المنتجات
          </DialogTitle>
          <DialogDescription>
            استخدم السكانر أو ابحث عن المنتجات وأضفها إلى الفاتورة
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* حقول البحث والباركود */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* حقل الباركود */}
            <div className="relative">
              <Barcode className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
              <Input
                ref={barcodeInputRef}
                placeholder="امسح الباركود أو أدخله يدوياً..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleBarcodeSearch();
                  }
                }}
                className="pr-10"
              />
            </div>

            {/* حقل البحث */}
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="ابحث عن منتج بالاسم أو SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          {/* المنتجات المختارة */}
          {selectedProducts.size > 0 && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                المنتجات المختارة ({selectedProducts.size})
              </h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {Array.from(selectedProducts.entries()).map(([productId, quantity]) => {
                  const product = products.find((p) => p.id === productId);
                  if (!product) return null;

                  return (
                    <div
                      key={productId}
                      className="flex items-center justify-between gap-2 p-2 bg-background rounded border"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.sku} • {product.price?.toFixed(2)} دج
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) =>
                            handleQuantityChange(productId, parseInt(e.target.value) || 0)
                          }
                          className="w-20 text-center"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveProduct(productId)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* قائمة المنتجات */}
          <div className="flex-1 overflow-hidden border rounded-lg">
            <div className="h-full overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="text-right">المنتج</TableHead>
                    <TableHead className="text-right">SKU</TableHead>
                    <TableHead className="text-right">الباركود</TableHead>
                    <TableHead className="text-right">السعر</TableHead>
                    <TableHead className="text-right">المخزون</TableHead>
                    <TableHead className="text-center">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        لم يتم العثور على منتجات
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        لا توجد نتائج للبحث
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => {
                      const isSelected = selectedProducts.has(product.id);
                      const quantity = selectedProducts.get(product.id) || 0;

                      return (
                        <TableRow
                          key={product.id}
                          className={cn(
                            'cursor-pointer hover:bg-muted/50',
                            isSelected && 'bg-primary/5'
                          )}
                          onClick={() => handleAddProduct(product)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {product.imageUrl && (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-10 h-10 object-cover rounded"
                                />
                              )}
                              <div>
                                <p className="font-medium">{product.name}</p>
                                {isSelected && (
                                  <Badge variant="secondary" className="mt-1">
                                    الكمية: {quantity}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {product.sku || '-'}
                            </code>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {product.barcode || '-'}
                            </code>
                          </TableCell>
                          <TableCell className="font-medium">
                            {product.price?.toFixed(2)} دج
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                (product.stock_quantity || 0) > 10
                                  ? 'default'
                                  : (product.stock_quantity || 0) > 0
                                  ? 'secondary'
                                  : 'destructive'
                              }
                            >
                              {product.stock_quantity || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant={isSelected ? 'secondary' : 'default'}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddProduct(product);
                              }}
                            >
                              <Plus className="h-4 w-4 ml-1" />
                              {isSelected ? 'إضافة المزيد' : 'إضافة'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* أزرار التحكم */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            إلغاء
          </Button>
          <Button onClick={handleConfirm} disabled={selectedProducts.size === 0}>
            <Plus className="h-4 w-4 ml-1" />
            إضافة المنتجات ({selectedProducts.size})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductSelectorDialog;
