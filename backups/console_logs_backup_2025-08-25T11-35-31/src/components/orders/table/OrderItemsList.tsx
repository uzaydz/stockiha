import { memo, useState, useEffect } from "react";
import { ShoppingCart, Hash, DollarSign, Trash2, Plus, Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Order } from "./OrderTableTypes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTenant } from "@/context/TenantContext";
import { getProducts } from "@/lib/api/products";
import { getProductColors } from "@/lib/api/productVariants";
import { getProductSizes } from "@/lib/api/productVariants";
import { supabase } from "@/lib/supabase";

interface OrderItemsListProps {
  order: Order;
  currentUserId?: string;
  editable?: boolean;
  items?: Array<any>;
  onItemChange?: (index: number, changes: Partial<{ product_name: string; quantity: number; unit_price: number; color_name?: string | null; size_name?: string | null; product_id?: string; color_id?: string; size_id?: string; color_code?: string }>) => void;
  onItemDelete?: (index: number) => void;
  onItemAdd?: () => void;
}

// مكون اختيار المنتج
const ProductSelector = ({ 
  selectedProductId, 
  onProductSelect, 
  organizationId 
}: { 
  selectedProductId?: string; 
  onProductSelect: (product: any) => void; 
  organizationId: string;
}) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if ((open || selectedProductId) && organizationId) {
      loadProducts();
    }
  }, [open, organizationId, selectedProductId]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const productsData = await getProducts(organizationId);
      setProducts(productsData);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProduct = selectedProductId ? products.find(p => p.id === selectedProductId) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left">
          {selectedProduct ? selectedProduct.name : "اختر منتج"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>اختر المنتج</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="ابحث عن منتج..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4">جاري التحميل...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">لا توجد منتجات</div>
            ) : (
              filteredProducts.map((product) => (
                <Button
                  key={product.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-3 px-4"
                  onClick={() => {
                    onProductSelect(product);
                    setOpen(false);
                  }}
                >
                  <div className="text-left">
                    <div className="font-medium">{product.name}</div>
                    {product.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {product.description.substring(0, 60)}
                        {product.description.length > 60 ? '...' : ''}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      السعر: {formatCurrency(product.price || 0)}
                    </div>
                  </div>
                </Button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// مكون اختيار اللون
const ColorSelector = ({ 
  productId, 
  selectedColorId, 
  onColorSelect 
}: { 
  productId?: string; 
  selectedColorId?: string; 
  onColorSelect: (color: any) => void; 
}) => {
  const [colors, setColors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productId || selectedColorId) {
      if (productId) {
        loadColors();
      } else if (selectedColorId) {
        // إذا كان لدينا selectedColorId ولكن لا يوجد productId، نحتاج لجلب الألوان من مكان آخر
        // يمكننا جلب الألوان من قاعدة البيانات مباشرة
        loadColorById();
      }
    } else {
      setColors([]);
    }
  }, [productId, selectedColorId]);

  const loadColors = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const colorsData = await getProductColors(productId);
      setColors(colorsData);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const loadColorById = async () => {
    if (!selectedColorId) return;
    setLoading(true);
    try {
      // جلب اللون من قاعدة البيانات مباشرة
      const { data, error } = await supabase
        .from('product_colors')
        .select('*')
        .eq('id', selectedColorId)
        .single();
      
      if (!error && data) {
        setColors([data]);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  if ((!productId && !selectedColorId) || colors.length === 0) return null;

  const selectedColor = selectedColorId ? colors.find(c => c.id === selectedColorId) : null;

  return (
    <Select value={selectedColorId || ""} onValueChange={(value) => {
      const color = colors.find(c => c.id === value);
      if (color) onColorSelect(color);
    }}>
      <SelectTrigger>
        <SelectValue placeholder="اختر اللون">
          {selectedColor ? selectedColor.name : "اختر اللون"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {loading ? (
          <SelectItem value="" disabled>جاري التحميل...</SelectItem>
        ) : (
          colors.map((color) => (
            <SelectItem key={color.id} value={color.id}>
              <div className="flex items-center gap-2">
                {color.color_code && (
                  <div
                    className="w-4 h-4 rounded-full border border-border"
                    style={{ backgroundColor: color.color_code }}
                  />
                )}
                <span>{color.name}</span>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
};

// مكون اختيار المقاس
const SizeSelector = ({ 
  colorId, 
  selectedSizeId, 
  onSizeSelect 
}: { 
  colorId?: string; 
  selectedSizeId?: string; 
  onSizeSelect: (size: any) => void; 
}) => {
  const [sizes, setSizes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (colorId || selectedSizeId) {
      if (colorId) {
        loadSizes();
      } else if (selectedSizeId) {
        // إذا كان لدينا selectedSizeId ولكن لا يوجد colorId، نحتاج لجلب المقاسات من مكان آخر
        loadSizeById();
      }
    } else {
      setSizes([]);
    }
  }, [colorId, selectedSizeId]);

  const loadSizes = async () => {
    if (!colorId) return;
    setLoading(true);
    try {
      const sizesData = await getProductSizes(colorId);
      setSizes(sizesData);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const loadSizeById = async () => {
    if (!selectedSizeId) return;
    setLoading(true);
    try {
      // جلب المقاس من قاعدة البيانات مباشرة
      const { data, error } = await supabase
        .from('product_sizes')
        .select('*')
        .eq('id', selectedSizeId)
        .single();
      
      if (!error && data) {
        setSizes([data]);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  if ((!colorId && !selectedSizeId) || sizes.length === 0) return null;

  const selectedSize = selectedSizeId ? sizes.find(s => s.id === selectedSizeId) : null;

  return (
    <Select value={selectedSizeId || ""} onValueChange={(value) => {
      const size = sizes.find(s => s.id === value);
      if (size) onSizeSelect(size);
    }}>
      <SelectTrigger>
        <SelectValue placeholder="اختر المقاس">
          {selectedSize ? selectedSize.size_name : "اختر المقاس"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {loading ? (
          <SelectItem value="" disabled>جاري التحميل...</SelectItem>
        ) : (
          sizes.map((size) => (
            <SelectItem key={size.id} value={size.id}>
              {size.size_name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
};

const OrderItemRow = memo(({ item }: { item: any }) => (
  <div className="flex items-center justify-between p-3 bg-background/50 rounded-md border border-border/20">
    <div className="flex-1">
      <p className="text-sm font-medium text-foreground">{item.product_name}</p>
      
      {/* عرض اللون والمقاس إذا كانا متوفرين */}
      <div className="flex items-center gap-3 mt-1">
        {item.color_name && (
          <div className="flex items-center gap-1">
            {item.color_code && (
              <div
                className="w-3 h-3 rounded-full border border-border"
                style={{ backgroundColor: item.color_code }}
              />
            )}
            <span className="text-xs text-muted-foreground">اللون: {item.color_name}</span>
          </div>
        )}
        
        {item.size_name && (
          <span className="text-xs text-muted-foreground">المقاس: {item.size_name}</span>
        )}
      </div>
      
      <div className="flex items-center gap-4 mt-1">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Hash className="h-3 w-3" />
          الكمية: {item.quantity}
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          {formatCurrency(item.unit_price)}
        </span>
      </div>
    </div>
    <div className="text-right">
      <p className="text-sm font-semibold text-primary">{formatCurrency(item.total_price)}</p>
      <p className="text-xs text-muted-foreground">المجموع</p>
    </div>
  </div>
));

const OrderItemsList = memo(({ order, currentUserId, editable = false, items, onItemChange, onItemDelete, onItemAdd }: OrderItemsListProps) => {
  const { currentOrganization } = useTenant();
  const effectiveItems = editable && items ? items : (order.order_items || []);

  const computedSubtotal = effectiveItems.reduce((sum: number, it: any) => sum + (Number(it.quantity || 0) * Number(it.unit_price || 0)), 0);

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <ShoppingCart className="h-4 w-4" />
        عناصر الطلب ({effectiveItems.length})
      </h4>

      {editable && (
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onItemAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة عنصر
          </Button>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {effectiveItems.length > 0 ? (
          effectiveItems.map((item: any, index: number) => (
            <div key={item.id || index} className="flex items-center justify-between p-3 bg-background/50 rounded-md border border-border/20">
              <div className="flex-1 pr-3">
                {editable ? (
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3">
                      <ProductSelector
                        selectedProductId={item.product_id}
                        onProductSelect={(product) => {
                          onItemChange?.(index, {
                            product_id: product.id,
                            product_name: product.name,
                            unit_price: product.price || 0,
                            color_id: undefined,
                            size_id: undefined,
                            color_name: undefined,
                            size_name: undefined
                          });
                        }}
                        organizationId={currentOrganization?.id || ''}
                      />
                    </div>
                    <div className="col-span-2">
                      <ColorSelector
                        productId={item.product_id}
                        selectedColorId={item.color_id}
                        onColorSelect={(color) => {
                          onItemChange?.(index, {
                            color_id: color.id,
                            color_name: color.name,
                            color_code: color.color_code,
                            size_id: undefined,
                            size_name: undefined
                          });
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <SizeSelector
                        colorId={item.color_id}
                        selectedSizeId={item.size_id}
                        onSizeSelect={(size) => {
                          onItemChange?.(index, {
                            size_id: size.id,
                            size_name: size.size_name
                          });
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={String(item.quantity ?? 1)}
                        onChange={(e) => onItemChange?.(index, { quantity: Math.max(0, Number(e.target.value || 0)) })}
                        placeholder="الكمية"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={String(item.unit_price ?? 0)}
                        onChange={(e) => onItemChange?.(index, { unit_price: Number(e.target.value || 0) })}
                        placeholder="سعر الوحدة"
                      />
                    </div>
                    <div className="col-span-1 text-right text-sm font-semibold text-primary">
                      {formatCurrency((Number(item.quantity||0) * Number(item.unit_price||0)))}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          onItemDelete?.(index);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <OrderItemRow item={item} />
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">لا توجد عناصر في هذا الطلب</p>
          </div>
        )}
      </div>
      
      {/* ملخص المبالغ */}
      <div className="mt-4 pt-4 border-t border-border/30 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">المجموع الفرعي:</span>
          <span className="font-medium">{formatCurrency(editable ? computedSubtotal : order.subtotal)}</span>
        </div>
        
        {!editable && order.tax > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">الضريبة:</span>
            <span className="font-medium">{formatCurrency(order.tax)}</span>
          </div>
        )}
        
        {!editable && order.discount && order.discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">الخصم:</span>
            <span className="font-medium text-red-500">-{formatCurrency(order.discount)}</span>
          </div>
        )}
        
        {!editable && order.shipping_cost && order.shipping_cost > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">الشحن:</span>
            <span className="font-medium">{formatCurrency(order.shipping_cost)}</span>
          </div>
        )}
        
        <div className="flex justify-between text-base font-semibold pt-2 border-t border-border/30">
          <span>المجموع الكلي:</span>
          <span className="text-primary">{formatCurrency(editable ? (computedSubtotal + Number(order.shipping_cost||0) - Number(order.discount||0)) : order.total)}</span>
        </div>
      </div>
    </div>
  );
});

export default OrderItemsList;
