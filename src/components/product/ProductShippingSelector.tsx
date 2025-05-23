import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Truck, Home, Store, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getShippingClones, linkProductToShippingClone, ShippingProviderClone } from '@/api/shippingCloneService';

interface ProductShippingSelectorProps {
  productId: string;
  organizationId: string;
  initialCloneId?: number | null;
  onChange?: (cloneId: number | null) => void;
}

export default function ProductShippingSelector({
  productId,
  organizationId,
  initialCloneId = null,
  onChange
}: ProductShippingSelectorProps) {
  // حالة البيانات
  const [clones, setClones] = useState<ShippingProviderClone[]>([]);
  const [selectedCloneId, setSelectedCloneId] = useState<number | null>(initialCloneId);
  const [selectedClone, setSelectedClone] = useState<ShippingProviderClone | null>(null);
  
  // حالة التحميل
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // تحميل النسخ المستنسخة
  useEffect(() => {
    loadClones();
  }, [organizationId]);
  
  // تحديث الـ selectedClone عند تغيير الـ selectedCloneId
  useEffect(() => {
    if (selectedCloneId === null) {
      setSelectedClone(null);
      return;
    }
    
    const clone = clones.find(c => c.id === selectedCloneId);
    if (clone) {
      setSelectedClone(clone);
    }
  }, [selectedCloneId, clones]);
  
  // تحميل النسخ المستنسخة من مزودي التوصيل
  const loadClones = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getShippingClones(organizationId);
      setClones(data);
      
      // إذا كان هناك initialCloneId، تأكد من أنه موجود في القائمة
      if (initialCloneId && data.findIndex(c => c.id === initialCloneId) === -1) {
        setSelectedCloneId(null);
      }
    } catch (err) {
      console.error('خطأ في تحميل نسخ مزودي التوصيل:', err);
      setError('حدث خطأ أثناء تحميل نسخ مزودي التوصيل');
    } finally {
      setIsLoading(false);
    }
  };
  
  // معالجة تغيير مزود التوصيل
  const handleChange = async (value: string) => {
    if (!productId || !onChange) return;
    
    // تعامل خاص مع قيمة default
    if (value === 'default' || value === 'default_provider' || value === '1' || value === '0') {
      console.log("تم اختيار القيمة 'default' وتحويلها إلى null");
      // تعيين null عوضًا عن default
      setSelectedCloneId(null);
      if (onChange) onChange(null);
      return;
    }
    
    try {
      // للقيم الأخرى، حاول التحويل إلى رقم
      const numericValue = parseInt(value);
      if (!isNaN(numericValue)) {
        setSelectedCloneId(numericValue);
        if (onChange) onChange(numericValue);
      } else {
        // إذا فشل التحويل، ارسل null
        setSelectedCloneId(null);
        if (onChange) onChange(null);
      }
    } catch (error) {
      console.error('خطأ في معالجة قيمة مزود الشحن:', error);
      setSelectedCloneId(null);
      if (onChange) onChange(null);
    }
    
    // حفظ التغييرات في قاعدة البيانات إذا كان المنتج موجوداً
    if (productId) {
      try {
        const finalValue = value === 'default' || value === 'default_provider' || value === '1' || value === '0' 
          ? null 
          : parseInt(value);
          
        await linkProductToShippingClone(productId, finalValue || null);
      } catch (err) {
        console.error('خطأ في ربط المنتج بمزود التوصيل:', err);
        setError('حدث خطأ أثناء حفظ التغييرات');
      }
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Truck className="mr-2 h-5 w-5" />
          خدمة التوصيل
        </CardTitle>
        <CardDescription>
          اختر مزود التوصيل المناسب لهذا المنتج
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="mr-2">جاري التحميل...</span>
          </div>
        ) : error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>خطأ</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="shipping-provider" className="text-right">
                  مزود التوصيل
                </Label>
                <Select
                  value={selectedCloneId?.toString() || ''}
                  onValueChange={handleChange}
                >
                  <SelectTrigger id="shipping-provider" className="col-span-3">
                    <SelectValue placeholder="اختر مزود التوصيل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">بدون مزود توصيل</SelectItem>
                    {clones.map(clone => (
                      <SelectItem key={clone.id} value={clone.id.toString()}>
                        {clone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* عرض معلومات مزود التوصيل المختار */}
              {selectedClone && (
                <div className="mt-4 border rounded-md p-4">
                  <h3 className="font-medium mb-2">{selectedClone.name}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center">
                      <Home className="mr-2 h-4 w-4" />
                      <span>
                        {selectedClone.is_home_delivery_enabled 
                          ? 'متاح للتوصيل للمنزل' 
                          : 'غير متاح للتوصيل للمنزل'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Store className="mr-2 h-4 w-4" />
                      <span>
                        {selectedClone.is_desk_delivery_enabled 
                          ? 'متاح للتوصيل للمكتب' 
                          : 'غير متاح للتوصيل للمكتب'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-4 text-xs text-muted-foreground">
              <p>
                يمكنك إدارة نسخ مزودي التوصيل من صفحة{' '}
                <a href={`/dashboard/shipping-settings`} className="text-primary underline" target="_blank">
                  إعدادات التوصيل
                </a>
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
} 