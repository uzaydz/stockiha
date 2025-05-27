import { useState } from 'react';
import { Truck, RefreshCw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface ProductFeature {
  id: 'fast_shipping' | 'money_back' | 'quality_guarantee';
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  text: string;
}

interface ProductFeaturesProps {
  productId: string;
  initialFeatures: {
    hasFastShipping: boolean;
    hasMoneyBack: boolean;
    hasQualityGuarantee: boolean;
    fastShippingText: string;
    moneyBackText: string;
    qualityGuaranteeText: string;
  };
  onFeaturesUpdated?: () => void;
}

export function ProductFeatures({ productId, initialFeatures, onFeaturesUpdated }: ProductFeaturesProps) {
  const [features, setFeatures] = useState<ProductFeature[]>([
    {
      id: 'fast_shipping',
      name: 'شحن سريع',
      description: 'شحن سريع لجميع الولايات',
      icon: <Truck className="h-5 w-5" />,
      enabled: initialFeatures.hasFastShipping,
      text: initialFeatures.fastShippingText,
    },
    {
      id: 'money_back',
      name: 'استرداد المال',
      description: 'ضمان استرداد المال',
      icon: <RefreshCw className="h-5 w-5" />,
      enabled: initialFeatures.hasMoneyBack,
      text: initialFeatures.moneyBackText,
    },
    {
      id: 'quality_guarantee',
      name: 'ضمان الجودة',
      description: 'ضمان جودة المنتج',
      icon: <Shield className="h-5 w-5" />,
      enabled: initialFeatures.hasQualityGuarantee,
      text: initialFeatures.qualityGuaranteeText,
    },
  ]);
  
  const [isLoading, setIsLoading] = useState(false);

  const handleFeatureChange = (id: ProductFeature['id'], enabled: boolean) => {
    setFeatures(features.map(feature => 
      feature.id === id ? { ...feature, enabled } : feature
    ));
  };

  const handleTextChange = (id: ProductFeature['id'], text: string) => {
    setFeatures(features.map(feature => 
      feature.id === id ? { ...feature, text } : feature
    ));
  };

  const saveFeatures = async () => {
    setIsLoading(true);
    
    try {
      const fastShippingFeature = features.find(f => f.id === 'fast_shipping');
      const moneyBackFeature = features.find(f => f.id === 'money_back');
      const qualityGuaranteeFeature = features.find(f => f.id === 'quality_guarantee');
      
      // استخدام الوظيفة المخصصة التي أنشأناها في قاعدة البيانات
      const { data, error } = await supabase.rpc('update_product_features', {
        product_id: productId,
        p_has_fast_shipping: fastShippingFeature?.enabled,
        p_has_money_back: moneyBackFeature?.enabled,
        p_has_quality_guarantee: qualityGuaranteeFeature?.enabled,
        p_fast_shipping_text: fastShippingFeature?.text,
        p_money_back_text: moneyBackFeature?.text,
        p_quality_guarantee_text: qualityGuaranteeFeature?.text
      });
      
      if (error) {
        toast.error('حدث خطأ أثناء تحديث مميزات المنتج');
        return;
      }
      
      toast.success('تم تحديث مميزات المنتج بنجاح');
      if (onFeaturesUpdated) {
        onFeaturesUpdated();
      }
    } catch (err) {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>مميزات المنتج الإضافية</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {features.map((feature) => (
          <div key={feature.id} className="space-y-3 border-b pb-4 last:border-0">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {feature.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-medium">{feature.name}</div>
                  <Checkbox
                    checked={feature.enabled}
                    onCheckedChange={(checked) => 
                      handleFeatureChange(feature.id, checked as boolean)
                    }
                  />
                </div>
                <div className="text-sm text-muted-foreground">{feature.description}</div>
              </div>
            </div>
            <div className="mt-2">
              <Label htmlFor={`feature-text-${feature.id}`}>نص الميزة</Label>
              <Input
                id={`feature-text-${feature.id}`}
                value={feature.text}
                onChange={(e) => handleTextChange(feature.id, e.target.value)}
                placeholder="أدخل النص الذي سيظهر للعملاء"
                disabled={!feature.enabled}
                className="mt-1"
              />
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={saveFeatures} 
          disabled={isLoading}
        >
          {isLoading ? 'جاري الحفظ...' : 'حفظ المميزات'}
        </Button>
      </CardFooter>
    </Card>
  );
}
