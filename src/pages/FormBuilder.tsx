import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenant } from '@/context/TenantContext';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormBuilderHeader } from '@/components/form-builder/FormBuilderHeader';
import { FormSettingsPanel } from '@/components/form-builder/FormSettingsPanel';
import { FormFieldsPanel } from '@/components/form-builder/FormFieldsPanel';
import { ProductsPanel } from '@/components/form-builder/ProductsPanel';
import { ShippingIntegrationFields } from '@/components/form-builder/ShippingIntegrationFields';
import { FormField as IFormField, getFormSettingsById, upsertFormSettings, getProducts } from '@/api/form-settings';
import { v4 as uuidv4 } from 'uuid';
import Layout from '@/components/Layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

// نموذج منتج مبسط
interface ProductItem {
  id: string;
  name: string;
  image: string;
}

export default function FormBuilder() {
  const { formId } = useParams<{ formId: string }>();
  const isNewForm = formId === 'new';
  const navigate = useNavigate();
  const { currentOrganization } = useTenant();
  const { toast } = useToast();
  const [formName, setFormName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<IFormField[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [availableProducts, setAvailableProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('fields');
  const [shippingIntegration, setShippingIntegration] = useState<{
    enabled: boolean;
    provider: string | null;
  }>({
    enabled: false,
    provider: null,
  });

  // تحميل البيانات عند بدء تشغيل الصفحة
  useEffect(() => {
    const loadData = async () => {
      if (!currentOrganization) return;

      setLoading(true);
      try {
        // تحميل قائمة المنتجات المتاحة
        const products = await getProducts(currentOrganization.id);
        setAvailableProducts(products);

        // إذا كان يتم تحرير نموذج موجود
        if (!isNewForm && formId) {
          const formData = await getFormSettingsById(formId);
          if (formData) {
            setFormName(formData.name);
            setIsDefault(formData.is_default);
            setIsActive(formData.is_active);
            setFields(formData.fields);
            setSelectedProducts(formData.product_ids);
            
            // تحميل إعدادات تكامل الشحن إذا كانت موجودة
            if (formData.settings && formData.settings.shipping_integration) {
              setShippingIntegration(formData.settings.shipping_integration);
            }
          } else {
            toast({
              title: 'خطأ',
              description: 'لم يتم العثور على النموذج المطلوب',
              variant: 'destructive',
            });
            navigate('/dashboard/form-settings');
          }
        } else {
          // إعداد نموذج جديد فارغ
          setFormName('نموذج جديد');
          setIsDefault(false); // تعطيل تعيين النموذج كافتراضي للنماذج الجديدة
          setIsActive(true); // تفعيل النموذج
          // إضافة حقول افتراضية
          setFields([
            {
              id: uuidv4(),
              name: 'fullName',
              label: 'الاسم واللقب',
              type: 'text',
              required: true,
              placeholder: 'أدخل الاسم واللقب',
              order: 0,
              isVisible: true,
              validation: {
                minLength: 3,
                message: 'يرجى إدخال اسم واللقب بشكل صحيح',
              },
            },
            {
              id: uuidv4(),
              name: 'phone',
              label: 'رقم الهاتف',
              type: 'tel',
              required: true,
              placeholder: 'أدخل رقم الهاتف',
              order: 1,
              isVisible: true,
              validation: {
                minLength: 10,
                message: 'يرجى إدخال رقم هاتف صحيح',
              },
            },
            {
              id: uuidv4(),
              name: 'deliveryType',
              label: 'نوع التوصيل الثابت',
              type: 'select',
              required: true,
              placeholder: 'اختر نوع التوصيل',
              order: 2,
              isVisible: true,
              options: [
                { label: 'توصيل للمنزل', value: 'home' },
                { label: 'استلام من مكتب البريد', value: 'post_office' },
                { label: 'استلام من مكتب شركة التوصيل', value: 'delivery_office' }
              ]
            },
            {
              id: uuidv4(),
              name: 'province',
              label: 'الولاية',
              type: 'province',
              required: true,
              placeholder: 'اختر الولاية',
              order: 3,
              isVisible: true,
              linkedFields: {
                municipalityField: 'auto',
              },
            },
            {
              id: uuidv4(),
              name: 'municipality',
              label: 'البلدية',
              type: 'municipality',
              required: true,
              placeholder: 'اختر البلدية',
              order: 4,
              isVisible: true,
              linkedFields: {
                provinceField: null,
              },
              dependency: {
                fieldId: '', // سيتم تحديثه بعد إنشاء الحقول
                value: '*'
              }
            },
          ]);
        }
      } catch (error) {
        console.error('Error loading form data:', error);
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء تحميل البيانات',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentOrganization, formId, isNewForm, navigate, toast]);

  // ربط حقل البلدية بحقل الولاية
  useEffect(() => {
    // تأكد من وجود الحقول قبل المتابعة
    if (fields.length < 2) return;

    const provinceField = fields.find(f => f.type === 'province');
    const municipalityField = fields.find(f => f.type === 'municipality');

    if (provinceField && municipalityField && !municipalityField.dependency?.fieldId) {
      // تحديث حقل البلدية لربطه بحقل الولاية
      const updatedMunicipalityField = {
        ...municipalityField,
        dependency: {
          fieldId: provinceField.id,
          value: '*'
        },
        linkedFields: {
          ...municipalityField.linkedFields,
          provinceField: provinceField.id
        }
      };

      setFields(fields.map(field => 
        field.id === municipalityField.id ? updatedMunicipalityField : field
      ));
    }
  }, [fields]);

  // إضافة حقل جديد
  const addField = (type: IFormField['type'] = 'text') => {
    const newFieldId = uuidv4();
    let newField: IFormField = {
      id: newFieldId,
      name: `field_${fields.length + 1}`,
      label: getDefaultLabelForType(type),
      type: type,
      required: false,
      placeholder: '',
      order: fields.length,
      isVisible: true,
    };

    // إعدادات خاصة لأنواع حقول معينة
    if (type === 'province') {
      newField = {
        ...newField,
        placeholder: 'اختر الولاية',
        linkedFields: {
          municipalityField: null,
        },
      };
    } else if (type === 'municipality') {
      // البحث عن حقل الولاية
      const provinceField = fields.find(f => f.type === 'province');
      
      newField = {
        ...newField,
        placeholder: 'اختر البلدية',
        linkedFields: {
          provinceField: provinceField?.id || null,
        },
        dependency: {
          fieldId: provinceField?.id || '',
          value: '*'
        }
      };
    } else if (type === 'select') {
      newField = {
        ...newField,
        placeholder: 'اختر من القائمة',
        options: [
          { label: 'الخيار الأول', value: 'option1' },
          { label: 'الخيار الثاني', value: 'option2' },
          { label: 'الخيار الثالث', value: 'option3' },
        ]
      };
      
      // إذا كان الحقل يتعلق بشركة التوصيل
      if (newField.name.includes('delivery') || newField.label.includes('توصيل')) {
        newField = {
          ...newField,
          label: 'شركة التوصيل',
          name: 'deliveryCompany',
          placeholder: 'اختر شركة التوصيل',
          options: [
            { label: 'ياليدين', value: 'yalidine' },
            { label: 'ZR إكسبرس', value: 'zr_express' },
            { label: 'كويك لاين', value: 'quick_line' }
          ]
        };
      }
    } else if (type === 'radio') {
      newField = {
        ...newField,
        options: [
          { label: 'الخيار الأول', value: 'option1' },
          { label: 'الخيار الثاني', value: 'option2' },
        ]
      };
      
      // إذا كان الحقل يتعلق بنوع التوصيل
      if (newField.name.includes('delivery') || newField.label.includes('توصيل')) {
        newField = {
          ...newField,
          label: 'نوع التوصيل',
          name: 'deliveryOption',
          options: [
            { label: 'توصيل للمنزل', value: 'home' },
            { label: 'استلام من مكتب شركة التوصيل', value: 'office' }
          ]
        };
      }
    } else if (type === 'checkbox') {
      newField = {
        ...newField,
        options: [
          { label: 'الخيار الأول', value: 'option1' },
          { label: 'الخيار الثاني', value: 'option2' },
          { label: 'الخيار الثالث', value: 'option3' },
        ]
      };
    } else if (type === 'deliveryType') {
      // حقل خاص بنوع التوصيل (ثابت لا يمكن تعديله) للتكامل مع شركة التوصيل
      newField = {
        ...newField,
        label: 'نوع التوصيل الثابت',
        name: 'fixedDeliveryType',
        type: 'radio', // نستخدم حقل راديو ولكنه سيكون ثابتًا لا يمكن تعديله
        required: true,
        options: [
          { label: 'توصيل للمنزل', value: 'home' },
          { label: 'استلام من مكتب شركة التوصيل', value: 'desk' }
        ],
        defaultValue: 'home' // القيمة الافتراضية هي التوصيل للمنزل
      };
    }

    setFields([...fields, newField]);
  };

  // الحصول على العنوان الافتراضي لنوع الحقل
  const getDefaultLabelForType = (type: IFormField['type']): string => {
    switch (type) {
      case 'text': return `حقل نصي ${fields.length + 1}`;
      case 'email': return 'البريد الإلكتروني';
      case 'tel': return 'رقم الهاتف';
      case 'select': return 'اختر من القائمة';
      case 'radio': return 'اختيار واحد';
      case 'checkbox': return 'اختيار متعدد';
      case 'province': return 'الولاية';
      case 'municipality': return 'البلدية';
      case 'deliveryType': return 'نوع التوصيل الثابت';
      default: return `حقل ${fields.length + 1}`;
    }
  };

  // تحديث حقل
  const updateField = (updatedField: IFormField) => {
    setFields(fields.map(field => 
      field.id === updatedField.id ? updatedField : field
    ));
  };

  // حذف حقل
  const deleteField = (fieldId: string) => {
    const fieldToDelete = fields.find(f => f.id === fieldId);

    // إذا كان الحقل المحذوف هو حقل ولاية، تحقق من وجود حقول بلدية مرتبطة به
    if (fieldToDelete?.type === 'province') {
      const linkedMunicipalityFields = fields.filter(
        f => f.type === 'municipality' && 
        (f.dependency?.fieldId === fieldId || f.linkedFields?.provinceField === fieldId)
      );

      if (linkedMunicipalityFields.length > 0) {
        toast({
          title: 'تنبيه',
          description: 'توجد حقول بلدية مرتبطة بهذا الحقل. قم بحذفها أو تغيير ارتباطاتها.',
          variant: 'default',
        });
        return;
      }
    }

    setFields(fields.filter(field => field.id !== fieldId));
  };

  // تحدير ترتيب الحقول
  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const index = fields.findIndex(field => field.id === fieldId);
    if (index === -1) return;

    const newFields = [...fields];
    
    if (direction === 'up' && index > 0) {
      // تبديل الحقل الحالي مع الحقل السابق
      [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
    } else if (direction === 'down' && index < fields.length - 1) {
      // تبديل الحقل الحالي مع الحقل التالي
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    }

    // تحديث ترتيب الحقول
    newFields.forEach((field, idx) => {
      field.order = idx;
    });

    setFields(newFields);
  };

  // تحديد أو إلغاء تحديد منتج
  const toggleProduct = (productId: string) => {
    setSelectedProducts(prevSelected => {
      const isSelected = prevSelected.includes(productId);
      if (isSelected) {
        return prevSelected.filter(id => id !== productId);
      } else {
        return [...prevSelected, productId];
      }
    });
  };

  // تحديد جميع المنتجات
  const selectAllProducts = () => {
    const allProductIds = availableProducts.map(product => product.id);
    setSelectedProducts(allProductIds);
  };

  // إلغاء تحديد جميع المنتجات
  const unselectAllProducts = () => {
    setSelectedProducts([]);
  };

  // حفظ النموذج
  const saveForm = async () => {
    if (!currentOrganization) {
      toast({
        title: 'خطأ',
        description: 'يجب تسجيل الدخول لحفظ النموذج',
        variant: 'destructive',
      });
      return;
    }

    if (!formName.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال اسم النموذج',
        variant: 'destructive',
      });
      return;
    }

    if (fields.length === 0) {
      toast({
        title: 'خطأ',
        description: 'يجب إضافة حقل واحد على الأقل',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // ترتيب الحقول حسب الترتيب المحدد
      const sortedFields = [...fields].sort((a, b) => a.order - b.order);

      const formData = {
        id: isNewForm ? undefined : formId,
        name: formName,
        fields: sortedFields,
        product_ids: isDefault ? [] : selectedProducts,
        is_default: isNewForm ? false : isDefault,
        is_active: isActive,
        shipping_integration: shippingIntegration
      };

      const result = await upsertFormSettings(currentOrganization.id, formData);
      
      if (result) {
        toast({
          title: 'تم بنجاح',
          description: `تم ${isNewForm ? 'إنشاء' : 'تحديث'} النموذج بنجاح`,
        });
        navigate('/dashboard/form-settings');
      }
    } catch (error) {
      console.error('Error saving form:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حفظ النموذج',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // إضافة حقول مجهزة مسبقًا
  const addPresetFields = () => {
    // إنشاء قائمة بالحقول المجهزة مسبقًا
    const presetFields: IFormField[] = [
      {
        id: uuidv4(),
        name: 'fullName',
        label: 'الاسم واللقب',
        type: 'text',
        required: true,
        placeholder: 'أدخل الاسم واللقب',
        order: fields.length,
        isVisible: true,
        validation: {
          minLength: 3,
          message: 'يرجى إدخال اسم واللقب بشكل صحيح',
        },
      },
      {
        id: uuidv4(),
        name: 'phone',
        label: 'رقم الهاتف',
        type: 'tel',
        required: true,
        placeholder: 'أدخل رقم الهاتف',
        order: fields.length + 1,
        isVisible: true,
        validation: {
          minLength: 10,
          message: 'يرجى إدخال رقم هاتف صحيح',
        },
      },
      {
        id: uuidv4(),
        name: 'deliveryType',
        label: 'نوع التوصيل الثابت',
        type: 'select',
        required: true,
        placeholder: 'اختر نوع التوصيل',
        order: fields.length + 2,
        isVisible: true,
        options: [
          { label: 'توصيل للمنزل', value: 'home' },
          { label: 'استلام من مكتب البريد', value: 'post_office' },
          { label: 'استلام من مكتب شركة التوصيل', value: 'delivery_office' }
        ]
      },
      {
        id: uuidv4(),
        name: 'province',
        label: 'الولاية',
        type: 'province',
        required: true,
        placeholder: 'اختر الولاية',
        order: fields.length + 3,
        isVisible: true,
        linkedFields: {
          municipalityField: 'auto',
        },
      },
      {
        id: uuidv4(),
        name: 'municipality',
        label: 'البلدية',
        type: 'municipality',
        required: true,
        placeholder: 'اختر البلدية',
        order: fields.length + 4,
        isVisible: true,
        linkedFields: {
          provinceField: null,
        },
        dependency: {
          fieldId: '', // سيتم تحديثه بعد إضافة الحقول
          value: '*'
        }
      },
    ];

    // إضافة الحقول إلى القائمة الحالية
    setFields([...fields, ...presetFields]);

    // ربط حقل البلدية بحقل الولاية (سيتم تنفيذه عن طريق useEffect الموجود)
  };

  // محتوى الصفحة
  const pageContent = (
    <div className="space-y-4">
      {loading ? (
        <div className="w-full h-96 flex items-center justify-center">
          <div className="animate-pulse text-center">
            <div className="h-8 w-64 bg-gray-200 rounded mb-4 mx-auto"></div>
            <div className="h-4 w-32 bg-gray-200 rounded mx-auto"></div>
          </div>
        </div>
      ) : (
        <>
          <FormBuilderHeader
            isNewForm={isNewForm}
            formName={formName}
            setFormName={setFormName}
            isDefault={isDefault}
            setIsDefault={setIsDefault}
            isActive={isActive}
            setIsActive={setIsActive}
            onSave={saveForm}
            saving={saving}
            onCancel={() => navigate('/dashboard/form-settings')}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="fields">الحقول</TabsTrigger>
              <TabsTrigger value="settings">الإعدادات</TabsTrigger>
              {!isDefault && <TabsTrigger value="products">المنتجات</TabsTrigger>}
            </TabsList>
            <TabsContent value="fields">
              <FormFieldsPanel
                fields={fields}
                onAddField={addField}
                onUpdateField={updateField}
                onDeleteField={deleteField}
                onMoveField={moveField}
                onAddPresetFields={addPresetFields}
              />
            </TabsContent>
            <TabsContent value="settings">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormSettingsPanel
                  formName={formName}
                  isDefault={isDefault}
                  setIsDefault={setIsDefault}
                  isActive={isActive}
                  setIsActive={setIsActive}
                  onFormNameChange={setFormName}
                  shippingIntegration={shippingIntegration}
                  onShippingIntegrationChange={(settings) => setShippingIntegration(settings)}
                />
                {shippingIntegration.enabled && shippingIntegration.provider && (
                  <ShippingIntegrationFields shippingIntegration={shippingIntegration} />
                )}
              </div>
              
              {isDefault && (
                <Alert className="mt-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300">
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle className="text-sm font-semibold">معلومات حول النموذج الافتراضي:</AlertTitle>
                  <AlertDescription className="text-sm">
                    هذا النموذج الافتراضي سيطبق تلقائياً على جميع المنتجات التي ليس لديها نماذج مخصصة. لا حاجة لتحديد منتجات معينة.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
            {!isDefault && (
              <TabsContent value="products" className="mt-4">
                <ProductsPanel
                  availableProducts={availableProducts}
                  selectedProducts={selectedProducts}
                  onToggleProduct={toggleProduct}
                  onSelectAll={selectAllProducts}
                  onUnselectAll={unselectAllProducts}
                />
              </TabsContent>
            )}
          </Tabs>
        </>
      )}
    </div>
  );

  return (
    <Layout>
      {pageContent}
    </Layout>
  );
} 