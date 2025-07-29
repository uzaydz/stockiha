import { useState, useEffect, useCallback } from 'react';
import { 
  getShippingProvidersWithClones, 
  getShippingCloneDetails,
  getShippingClonePrices,
  cloneShippingProvider,
  updateShippingCloneWithPrices,
  getProvinces,
  ShippingProviderWithClones,
  ShippingProviderClone,
  ShippingClonePrice,
  Province
} from '@/api/shippingCloneService';
import { toast } from '@/components/ui/use-toast';

export function useShippingCloneManager(organizationId: string) {
  // حالة البيانات
  const [providers, setProviders] = useState<ShippingProviderWithClones[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ShippingProviderWithClones | null>(null);
  const [selectedClone, setSelectedClone] = useState<ShippingProviderClone | null>(null);
  const [clonePrices, setClonePrices] = useState<ShippingClonePrice[]>([]);
  
  // حالة الحوارات
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // حالة النموذج
  const [editFormData, setEditFormData] = useState({
    name: '',
    is_active: true,
    is_home_delivery_enabled: true,
    is_desk_delivery_enabled: true,
    use_unified_price: false,
    unified_home_price: 0,
    unified_desk_price: 0,
    is_free_delivery_home: false,
    is_free_delivery_desk: false,
    api_token: '',
    api_key: '',
    sync_enabled: false
  });
  
  const [modifiedPrices, setModifiedPrices] = useState<{
    [key: number]: { 
      home_price?: number | null; 
      desk_price?: number | null; 
    }
  }>({});
  
  // حالة التحميل
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // تحميل البيانات الأولية
  useEffect(() => {
    loadProviders();
    loadProvinces();
  }, []);
  
  // تحميل مزودي التوصيل
  const loadProviders = async () => {
    setIsLoading(true);
    try {
      const data = await getShippingProvidersWithClones(organizationId);
      setProviders(data);
      
      // تحديد مزود التوصيل الافتراضي إذا كان هناك مزودين على الأقل
      if (data.length > 0 && !selectedProvider) {
        setSelectedProvider(data[0]);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل مزودي التوصيل'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // تحميل الولايات
  const loadProvinces = async () => {
    try {
      const data = await getProvinces();
      setProvinces(data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل الولايات'
      });
    }
  };
  
  // تحميل تفاصيل النسخة المستنسخة
  const loadCloneDetails = async (cloneId: number) => {
    setIsLoading(true);
    try {
      const clone = await getShippingCloneDetails(cloneId);
      if (clone) {
        setSelectedClone(clone);
        setEditFormData({
          name: clone.name,
          is_active: clone.is_active,
          is_home_delivery_enabled: clone.is_home_delivery_enabled,
          is_desk_delivery_enabled: clone.is_desk_delivery_enabled,
          use_unified_price: clone.use_unified_price,
          unified_home_price: clone.unified_home_price || 0,
          unified_desk_price: clone.unified_desk_price || 0,
          is_free_delivery_home: clone.is_free_delivery_home,
          is_free_delivery_desk: clone.is_free_delivery_desk,
          api_token: clone.api_token || '',
          api_key: clone.api_key || '',
          sync_enabled: clone.sync_enabled || false
        });
        
        // تحميل أسعار التوصيل
        const prices = await getShippingClonePrices(cloneId);
        setClonePrices(prices);
        // إعادة تعيين الأسعار المعدلة
        setModifiedPrices({});
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل تفاصيل النسخة'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // فتح حوار الاستنساخ
  const openCloneDialog = useCallback((provider: ShippingProviderWithClones) => {
    setSelectedProvider(provider);
    setIsCloneDialogOpen(true);
  }, []);

  // معالجة عملية الاستنساخ
  const handleClone = async (name: string, copyApiCredentials: boolean, enableSync: boolean) => {
    if (!selectedProvider) return;
    
    setIsLoading(true);
    try {
      const newCloneId = await cloneShippingProvider(
        organizationId,
        selectedProvider.id,
        name,
        copyApiCredentials,
        enableSync
      );
      
      if (newCloneId) {
        toast({
          title: 'نجاح',
          description: 'تم استنساخ مزود التوصيل بنجاح'
        });
        
        // إعادة تحميل البيانات
        await loadProviders();
        
        // إغلاق الحوار
        setIsCloneDialogOpen(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'فشل استنساخ مزود التوصيل'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'حدث خطأ أثناء استنساخ مزود التوصيل'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // فتح حوار التعديل
  const openEditDialog = useCallback((clone: ShippingProviderClone) => {
    loadCloneDetails(clone.id);
    setIsEditDialogOpen(true);
  }, []);
  
  // تعديل دالة applyUnifiedPrice
  const applyUnifiedPrice = useCallback(() => {
    const { 
      unified_home_price, 
      unified_desk_price, 
      is_free_delivery_home, 
      is_free_delivery_desk,
      is_home_delivery_enabled,
      is_desk_delivery_enabled
    } = editFormData;
    
    const newModifiedPrices: typeof modifiedPrices = {};
    clonePrices.forEach(price => {
      const updates: { home_price?: number | null; desk_price?: number | null } = {};
      
      // تطبيق أسعار المنزل فقط إذا كان التوصيل للمنزل مفعّل وليس مجانياً
      if (is_home_delivery_enabled && !is_free_delivery_home) {
        updates.home_price = unified_home_price;
      }
      
      // تطبيق أسعار المكتب فقط إذا كان التوصيل للمكتب مفعّل وليس مجانياً
      if (is_desk_delivery_enabled && !is_free_delivery_desk) {
        updates.desk_price = unified_desk_price;
      }
      
      // إضافة التحديثات فقط إذا كان هناك تحديثات
      if (Object.keys(updates).length > 0) {
        newModifiedPrices[price.province_id] = updates;
      }
    });
    
    setModifiedPrices(newModifiedPrices);
  }, [editFormData, clonePrices]);
  
  // تعديل دالة handleUpdateSettings
  const handleUpdateSettings = async () => {
    if (!selectedClone) return;
    
    setIsLoading(true);
    setProgress(0); // بدء مؤشر التقدم من 0
    
    try {
      // 1. تحضير قائمة بأسعار التوصيل للتحديث
      const allPriceUpdates = [];
      
      // تحديد إذا كانت هناك حاجة لتحديث عام للأسعار
      const needGlobalPriceUpdate = 
        editFormData.use_unified_price || 
        editFormData.is_free_delivery_home || 
        editFormData.is_free_delivery_desk || 
        !editFormData.is_home_delivery_enabled || 
        !editFormData.is_desk_delivery_enabled;
      
      // تحضير تحديثات الأسعار
      clonePrices.forEach(price => {
        const priceUpdate = {
          province_id: price.province_id,
          home_price: price.home_price,
          desk_price: price.desk_price
        };
        
        // تطبيق التعديلات المحلية
        if (modifiedPrices[price.province_id]) {
          if (modifiedPrices[price.province_id].home_price !== undefined) {
            priceUpdate.home_price = modifiedPrices[price.province_id].home_price;
          }
          if (modifiedPrices[price.province_id].desk_price !== undefined) {
            priceUpdate.desk_price = modifiedPrices[price.province_id].desk_price;
          }
        }
        
        // تطبيق الإعدادات العامة
        if (needGlobalPriceUpdate) {
          // توصيل للمنزل
          if (!editFormData.is_home_delivery_enabled) {
            priceUpdate.home_price = null;
          } else if (editFormData.is_free_delivery_home) {
            priceUpdate.home_price = 0;
          } else if (editFormData.use_unified_price) {
            priceUpdate.home_price = editFormData.unified_home_price;
          }
          
          // توصيل للمكتب
          if (!editFormData.is_desk_delivery_enabled) {
            priceUpdate.desk_price = null;
          } else if (editFormData.is_free_delivery_desk) {
            priceUpdate.desk_price = 0;
          } else if (editFormData.use_unified_price) {
            priceUpdate.desk_price = editFormData.unified_desk_price;
          }
        }
        
        allPriceUpdates.push(priceUpdate);
      });
      
      // تحديث المؤشر - 20%
      setProgress(20);
      
      // 2. استخدام الدالة الموحدة لتحديث الإعدادات والأسعار في عملية واحدة
      const result = await updateShippingCloneWithPrices(
        selectedClone.id,
        editFormData,
        allPriceUpdates
      );
      
      setProgress(80);
      
      if (result) {
        toast({
          title: 'نجاح',
          description: 'تم تحديث إعدادات مزود التوصيل بنجاح'
        });
        
        // 3. تحديث حالة المكون
        setProgress(90);
        
        // إعادة تحميل البيانات
        await loadProviders();
        
        // إعادة تعيين الأسعار المعدلة
        setModifiedPrices({});
        
        // إغلاق الحوار
        setIsEditDialogOpen(false);
        
        setProgress(100);
      } else {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'فشل تحديث إعدادات مزود التوصيل'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث إعدادات مزود التوصيل'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // تعديل سعر التوصيل
  const handlePriceChange = useCallback((provinceId: number, type: 'home' | 'desk', value: string) => {
    const numValue = value === '' ? null : parseInt(value);
    
    setModifiedPrices(prev => ({
      ...prev,
      [provinceId]: {
        ...prev[provinceId],
        [type === 'home' ? 'home_price' : 'desk_price']: numValue
      }
    }));
  }, []);

  return {
    // البيانات والحالة
    providers,
    provinces,
    selectedProvider,
    selectedClone,
    clonePrices,
    isCloneDialogOpen,
    isEditDialogOpen,
    editFormData,
    modifiedPrices,
    isLoading,
    progress,
    
    // الوظائف
    setSelectedProvider,
    setSelectedClone,
    setIsCloneDialogOpen,
    setIsEditDialogOpen,
    setEditFormData,
    loadCloneDetails,
    openCloneDialog,
    openEditDialog,
    handleClone,
    handleUpdateSettings,
    handlePriceChange,
    applyUnifiedPrice,
  };
}

export default useShippingCloneManager;
