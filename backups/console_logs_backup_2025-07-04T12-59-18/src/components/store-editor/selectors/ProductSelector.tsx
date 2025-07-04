import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getProducts } from '@/lib/api/products';
import { useTenant } from '@/context/TenantContext';

interface ProductSelectorProps {
  selectedProducts: string[];
  onChange: (products: string[]) => void;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({ 
  selectedProducts = [], 
  onChange 
}) => {
  const [products, setProducts] = useState<{ id: string, name: string, thumbnail_image: string, price: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // استخدام سياق المستأجر للحصول على معرف المؤسسة
  const { currentOrganization } = useTenant();
  const organizationId = currentOrganization?.id;

  // جلب قائمة المنتجات من قاعدة البيانات
  useEffect(() => {
    setLoading(true);
    
    const fetchProducts = async () => {
      try {
        // هنا نستخدم API لجلب المنتجات، والذي سيقوم بتصفية المنتجات النشطة افتراضيًا
        const data = await getProducts(organizationId);
        
        // تنسيق البيانات فقط بدون تصفية is_active لأن API يقوم بذلك بالفعل
        const formattedProducts = data.map(prod => ({
          id: prod.id,
          name: prod.name,
          thumbnail_image: prod.thumbnail_image,
          price: Number(prod.price)
        }));
        
        setProducts(formattedProducts);
        setError(null);
      } catch (err) {
        setError('حدث خطأ أثناء جلب المنتجات. يرجى المحاولة مرة أخرى.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [selectedProducts.length, organizationId]);

  // التبديل بين تحديد وإلغاء تحديد منتج
  const toggleProduct = (productId: string) => {
    const isSelected = selectedProducts.includes(productId);
    
    if (isSelected) {
      // إزالة المنتج من القائمة المحددة
      const newSelection = selectedProducts.filter(id => id !== productId);
      onChange(newSelection);
    } else {
      // إضافة المنتج إلى القائمة المحددة
      const newSelection = [...selectedProducts, productId];
      onChange(newSelection);
    }
  };

  // تصفية المنتجات حسب البحث
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="text-xs mt-2 text-muted-foreground">جاري تحميل المنتجات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-destructive/20 bg-destructive/10 rounded-md">
        <p className="text-xs text-destructive">{error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2 text-xs h-8 w-full"
          onClick={() => window.location.reload()}
        >
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-xs font-medium">اختر المنتجات المطلوب عرضها</Label>
        <span className="text-xs text-muted-foreground">المحدد: {selectedProducts.length}</span>
      </div>
      
      <div className="space-y-2 mb-2">
        <Input
          placeholder="ابحث عن منتج..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="h-8 text-xs"
        />
      </div>
      
      {products.length === 0 ? (
        <div className="text-center py-4 border border-dashed rounded-md">
          <p className="text-sm text-muted-foreground">لا توجد منتجات متاحة</p>
        </div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto space-y-1 border rounded-md p-2">
          {filteredProducts.map(product => (
            <div 
              key={product.id}
              className={`flex items-center px-3 py-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
                selectedProducts.includes(product.id) ? 'bg-primary/10' : ''
              }`}
              onClick={() => toggleProduct(product.id)}
            >
              <div className="h-10 w-10 bg-muted rounded-md overflow-hidden mr-3 flex-shrink-0">
                {product.thumbnail_image ? (
                  <img 
                    src={product.thumbnail_image} 
                    alt={product.name} 
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      // استبدال العنصر بخلفية
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement?.classList.add('bg-primary/10');
                      
                      // إضافة نص بديل عند فشل تحميل الصورة
                      const textDiv = document.createElement('div');
                      textDiv.className = 'h-full w-full flex items-center justify-center text-primary text-xs';
                      textDiv.textContent = 'صورة';
                      target.parentElement?.appendChild(textDiv);
                    }}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary text-xs">
                    صورة
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col">
                  <span className="text-sm font-medium truncate">{product.name}</span>
                                          <span className="text-xs text-muted-foreground">{product.price.toLocaleString()} دج</span>
                </div>
              </div>
              <div className="flex items-center justify-center h-5 w-5 flex-shrink-0">
                {selectedProducts.includes(product.id) && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex gap-2 mt-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8 flex-1"
          onClick={() => onChange(products.map(p => p.id))}
          disabled={products.length === 0}
        >
          تحديد الكل
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8 flex-1"
          onClick={() => onChange([])}
          disabled={selectedProducts.length === 0}
        >
          إلغاء تحديد الكل
        </Button>
      </div>
    </div>
  );
};

export default ProductSelector;
