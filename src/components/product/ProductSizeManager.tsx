import React, { useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, Check, X, Ruler, Package, DollarSign, Hash, Star, Copy, Zap } from 'lucide-react';
import { ProductSize } from '@/types/product';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

// واجهة بيانات المقاس المؤقت
interface TempSize {
  id: string;
  size_name: string;
  quantity: number;
  price: number;
  barcode?: string;
  is_default: boolean;
}

interface ProductSizeManagerProps {
  sizes: ProductSize[];
  onChange: (sizes: ProductSize[]) => void;
  basePrice: number;
  colorId: string;
  productId: string;
  useVariantPrices: boolean;
}

// مقاسات سريعة مسبقة
const QUICK_SIZES = {
  'ملابس': ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  'أحذية رجال': ['39', '40', '41', '42', '43', '44', '45'],
  'أحذية نساء': ['35', '36', '37', '38', '39', '40', '41'],
  'أحذية أطفال': ['20', '22', '24', '26', '28', '30', '32'],
};



const ProductSizeManager: React.FC<ProductSizeManagerProps> = ({
  sizes,
  onChange,
  basePrice,
  colorId,
  productId,
  useVariantPrices,
}) => {
  const [editingSize, setEditingSize] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<ProductSize>>({});
  const [showQuickSizes, setShowQuickSizes] = useState(false);
  const [newSize, setNewSize] = useState<TempSize>({
    id: '',
    size_name: '',
    quantity: 0,
    price: basePrice,
    barcode: '',
    is_default: false,
  });

  // إضافة مقاس جديد
  const handleAddSize = () => {
    if (!newSize.size_name.trim()) {
      toast.error('اسم المقاس مطلوب');
      return;
    }

    const sizeToAdd: ProductSize = {
      id: `temp-${Date.now()}`,
      color_id: colorId,
      product_id: productId,
      size_name: newSize.size_name,
      quantity: newSize.quantity,
      price: useVariantPrices ? newSize.price : basePrice,
      barcode: newSize.barcode || undefined,
      is_default: newSize.is_default,
    };

    let updatedSizes = [...sizes];
    
    if (newSize.is_default) {
      updatedSizes = updatedSizes.map(s => ({ ...s, is_default: false }));
    }
    
    updatedSizes.push(sizeToAdd);
    onChange(updatedSizes);
    
    setNewSize({
      id: '',
      size_name: '',
      quantity: 0,
      price: basePrice,
      barcode: '',
      is_default: false,
    });
    
    toast.success(`تم إضافة المقاس "${newSize.size_name}"`);
  };

  // بدء تعديل مقاس
  const startEditSize = (size: ProductSize) => {
    setEditingSize(size.id);
    setEditingData({
      size_name: size.size_name,
      quantity: size.quantity,
      price: size.price,
      barcode: size.barcode,
      is_default: size.is_default,
    });
  };

  // حفظ تعديل المقاس
  const saveEditSize = (sizeId: string) => {
    const updatedSizes = sizes.map(size => {
      if (size.id === sizeId) {
        const updatedSize = { ...size, ...editingData };
        
        // إذا تم جعل هذا المقاس افتراضياً، إلغاء الافتراضية من الباقي
        if (editingData.is_default) {
          return updatedSize;
        }
        return updatedSize;
      }
      
      // إلغاء الافتراضية من المقاسات الأخرى إذا تم جعل مقاس آخر افتراضياً
      if (editingData.is_default) {
        return { ...size, is_default: false };
      }
      
      return size;
    });
    
    onChange(updatedSizes);
    setEditingSize(null);
    setEditingData({});
    toast.success('تم تحديث المقاس');
  };

  // إلغاء التعديل
  const cancelEdit = () => {
    setEditingSize(null);
    setEditingData({});
  };

  // حذف مقاس
  const handleDeleteSize = (sizeId: string) => {
    const sizeToDelete = sizes.find(s => s.id === sizeId);
    if (!sizeToDelete) return;

    const newSizes = sizes.filter((s) => s.id !== sizeId);
    
    // إذا حذفنا المقاس الافتراضي وهناك مقاسات أخرى، اجعل الأول افتراضي
    if (sizeToDelete.is_default && newSizes.length > 0) {
      newSizes[0].is_default = true;
    }
    
    onChange(newSizes);
    toast.success(`تم حذف المقاس "${sizeToDelete.size_name}"`);
  };

  // نسخ مقاس
  const handleDuplicateSize = (size: ProductSize) => {
    const newSize: ProductSize = {
      ...size,
      id: `temp-${Date.now()}`,
      size_name: `${size.size_name} - نسخة`,
      is_default: false,
    };
    
    const newSizes = [...sizes, newSize];
    onChange(newSizes);
    toast.success(`تم نسخ المقاس "${size.size_name}"`);
  };

  // توليد باركود
  const generateBarcode = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SIZE-${timestamp}-${random}`;
  };

  // إضافة مقاس سريع
  const handleAddQuickSize = (sizeName: string) => {
    // التحقق من أن المقاس غير موجود
    if (sizes.some(s => s.size_name === sizeName)) {
      toast.error(`المقاس "${sizeName}" موجود بالفعل`);
      return;
    }

    const sizeToAdd: ProductSize = {
      id: `temp-${Date.now()}-${Math.random()}`,
      color_id: colorId,
      product_id: productId,
      size_name: sizeName,
      quantity: 0,
      price: useVariantPrices ? basePrice : basePrice,
      is_default: sizes.length === 0, // أول مقاس يكون افتراضي
    };

    let updatedSizes = [...sizes];
    updatedSizes.push(sizeToAdd);
    onChange(updatedSizes);
    
    toast.success(`تم إضافة المقاس "${sizeName}"`);
  };

  // إضافة مجموعة مقاسات سريعة
  const handleAddQuickSizeGroup = (category: string) => {
    const sizesToAdd = QUICK_SIZES[category as keyof typeof QUICK_SIZES];
    let addedCount = 0;
    
    sizesToAdd.forEach(sizeName => {
      if (!sizes.some(s => s.size_name === sizeName)) {
        const sizeToAdd: ProductSize = {
          id: `temp-${Date.now()}-${Math.random()}`,
          color_id: colorId,
          product_id: productId,
          size_name: sizeName,
          quantity: 0,
          price: useVariantPrices ? basePrice : basePrice,
          is_default: sizes.length === 0 && addedCount === 0,
        };
        sizes = [...sizes, sizeToAdd];
        addedCount++;
      }
    });

    if (addedCount > 0) {
      onChange(sizes);
      toast.success(`تم إضافة ${addedCount} مقاس`);
      setShowQuickSizes(false);
    } else {
      toast.info('جميع المقاسات موجودة بالفعل');
    }
  };


  // حساب الإحصائيات
  const totalQuantity = sizes.reduce((sum, size) => sum + size.quantity, 0);
  const totalValue = sizes.reduce((sum, size) => sum + (size.quantity * (size.price || basePrice)), 0);

  return (
    <div className="space-y-4">
      {/* إحصائيات سريعة */}
      {sizes.length > 0 && (
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <Ruler className="h-4 w-4" />
            <span className="font-medium">{sizes.length}</span> مقاس
          </span>
          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <Package className="h-4 w-4" />
            <span className="font-medium">{totalQuantity}</span> قطعة
          </span>
          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <DollarSign className="h-4 w-4" />
            <span className="font-medium">{totalValue.toLocaleString()}</span> دج
          </span>
        </div>
      )}


      {/* نموذج إضافة مقاس مبسط */}
      <Card>
        <CardContent className="pt-6 pb-4">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-sm font-medium mb-1.5 block">اسم المقاس</Label>
                <Input
                  value={newSize.size_name}
                  onChange={(e) => setNewSize({ ...newSize, size_name: e.target.value })}
                  placeholder="مثال: M، 42"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSize();
                    }
                  }}
                />
              </div>
              
              <div className="w-24">
                <Label className="text-sm font-medium mb-1.5 block">الكمية</Label>
                <Input
                  type="number"
                  min="0"
                  value={newSize.quantity}
                  onChange={(e) => setNewSize({ ...newSize, quantity: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
              
              {useVariantPrices && (
                <div className="w-28">
                  <Label className="text-sm font-medium mb-1.5 block">السعر</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newSize.price}
                    onChange={(e) => setNewSize({ ...newSize, price: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
              )}
              
              <Button 
                type="button" 
                onClick={handleAddSize} 
                className="px-4"
                disabled={!newSize.size_name.trim()}
              >
                <Plus className="h-4 w-4 ml-1" />
                إضافة
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* قائمة المقاسات */}
      {sizes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              المقاسات المضافة ({sizes.length})
            </h4>
          </div>
          <div className="space-y-1.5">
            {sizes.map((size) => (
              <Card key={size.id} className="border hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                <CardContent className="p-3">
                  {editingSize === size.id ? (
                    // وضع التعديل
                    <div className="flex gap-2 items-center">
                      <Input
                        value={editingData.size_name || ''}
                        onChange={(e) => setEditingData({ ...editingData, size_name: e.target.value })}
                        placeholder="المقاس"
                        className="w-20"
                      />
                      
                      <Input
                        type="number"
                        min="0"
                        value={editingData.quantity || 0}
                        onChange={(e) => setEditingData({ ...editingData, quantity: Number(e.target.value) })}
                        placeholder="الكمية"
                        className="w-20"
                      />
                      
                      {useVariantPrices && (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editingData.price || basePrice}
                          onChange={(e) => setEditingData({ ...editingData, price: Number(e.target.value) })}
                          placeholder="السعر"
                          className="w-24"
                        />
                      )}
                      
                      <div className="flex-1"></div>
                      
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="icon" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="default" size="icon" onClick={() => saveEditSize(size.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // وضع العرض
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-lg flex items-center justify-center border border-blue-100 dark:border-blue-900">
                            <span className="text-base font-bold text-blue-700 dark:text-blue-300">{size.size_name}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                <Package className="h-3.5 w-3.5" />
                                <span className="font-medium">{size.quantity}</span>
                              </span>
                              {useVariantPrices && (
                                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                  <DollarSign className="h-3.5 w-3.5" />
                                  <span className="font-medium">{(size.price || basePrice).toLocaleString()}</span>
                                </span>
                              )}
                            </div>
                            {size.is_default && (
                              <Badge variant="secondary" className="mt-1 text-xs h-5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                                <Star className="h-2.5 w-2.5 ml-1 fill-current" />
                                افتراضي
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditSize(size)}
                          className="h-8 w-8"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSize(size.id)}
                          className="h-8 w-8 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSizeManager;