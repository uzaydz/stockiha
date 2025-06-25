import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Upload, X, Plus, Trash2 } from 'lucide-react';
import { SubscriptionServiceCategory, PricingFormData } from './types';

interface AddServiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: SubscriptionServiceCategory[];
  organizationId: string;
  onSuccess: () => void;
}

interface ServiceFormData {
  name: string;
  description: string;
  provider: string;
  service_type: string;
  category_id: string;
  delivery_method: 'manual' | 'automatic';
  purchase_price: number;
  selling_price: number;
  total_quantity: number;
  available_quantity: number;
  logo_url: string;
  terms_conditions: string;
  usage_instructions: string;
  support_contact: string;
  renewal_policy: string;
  is_featured: boolean;
  is_active: boolean;
  supported_countries: string[];
}

const initialFormData: ServiceFormData = {
  name: '',
  description: '',
  provider: '',
  service_type: '',
  category_id: '',
  delivery_method: 'manual',
  purchase_price: 0,
  selling_price: 0,
  total_quantity: 0,
  available_quantity: 0,
  logo_url: '',
  terms_conditions: '',
  usage_instructions: '',
  support_contact: '',
  renewal_policy: '',
  is_featured: false,
  is_active: true,
  supported_countries: ['DZ']
};

const initialPricingData: PricingFormData = {
  duration_months: 1,
  duration_label: 'شهر واحد',
  purchase_price: 0,
  selling_price: 0,
  total_quantity: 0,
  available_quantity: 0,
  is_default: false,
  is_featured: false,
  discount_percentage: 0,
  promo_text: '',
  bonus_days: 0
};

export const AddServiceDialog: React.FC<AddServiceDialogProps> = ({
  isOpen,
  onClose,
  categories,
  organizationId,
  onSuccess
}) => {
  const [formData, setFormData] = useState<ServiceFormData>(initialFormData);
  const [pricingOptions, setPricingOptions] = useState<PricingFormData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const handleInputChange = (field: keyof ServiceFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addPricingOption = () => {
    setPricingOptions(prev => [...prev, { ...initialPricingData }]);
  };

  const removePricingOption = (index: number) => {
    setPricingOptions(prev => prev.filter((_, i) => i !== index));
  };

  const updatePricingOption = (index: number, field: keyof PricingFormData, value: any) => {
    setPricingOptions(prev => prev.map((option, i) => 
      i === index ? { ...option, [field]: value } : option
    ));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.provider || !formData.category_id) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // حساب الربح
      const profit_amount = formData.selling_price - formData.purchase_price;
      const profit_margin = formData.selling_price > 0 ? (profit_amount / formData.selling_price) * 100 : 0;

      // إدراج الخدمة
      const { data: serviceData, error: serviceError } = await supabase
        .from('subscription_services')
        .insert({
          ...formData,
          organization_id: organizationId,
          profit_amount,
          profit_margin,
          sold_quantity: 0,
          reserved_quantity: 0,
          rating: 0,
          review_count: 0,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // سنة واحدة
          created_by: organizationId
        })
        .select()
        .single();

      if (serviceError) throw serviceError;

      // إدراج خيارات الأسعار إذا كانت موجودة
      if (pricingOptions.length > 0) {
        const pricingData = pricingOptions.map((option, index) => ({
          ...option,
          subscription_service_id: serviceData.id,
          organization_id: organizationId,
          profit_amount: option.selling_price - option.purchase_price,
          profit_margin: option.selling_price > 0 ? ((option.selling_price - option.purchase_price) / option.selling_price) * 100 : 0,
          sold_quantity: 0,
          is_active: true,
          display_order: index + 1
        }));

        const { error: pricingError } = await (supabase as any)
          .from('subscription_service_pricing')
          .insert(pricingData);

        if (pricingError) throw pricingError;
      }

      toast({
        title: "تم بنجاح",
        description: "تم إضافة الخدمة بنجاح",
      });

      // إعادة تعيين النموذج
      setFormData(initialFormData);
      setPricingOptions([]);
      setActiveTab('basic');
      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error adding service:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في إضافة الخدمة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة خدمة اشتراك جديدة</DialogTitle>
          <DialogDescription>
            أدخل تفاصيل الخدمة وأسعارها للمدد المختلفة
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">المعلومات الأساسية</TabsTrigger>
            <TabsTrigger value="pricing">الأسعار</TabsTrigger>
            <TabsTrigger value="details">التفاصيل الإضافية</TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم الخدمة *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="مثال: نتفليكس بريميوم"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider">مقدم الخدمة *</Label>
                <Input
                  id="provider"
                  value={formData.provider}
                  onChange={(e) => handleInputChange('provider', e.target.value)}
                  placeholder="مثال: Netflix"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">الفئة *</Label>
                <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر فئة" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service_type">نوع الخدمة</Label>
                <Input
                  id="service_type"
                  value={formData.service_type}
                  onChange={(e) => handleInputChange('service_type', e.target.value)}
                  placeholder="مثال: اشتراك شهري"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_method">طريقة التسليم</Label>
                <Select value={formData.delivery_method} onValueChange={(value) => handleInputChange('delivery_method', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">يدوي</SelectItem>
                    <SelectItem value="automatic">تلقائي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo_url">رابط الشعار</Label>
                <Input
                  id="logo_url"
                  value={formData.logo_url}
                  onChange={(e) => handleInputChange('logo_url', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="وصف مفصل للخدمة..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchase_price">سعر الشراء (دج)</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  value={formData.purchase_price}
                  onChange={(e) => handleInputChange('purchase_price', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="selling_price">سعر البيع (دج)</Label>
                <Input
                  id="selling_price"
                  type="number"
                  value={formData.selling_price}
                  onChange={(e) => handleInputChange('selling_price', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_quantity">الكمية الإجمالية</Label>
                <Input
                  id="total_quantity"
                  type="number"
                  value={formData.total_quantity}
                  onChange={(e) => handleInputChange('total_quantity', parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="available_quantity">الكمية المتاحة</Label>
                <Input
                  id="available_quantity"
                  type="number"
                  value={formData.available_quantity}
                  onChange={(e) => handleInputChange('available_quantity', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => handleInputChange('is_featured', checked)}
                />
                <Label htmlFor="is_featured">خدمة مميزة</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <Label htmlFor="is_active">نشط</Label>
              </div>
            </div>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">خيارات الأسعار</h3>
              <Button onClick={addPricingOption} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                إضافة خيار سعر
              </Button>
            </div>

            {pricingOptions.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">لا توجد خيارات أسعار. يمكنك إضافة خيارات أسعار متعددة للمدد المختلفة.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pricingOptions.map((option, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">خيار السعر {index + 1}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePricingOption(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>المدة (بالأشهر)</Label>
                          <Input
                            type="number"
                            value={option.duration_months}
                            onChange={(e) => updatePricingOption(index, 'duration_months', parseInt(e.target.value) || 1)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>تسمية المدة</Label>
                          <Input
                            value={option.duration_label}
                            onChange={(e) => updatePricingOption(index, 'duration_label', e.target.value)}
                            placeholder="مثال: شهر واحد"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>سعر الشراء (دج)</Label>
                          <Input
                            type="number"
                            value={option.purchase_price}
                            onChange={(e) => updatePricingOption(index, 'purchase_price', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>سعر البيع (دج)</Label>
                          <Input
                            type="number"
                            value={option.selling_price}
                            onChange={(e) => updatePricingOption(index, 'selling_price', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>الكمية الإجمالية</Label>
                          <Input
                            type="number"
                            value={option.total_quantity}
                            onChange={(e) => updatePricingOption(index, 'total_quantity', parseInt(e.target.value) || 0)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>الكمية المتاحة</Label>
                          <Input
                            type="number"
                            value={option.available_quantity}
                            onChange={(e) => updatePricingOption(index, 'available_quantity', parseInt(e.target.value) || 0)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>نسبة الخصم (%)</Label>
                          <Input
                            type="number"
                            value={option.discount_percentage}
                            onChange={(e) => updatePricingOption(index, 'discount_percentage', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>أيام إضافية مجانية</Label>
                          <Input
                            type="number"
                            value={option.bonus_days}
                            onChange={(e) => updatePricingOption(index, 'bonus_days', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>نص ترويجي</Label>
                        <Input
                          value={option.promo_text}
                          onChange={(e) => updatePricingOption(index, 'promo_text', e.target.value)}
                          placeholder="مثال: وفر 20%"
                        />
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={option.is_default}
                            onCheckedChange={(checked) => updatePricingOption(index, 'is_default', checked)}
                          />
                          <Label>الخيار الافتراضي</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={option.is_featured}
                            onCheckedChange={(checked) => updatePricingOption(index, 'is_featured', checked)}
                          />
                          <Label>مميز</Label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="terms_conditions">الشروط والأحكام</Label>
                <Textarea
                  id="terms_conditions"
                  value={formData.terms_conditions}
                  onChange={(e) => handleInputChange('terms_conditions', e.target.value)}
                  placeholder="الشروط والأحكام الخاصة بالخدمة..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usage_instructions">تعليمات الاستخدام</Label>
                <Textarea
                  id="usage_instructions"
                  value={formData.usage_instructions}
                  onChange={(e) => handleInputChange('usage_instructions', e.target.value)}
                  placeholder="كيفية استخدام الخدمة..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="support_contact">معلومات الدعم</Label>
                <Input
                  id="support_contact"
                  value={formData.support_contact}
                  onChange={(e) => handleInputChange('support_contact', e.target.value)}
                  placeholder="البريد الإلكتروني أو رقم الهاتف للدعم"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="renewal_policy">سياسة التجديد</Label>
                <Textarea
                  id="renewal_policy"
                  value={formData.renewal_policy}
                  onChange={(e) => handleInputChange('renewal_policy', e.target.value)}
                  placeholder="سياسة تجديد الاشتراك..."
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "جاري الحفظ..." : "حفظ الخدمة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 