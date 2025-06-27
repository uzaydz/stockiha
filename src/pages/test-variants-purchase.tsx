import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { ProductVariantSelector } from '@/components/suppliers/ProductVariantSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { saveSupplierPurchaseWithVariants } from '@/api/supplierVariantService';

interface Product {
  id: string;
  name: string;
  price: number;
  purchase_price?: number;
  has_variants: boolean;
  use_sizes: boolean;
}

interface Supplier {
  id: string;
  name: string;
  company_name?: string;
}

export default function TestVariantsPurchase() {
  const { organization } = useAuth();
  const organizationId = organization?.id;
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // جلب المنتجات والموردين
  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId) return;

      try {
        // جلب المنتجات التي لها متغيرات
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, price, purchase_price, has_variants, use_sizes')
          .eq('organization_id', organizationId)
          .eq('has_variants', true)
          .limit(10);

        if (productsError) throw productsError;
        setProducts(productsData || []);

        // جلب الموردين
        const { data: suppliersData, error: suppliersError } = await supabase
          .from('suppliers')
          .select('id, name, company_name')
          .eq('organization_id', organizationId)
          .limit(10);

        if (suppliersError) throw suppliersError;
        setSuppliers(suppliersData || []);

      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('خطأ في جلب البيانات');
      }
    };

    fetchData();
  }, [organizationId]);

  // محاولة حفظ مشتريات بمتغيرات
  const handleSavePurchase = async () => {
    if (!selectedProduct || !selectedSupplier || variants.length === 0) {
      toast.error('يرجى اختيار المنتج والمورد وتحديد المتغيرات');
      return;
    }

    setLoading(true);
    try {
      const purchaseData = {
        purchase: {
          purchase_number: `TEST-${Date.now()}`,
          supplier_id: selectedSupplier,
          purchase_date: new Date().toISOString(),
          total_amount: variants.reduce((sum, v) => sum + (v.quantity * v.unit_price), 0),
          paid_amount: 0,
          status: 'confirmed',
          organization_id: organizationId
        },
        items: [{
          product_id: selectedProduct.id,
          description: selectedProduct.name,
          quantity: variants.reduce((sum, v) => sum + v.quantity, 0),
          unit_price: variants.reduce((sum, v) => sum + (v.quantity * v.unit_price), 0) / variants.reduce((sum, v) => sum + v.quantity, 0),
          tax_rate: 0,
          variant_type: 'color_size' as const
        }],
        item_variants: {
          0: variants
        }
      };

      console.log('Saving purchase data:', purchaseData);

      const result = await saveSupplierPurchaseWithVariants(purchaseData);
      
      console.log('Purchase saved successfully:', result);
      toast.success('تم حفظ المشتريات بنجاح!');
      
      // إعادة تعيين النموذج
      setSelectedProduct(null);
      setSelectedSupplier('');
      setVariants([]);

    } catch (error) {
      console.error('Error saving purchase:', error);
      toast.error('خطأ في حفظ المشتريات: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>اختبار نظام المتغيرات في المشتريات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* اختيار المورد */}
          <div>
            <Label>اختر المورد</Label>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger>
                <SelectValue placeholder="اختر المورد" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name} {supplier.company_name && `(${supplier.company_name})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* اختيار المنتج */}
          <div>
            <Label>اختر المنتج</Label>
            <Select 
              value={selectedProduct?.id || ''} 
              onValueChange={(value) => {
                const product = products.find(p => p.id === value);
                setSelectedProduct(product || null);
                setVariants([]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر المنتج" />
              </SelectTrigger>
              <SelectContent>
                {products.map(product => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} - {product.has_variants ? 'له متغيرات' : 'بسيط'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* محدد المتغيرات */}
          {selectedProduct && (
            <ProductVariantSelector
              productId={selectedProduct.id}
              productName={selectedProduct.name}
              productPrice={selectedProduct.price}
              productPurchasePrice={selectedProduct.purchase_price}
              onVariantsChange={setVariants}
              initialVariants={[]}
            />
          )}

          {/* ملخص المتغيرات */}
          {variants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>ملخص المتغيرات المحددة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {variants.map((variant, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>{variant.display_name}</span>
                      <div className="text-sm">
                        {variant.quantity}x × {variant.unit_price} دج = {(variant.quantity * variant.unit_price).toFixed(2)} دج
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-2 font-bold">
                    المجموع: {variants.reduce((sum, v) => sum + (v.quantity * v.unit_price), 0).toFixed(2)} دج
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* زر الحفظ */}
          <Button 
            onClick={handleSavePurchase}
            disabled={loading || !selectedProduct || !selectedSupplier || variants.length === 0}
            className="w-full"
          >
            {loading ? 'جاري الحفظ...' : 'حفظ المشتريات'}
          </Button>

        </CardContent>
      </Card>

      {/* معلومات التصحيح */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات التصحيح</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>المنتجات المتاحة: {products.length}</div>
            <div>الموردين المتاحين: {suppliers.length}</div>
            <div>المنتج المختار: {selectedProduct?.name || 'لا شيء'}</div>
            <div>المورد المختار: {suppliers.find(s => s.id === selectedSupplier)?.name || 'لا شيء'}</div>
            <div>عدد المتغيرات: {variants.length}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 