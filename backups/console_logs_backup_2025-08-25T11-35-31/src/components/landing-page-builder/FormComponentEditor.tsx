import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useOrganization } from '@/hooks/useOrganization';
import { useFormData } from '@/hooks/useFormData.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FormSettingsPanel from './form-editor/FormSettingsPanel';

interface FormComponentEditorProps {
  settings: {
    title: string;
    productId: string | null;
    formId: string | null;
    buttonText: string;
    backgroundColor: string;
    advancedSettings?: Record<string, any>;
    [key: string]: any;
  };
  onUpdate: (settings: Record<string, any>) => void;
}

/**
 * مكون تحرير النموذج في صفحة الهبوط - نسخة محسّنة
 */
const FormComponentEditor: React.FC<FormComponentEditorProps> = ({
  settings,
  onUpdate,
}) => {
  const { t } = useTranslation();
  const { organization } = useOrganization();
  
  // استخدام المكون المركزي لإدارة بيانات النماذج
  const { 
    forms, 
    products, 
    isLoadingForms, 
    isLoadingProducts 
  } = useFormData(
    organization?.id
  );
  
  // التأكد من وجود organization قبل محاولة تحميل البيانات
  const hasOrganization = Boolean(organization?.id);
  
  // إضافة console logs للتشخيص
  console.log('🔍 FormComponentEditor - البيانات:', {
    organizationId: organization?.id,
    hasOrganization,
    formsCount: forms?.length || 0,
    forms: forms,
    isLoadingForms,
    isLoadingProducts
  });
  
  // طباعة تفاصيل النماذج
  if (forms && forms.length > 0) {
    console.log('📋 تفاصيل النماذج المتاحة:', forms.map(form => ({
      id: form.id,
      name: form.name,
      is_active: form.is_active,
      fields: form.fields
    })));
  }
  
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  // استخدام وظائف المذكرة لتحسين الأداء
  const localSettings = useMemo(() => ({ ...settings }), [settings]);

  // تتبع التغييرات في الإعدادات المتقدمة للتصحيح
  useEffect(() => {

    if (settings.advancedSettings) {
      
    }
  }, [settings]);

  // تحديث حقول النموذج عند تحميل البيانات أو تغيير النموذج
  useEffect(() => {
    if (settings.formId && forms && forms.length > 0) {
      const selectedForm = forms.find(f => f.id === settings.formId);
      if (selectedForm && (!settings.fields || settings.fields.length === 0)) {
        console.log('🔄 تحديث حقول النموذج تلقائياً:', {
          formId: settings.formId,
          fields: selectedForm.fields
        });
        
        onUpdate({
          ...settings,
          fields: selectedForm.fields || []
        });
      }
    }
  }, [settings.formId, forms, settings.fields, onUpdate]);

  // معالجة اختيار المنتج
  const handleProductSelect = useCallback((productId: string) => {
    onUpdate({ ...localSettings, productId });
    setProductModalOpen(false);
  }, [localSettings, onUpdate]);
  
  // معالجة اختيار النموذج
  const handleFormSelect = useCallback((formId: string) => {
    // البحث عن النموذج المحدد لجلب حقوله
    const selectedForm = forms.find(f => f.id === formId);
    
    // تحديث الإعدادات مع معرف النموذج وحقوله
    const updatedSettings = {
      ...localSettings,
      formId,
      fields: selectedForm?.fields || [] // إضافة حقول النموذج
    };
    
    console.log('🔍 تم اختيار النموذج:', {
      formId,
      selectedForm,
      fields: selectedForm?.fields,
      updatedSettings
    });
    
    onUpdate(updatedSettings);
    setFormModalOpen(false);
  }, [localSettings, onUpdate, forms]);
  
  // الذهاب إلى صفحة إنشاء منتج جديد
  const goToCreateProduct = useCallback(() => {
    window.open('/dashboard/products/create', '_blank');
  }, []);
  
  // الذهاب إلى صفحة إنشاء نموذج جديد
  const goToCreateForm = useCallback(() => {
    window.open('/form-settings', '_blank');
  }, []);
  
  // الحصول على اسم المنتج المحدد
  const getSelectedProductName = useCallback(() => {
    if (!settings.productId) return null;
    const product = products.find(p => p.id === settings.productId);
    return product ? product.name : 'منتج غير معروف';
  }, [settings.productId, products]);
  
  // الحصول على اسم النموذج المحدد
  const getSelectedFormName = useCallback(() => {
    if (!settings.formId) return null;
    const form = forms.find(f => f.id === settings.formId);
    return form ? form.name : 'نموذج غير معروف';
  }, [settings.formId, forms]);

  // معالج تحديث حقول الإعدادات المحلية - معدل للتعامل مع الإعدادات المتقدمة بشكل صحيح
  const handleSettingChange = useCallback((field: string, value: any) => {
    
    const updatedSettings = { ...localSettings, [field]: value };
    
    // إذا تم تغيير النموذج، تأكد من تحديث الحقول أيضاً
    if (field === 'formId' && value) {
      const selectedForm = forms.find(f => f.id === value);
      if (selectedForm) {
        updatedSettings.fields = selectedForm.fields || [];
        console.log('🔄 تم تحديث حقول النموذج:', {
          formId: value,
          fields: selectedForm.fields
        });
      }
    }
    
    onUpdate(updatedSettings);
  }, [localSettings, onUpdate, forms]);

  // معالج خاص لتحديثات الإعدادات المتقدمة
  const handleAdvancedSettingsChange = useCallback((newSettings: Record<string, any>) => {

    // عمل نسخة عميقة من الإعدادات المتقدمة لضمان إنشاء كائن جديد
    const updatedSettings = {
      ...localSettings,
      ...newSettings,
      advancedSettings: newSettings.advancedSettings ? 
        JSON.parse(JSON.stringify(newSettings.advancedSettings)) : 
        localSettings.advancedSettings
    };

    onUpdate(updatedSettings);
  }, [localSettings, onUpdate]);
  
  // معالج تغيير التبويب النشط
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="basic">{t('الإعدادات الأساسية')}</TabsTrigger>
          <TabsTrigger value="advanced">{t('المظهر والتخصيص')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="form-title">{t('عنوان النموذج')}</Label>
            <Input 
              id="form-title"
              value={settings.title || ''} 
              onChange={(e) => handleSettingChange('title', e.target.value)}
              placeholder={t('أدخل عنوان النموذج')}
            />
            <p className="text-xs text-muted-foreground">
              {t('سيظهر هذا العنوان فوق النموذج في صفحة الهبوط.')}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="form-button-text">{t('نص زر الإرسال')}</Label>
            <Input 
              id="form-button-text"
              value={settings.buttonText || ''} 
              onChange={(e) => handleSettingChange('buttonText', e.target.value)}
              placeholder={t('إرسال الطلب')}
            />
            <p className="text-xs text-muted-foreground">
              {t('النص الذي سيظهر على زر إرسال النموذج.')}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="form-background">{t('لون خلفية قسم النموذج')}</Label>
            <div className="flex items-center gap-2">
              <input 
                type="color" 
                id="form-background"
                value={settings.backgroundColor || '#f9f9f9'} 
                onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                className="h-10 w-10 cursor-pointer"
              />
              <Input 
                value={settings.backgroundColor || '#f9f9f9'} 
                onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                className="w-32"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('لون خلفية القسم الذي يحتوي على النموذج.')}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>{t('المنتج')}</Label>
            
            {!settings.productId ? (
              <div className="border rounded-md p-3 bg-muted/30">
                <p className="text-sm text-muted-foreground mb-2">
                  {t('اختر المنتج الذي سيرتبط به النموذج.')}
                </p>
                
                <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      {t('اختيار منتج')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-auto">
                    <DialogHeader>
                      <DialogTitle>{t('اختر منتجاً')}</DialogTitle>
                      <DialogDescription>
                        {t('اختر المنتج الذي ترغب في ربطه بالنموذج في صفحة الهبوط.')}
                      </DialogDescription>
                    </DialogHeader>
                    
                    {isLoadingProducts ? (
                      <div className="text-center py-4">
                        {t('جاري تحميل المنتجات...')}
                      </div>
                    ) : !hasOrganization ? (
                      <div className="text-center py-4">
                        <p className="mb-2">{t('جاري تحميل بيانات المؤسسة...')}</p>
                      </div>
                    ) : !products || products.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="mb-2">{t('لا توجد منتجات بعد.')}</p>
                        <Button variant="link" onClick={goToCreateProduct} className="flex items-center gap-1 mx-auto">
                          {t('إنشاء منتج جديد')}
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 py-2">
                        {products.map(product => (
                          <Button
                            key={product.id}
                            variant="outline"
                            className="justify-start h-auto py-3 px-4"
                            onClick={() => handleProductSelect(product.id)}
                          >
                            <div className="text-left">
                              <div className="font-medium">{product.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {(product as any).description?.substring(0, 60) || t('بدون وصف')}
                                {(product as any).description?.length > 60 ? '...' : ''}
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={goToCreateProduct} className="flex items-center gap-1">
                        {t('إنشاء منتج جديد')}
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <div className="border rounded-md p-3 bg-muted/30">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{getSelectedProductName()}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t('منتج مرتبط بالنموذج')}
                    </div>
                  </div>
                  <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="link" className="px-2">
                        {t('تغيير')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>{t('اختر منتجاً')}</DialogTitle>
                        <DialogDescription>
                          {t('اختر المنتج الذي ترغب في ربطه بالنموذج في صفحة الهبوط.')}
                        </DialogDescription>
                      </DialogHeader>
                      
                      {isLoadingProducts ? (
                        <div className="text-center py-4">
                          {t('جاري تحميل المنتجات...')}
                        </div>
                      ) : !hasOrganization ? (
                        <div className="text-center py-4">
                          <p className="mb-2">{t('جاري تحميل بيانات المؤسسة...')}</p>
                        </div>
                      ) : !products || products.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="mb-2">{t('لا توجد منتجات بعد.')}</p>
                          <Button variant="link" onClick={goToCreateProduct} className="flex items-center gap-1 mx-auto">
                            {t('إنشاء منتج جديد')}
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 py-2">
                          {products.map(product => (
                            <Button
                              key={product.id}
                              variant="outline"
                              className="justify-start h-auto py-3 px-4"
                              onClick={() => handleProductSelect(product.id)}
                            >
                              <div className="text-left">
                                <div className="font-medium">{product.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {(product as any).description?.substring(0, 60) || t('بدون وصف')}
                                  {(product as any).description?.length > 60 ? '...' : ''}
                                </div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      )}
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={goToCreateProduct} className="flex items-center gap-1">
                          {t('إنشاء منتج جديد')}
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>{t('النموذج')}</Label>
            
            {!settings.formId ? (
              <div className="border rounded-md p-3 bg-muted/30">
                <p className="text-sm text-muted-foreground mb-2">
                  {t('اختر النموذج الذي تريد استخدامه في صفحة الهبوط.')}
                </p>
                
                <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      {t('اختيار نموذج')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-auto">
                    <DialogHeader>
                      <DialogTitle>{t('اختر نموذجاً')}</DialogTitle>
                      <DialogDescription>
                        {t('اختر النموذج الذي ترغب في استخدامه في صفحة الهبوط.')}
                      </DialogDescription>
                    </DialogHeader>
                    
                    {isLoadingForms ? (
                      <div className="text-center py-4">
                        {t('جاري تحميل النماذج...')}
                      </div>
                    ) : !forms || forms.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="mb-2">{t('لا توجد نماذج بعد.')}</p>
                        <Button variant="link" onClick={goToCreateForm} className="flex items-center gap-1 mx-auto">
                          {t('إنشاء نموذج جديد')}
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 py-2">
                        {forms.map(form => (
                          <Button
                            key={form.id}
                            variant="outline"
                            className="justify-start h-auto py-3 px-4"
                            onClick={() => handleFormSelect(form.id)}
                          >
                            <div className="text-left">
                              <div className="font-medium">{form.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {t('عدد الحقول')}: {form.fields?.length || 0}
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={goToCreateForm} className="flex items-center gap-1">
                        {t('إنشاء نموذج جديد')}
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <div className="border rounded-md p-3 bg-muted/30">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{getSelectedFormName()}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t('نموذج مختار')}
                    </div>
                  </div>
                  <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="link" className="px-2">
                        {t('تغيير')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>{t('اختر نموذجاً')}</DialogTitle>
                        <DialogDescription>
                          {t('اختر النموذج الذي ترغب في استخدامه في صفحة الهبوط.')}
                        </DialogDescription>
                      </DialogHeader>
                      
                      {isLoadingForms ? (
                        <div className="text-center py-4">
                          {t('جاري تحميل النماذج...')}
                        </div>
                      ) : !forms || forms.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="mb-2">{t('لا توجد نماذج بعد.')}</p>
                          <Button variant="link" onClick={goToCreateForm} className="flex items-center gap-1 mx-auto">
                            {t('إنشاء نموذج جديد')}
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 py-2">
                          {forms.map(form => (
                            <Button
                              key={form.id}
                              variant="outline"
                              className="justify-start h-auto py-3 px-4"
                              onClick={() => handleFormSelect(form.id)}
                            >
                              <div className="text-left">
                                <div className="font-medium">{form.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {t('عدد الحقول')}: {form.fields?.length || 0}
                                </div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      )}
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={goToCreateForm} className="flex items-center gap-1">
                          {t('إنشاء نموذج جديد')}
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}
            
            {!settings.formId && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('تنبيه')}</AlertTitle>
                <AlertDescription>
                  {t('يجب اختيار نموذج لإكمال إعداد المكون.')}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="advanced">
          <FormSettingsPanel 
            settings={settings} 
            onSettingsChange={handleAdvancedSettingsChange} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FormComponentEditor;
