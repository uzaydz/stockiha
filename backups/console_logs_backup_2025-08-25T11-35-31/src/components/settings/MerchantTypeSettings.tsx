import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Store, ShoppingBag, Layers, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';
import { MerchantType } from '@/components/sidebar/types';
import { OrganizationSettingsDB, OrganizationSettingsUpdate } from '@/types/organization-settings';

interface MerchantTypeSettingsProps {
  className?: string;
}

const merchantTypeOptions = [
  {
    value: 'traditional' as MerchantType,
    label: 'تاجر تقليدي',
    description: 'مبيعات مباشرة، نقطة بيع، إدارة مخزون تقليدية',
    icon: Store,
    features: [
      'نظام نقطة البيع المتقدم',
      'إدارة المخزون والمنتجات',
      'المبيعات المباشرة والفواتير',
      'إدارة العملاء والموردين',
      'خدمات الفليكسي والألعاب',
      'التقارير المالية'
    ]
  },
  {
    value: 'ecommerce' as MerchantType,
    label: 'تاجر إلكتروني',
    description: 'متجر إلكتروني، طلبات أونلاين، تخصيص المتجر',
    icon: ShoppingBag,
    features: [
      'المتجر الإلكتروني المتكامل',
      'إدارة الطلبات الإلكترونية',
      'تخصيص المتجر والثيمات',
      'صفحات الهبوط والتسويق',
      'إعدادات الشحن والدفع',
      'تحليلات المبيعات الإلكترونية'
    ]
  },
  {
    value: 'both' as MerchantType,
    label: 'كلاهما',
    description: 'جميع الميزات - تقليدي وإلكتروني معاً',
    icon: Layers,
    features: [
      'جميع ميزات التاجر التقليدي',
      'جميع ميزات التاجر الإلكتروني',
      'تكامل كامل بين القنوات',
      'مرونة في إدارة الأعمال',
      'تقارير شاملة لجميع القنوات'
    ]
  }
];

const MerchantTypeSettings: React.FC<MerchantTypeSettingsProps> = ({ className }) => {
  const [selectedType, setSelectedType] = useState<MerchantType>('both');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { currentOrganization } = useTenant();

  // جلب النوع الحالي عند تحميل المكون
  useEffect(() => {
    const fetchCurrentType = async () => {
      if (!currentOrganization?.id) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('organization_settings')
          .select('merchant_type')
          .eq('organization_id', currentOrganization.id)
          .single() as { data: OrganizationSettingsDB | null, error: any };

        if (error && error.code !== 'PGRST116') throw error; // تجاهل خطأ عدم وجود السجل

        if (data?.merchant_type) {
          setSelectedType(data.merchant_type as MerchantType);
        }
      } catch (error) {
        console.error('خطأ في جلب نوع التاجر:', error);
        toast({
          title: 'خطأ في التحميل',
          description: 'لم نتمكن من جلب إعدادات نوع التاجر',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentType();
  }, [currentOrganization?.id, toast]);

  const handleSave = async () => {
    if (!currentOrganization?.id) return;

    setIsSaving(true);
    try {
      const updateData: OrganizationSettingsUpdate = {
        merchant_type: selectedType
      };
      
      const { error } = await supabase
        .from('organization_settings')
        .update(updateData)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;

      toast({
        title: 'تم الحفظ بنجاح',
        description: `تم تحديث نوع التاجر إلى: ${merchantTypeOptions.find(opt => opt.value === selectedType)?.label}`,
        variant: 'default'
      });

      // إعادة تحميل الصفحة لتطبيق التغييرات على القائمة الجانبية
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('خطأ في حفظ نوع التاجر:', error);
      toast({
        title: 'حدث خطأ',
        description: 'لم يتم حفظ التغييرات، حاول مرة أخرى',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>نوع التاجر</CardTitle>
          <CardDescription>جاري التحميل...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5" />
          نوع التاجر
        </CardTitle>
        <CardDescription>
          حدد نوع عملك التجاري لعرض الميزات المناسبة في القائمة الجانبية
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup 
          value={selectedType} 
          onValueChange={(value) => setSelectedType(value as MerchantType)}
          className="space-y-4"
        >
          {merchantTypeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <div
                key={option.value}
                className="flex items-start space-x-3 space-x-reverse border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <RadioGroupItem 
                  value={option.value} 
                  id={option.value}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <Label 
                    htmlFor={option.value} 
                    className="flex items-center gap-2 text-base font-medium cursor-pointer"
                  >
                    <Icon className="w-5 h-5 text-blue-600" />
                    {option.label}
                  </Label>
                  <p className="text-sm text-gray-600 mb-2">
                    {option.description}
                  </p>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-700 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      الميزات المتاحة:
                    </p>
                    <ul className="text-xs text-gray-600 space-y-1 pr-4">
                      {option.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-1">
                          <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </RadioGroup>

        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="min-w-[120px]"
          >
            {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MerchantTypeSettings;
