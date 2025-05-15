import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save } from 'lucide-react';
import { getProductById, updateProductPurchaseConfig, getProductListForOrganization } from '@/lib/api/products'; // Assuming API functions exist
import type { Product, PurchasePageConfig, TimerConfig, QuantityOffer, UpsellDownsellItem } from '@/lib/api/products'; // Assuming types exist
import TimerSettings from '@/components/dashboard/product-customization/TimerSettings';
import QuantityOfferSettings from '@/components/dashboard/product-customization/QuantityOfferSettings';
import UpsellDownsellSettings from '@/components/dashboard/product-customization/UpsellDownsellSettings';
import { Separator } from '@/components/ui/separator';
import ShippingProviderSettings from '@/components/dashboard/product-customization/ShippingProviderSettings';

// Default config structure
const defaultPurchaseConfig: PurchasePageConfig = {
  timer: { enabled: false, endDate: '', message: '' },
  quantityOffers: [],
  upsells: [],
  downsells: [],
  shipping_clone_id: null,
};

const CustomizeProductPurchasePage = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentConfig, setCurrentConfig] = useState<PurchasePageConfig>(defaultPurchaseConfig);

  // Fetch product data using correct useQuery syntax
  const { data: product, isLoading: isLoadingProduct, error: productError } = useQuery<Product | null, Error>({
    queryKey: ['product', productId],
    queryFn: () => getProductById(productId!),
    enabled: !!productId,
  });

  // <-- Fetch the list of products for the dropdown -->
  const { data: productList, isLoading: isLoadingProductList } = useQuery< { id: string; name: string }[], Error >({
    queryKey: ['productList', product?.organization_id], // Include org ID in key
    queryFn: () => getProductListForOrganization(product!.organization_id), // Fetch list using org ID
    enabled: !!product?.organization_id, // Only run when product and its org ID are loaded
  });

  // Use useEffect to update state when product data changes
  useEffect(() => {
    if (product) {
       if (product.purchase_page_config) {
          setCurrentConfig({
             timer: product.purchase_page_config.timer ?? defaultPurchaseConfig.timer,
             quantityOffers: product.purchase_page_config.quantityOffers ?? defaultPurchaseConfig.quantityOffers,
             upsells: product.purchase_page_config.upsells ?? defaultPurchaseConfig.upsells,
             downsells: product.purchase_page_config.downsells ?? defaultPurchaseConfig.downsells,
             shipping_clone_id: product.purchase_page_config.shipping_clone_id ?? product.shipping_clone_id ?? null,
           });
        } else {
          // If no config exists, use default values with shipping_clone_id from product if exists
          setCurrentConfig({
            ...defaultPurchaseConfig,
            shipping_clone_id: product.shipping_clone_id ?? null
          });
        }
    }
  }, [product]); // Dependency array includes product

  // Handle fetch error separately
  useEffect(() => {
    if (productError) {
      console.error("Error fetching product:", productError);
      toast.error('حدث خطأ أثناء جلب بيانات المنتج.');
      // Optionally navigate back or show persistent error message
    }
  }, [productError]);

  // Mutation for saving the config
  const mutation = useMutation<Product | null, Error, { productId: string; config: PurchasePageConfig | null }>({ 
    mutationFn: (variables) => updateProductPurchaseConfig(variables.productId, variables.config),
    onSuccess: (updatedProduct) => {
      toast.success('تم حفظ تخصيصات صفحة الشراء بنجاح!');
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      // State update is handled by the useEffect watching `product` after invalidation
    },
    onError: (err) => {
      console.error("Error saving config:", err);
      toast.error('حدث خطأ أثناء حفظ التغييرات.');
    },
  });

  const handleSave = () => {
    if (!productId) return;
    console.log('CustomizeProductPurchasePage: Saving currentConfig.quantityOffers:', JSON.stringify(currentConfig.quantityOffers, null, 2));
    mutation.mutate({ productId, config: currentConfig });
  };

  // Handlers to update parts of the config state from child components
  const handleTimerChange = (newTimerConfig: TimerConfig) => {
    setCurrentConfig(prev => ({ ...prev, timer: newTimerConfig }));
  };

  const handleQuantityOffersChange = (newOffers: QuantityOffer[]) => {
    setCurrentConfig(prev => ({ ...prev, quantityOffers: newOffers }));
  };

  const handleUpsellDownsellChange = (type: 'upsell' | 'downsell', items: UpsellDownsellItem[]) => {
    if (type === 'upsell') {
      setCurrentConfig(prev => ({ ...prev, upsells: items }));
    } else {
      setCurrentConfig(prev => ({ ...prev, downsells: items }));
    }
  };

  const handleShippingCloneChange = (cloneId: number | null) => {
    setCurrentConfig(prev => ({ ...prev, shipping_clone_id: cloneId }));
  };

  const isSaving = mutation.isPending;
  const isLoading = isLoadingProduct || isLoadingProductList; // Combine loading states

  if (isLoading) {
    return (
      <Layout>
        <div className="p-4 md:p-6 space-y-4">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-4 w-1/2" />
          <Card>
            <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
            <CardContent><Skeleton className="h-20 w-full" /></CardContent>
          </Card>
          {/* Add more skeletons for other sections */}
        </div>
      </Layout>
    );
  }

  if (!isLoading && !product) {
     return (
      <Layout>
        <div className="p-4 md:p-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="ml-2 h-4 w-4" />
            رجوع
          </Button>
          <p className="text-red-500">لم يتم العثور على المنتج أو حدث خطأ أثناء الجلب.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">تخصيص صفحة شراء المنتج</h1>
            <p className="text-muted-foreground">{product?.name ?? '...'}</p>
          </div>
          <div className="flex gap-2">
             <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="ml-2 h-4 w-4" />
                رجوع
             </Button>
             <Button onClick={handleSave} disabled={isSaving || isLoading}>
                <Save className="ml-2 h-4 w-4" />
                {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
             </Button>
          </div>
        </div>

        {product && (
          <>
             <Card>
              <CardHeader>
                <CardTitle>مؤقت العرض</CardTitle>
                <CardDescription>إضافة مؤقت للعد التنازلي في صفحة الشراء لخلق شعور بالإلحاح.</CardDescription>
              </CardHeader>
              <CardContent>
                <TimerSettings timerConfig={currentConfig.timer} onChange={handleTimerChange} />
              </CardContent>
            </Card>

            <Separator />

            <Card>
              <CardHeader>
                <CardTitle>عروض الكميات</CardTitle>
                <CardDescription>إنشاء عروض مثل "اشترِ 2 واحصل على شحن مجاني" أو "اشترِ 3 واحصل على خصم 10%" أو "اشترِ 1 واحصل على منتج آخر هدية".</CardDescription>
              </CardHeader>
              <CardContent>
                <QuantityOfferSettings
                  offers={currentConfig.quantityOffers}
                  onChange={handleQuantityOffersChange}
                  organizationId={product?.organization_id ?? ''} 
                  productList={productList ?? []} // Pass the fetched list
                />
              </CardContent>
            </Card>

            <Separator />

            <Card>
              <CardHeader>
                <CardTitle>عروض Upsell / Downsell</CardTitle>
                <CardDescription>عرض منتجات إضافية (Upsell) أو بديلة (Downsell) للعميل في صفحة الشراء.</CardDescription>
              </CardHeader>
              <CardContent>
                <UpsellDownsellSettings 
                  upsells={currentConfig.upsells} 
                  downsells={currentConfig.downsells} 
                  onChange={handleUpsellDownsellChange} 
                  organizationId={product.organization_id ?? ''}
                />
              </CardContent>
            </Card>

            <Separator />

            <Card>
              <CardHeader>
                <CardTitle>مزود التوصيل</CardTitle>
                <CardDescription>اختر مزود التوصيل الذي سيتم استخدامه لهذا المنتج في صفحة الشراء.</CardDescription>
              </CardHeader>
              <CardContent>
                <ShippingProviderSettings
                  productId={productId || ''}
                  selectedCloneId={currentConfig.shipping_clone_id}
                  onChange={handleShippingCloneChange}
                />
              </CardContent>
            </Card>
          </>
        )}

      </div>
    </Layout>
  );
};

export default CustomizeProductPurchasePage; 