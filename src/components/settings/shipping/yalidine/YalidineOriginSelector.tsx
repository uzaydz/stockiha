import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { YalidineProviderProps, YalidineWilaya } from './types';
import { supabase } from '@/lib/supabase';

export default function YalidineOriginSelector({
  isEnabled,
  apiToken,
  apiKey,
  originWilayaId,
  setOriginWilayaId,
  saveSettings,
  currentOrganizationId,
  toast
}: YalidineProviderProps) {
  const [wilayas, setWilayas] = useState<YalidineWilaya[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // تحميل الولايات من جدول البيانات العالمية والخاصة بالمؤسسة
  useEffect(() => {
    const fetchWilayas = async () => {
      setIsLoading(true);
      try {
        // محاولة جلب البيانات من كلا الجدولين ودمجها
        let allWilayas: YalidineWilaya[] = [];
        
        // 1. جلب بيانات ولايات المؤسسة أولاً
        const { data: organizationData, error: organizationError } = await supabase
          .from('yalidine_provinces')
          .select('id, name, zone, is_deliverable')
          .eq('organization_id', currentOrganizationId)
          .order('name');
        
        if (!organizationError && organizationData && organizationData.length > 0) {
          console.log(`تم العثور على ${organizationData.length} ولاية خاصة بالمؤسسة`);
          allWilayas = [...organizationData as YalidineWilaya[]];
        }
        
        // 2. جلب البيانات العالمية إذا لم تكن هناك بيانات خاصة أو لاستكمال البيانات
        if (allWilayas.length === 0) {
          console.log('استخدام البيانات العالمية للولايات');
          const { data: globalData, error: globalError } = await supabase
            .from('yalidine_provinces_global')
            .select('id, name, zone, is_deliverable')
            .order('name');
          
          if (globalError) {
            throw globalError;
          }
          
          if (globalData && globalData.length > 0) {
            console.log(`تم العثور على ${globalData.length} ولاية في البيانات العالمية`);
            allWilayas = [...globalData as YalidineWilaya[]];
          }
        }
        
        if (allWilayas.length === 0) {
          throw new Error('لم يتم العثور على أي بيانات للولايات');
        }
        
        // تنقية البيانات لإزالة التكرار (بناءً على id)
        const uniqueWilayas = Array.from(
          new Map(allWilayas.map(wilaya => [wilaya.id, wilaya])).values()
        );
        
        console.log(`تم تحميل ${uniqueWilayas.length} ولاية فريدة`);
        setWilayas(uniqueWilayas);
        
        // استرجاع ولاية المصدر من localStorage إذا لم تكن محددة
        if (!originWilayaId && setOriginWilayaId) {
          try {
            const syncOptions = JSON.parse(localStorage.getItem('yalidine_sync_options') || '{}');
            if (syncOptions.sourceProvinceId) {
              console.log(`استرجاع ولاية المصدر ${syncOptions.sourceProvinceId} من localStorage`);
              setOriginWilayaId(parseInt(syncOptions.sourceProvinceId));
            }
          } catch (e) {
            console.error('خطأ في قراءة خيارات المزامنة من localStorage:', e);
          }
        }
      } catch (error) {
        console.error('Error fetching wilayas:', error);
        toast({
          title: "خطأ في تحميل الولايات",
          description: "حدث خطأ أثناء تحميل قائمة الولايات. " + ((error as Error)?.message || 'حاول مرة أخرى لاحقًا.'),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchWilayas(); // تنفيذ دائمًا، حتى إذا لم يكن التكامل مُفعّلاً
  }, [currentOrganizationId, toast, originWilayaId, setOriginWilayaId]);

  // حفظ الولاية المختارة
  const handleSaveOrigin = async () => {
    if (!setOriginWilayaId || !originWilayaId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار ولاية المصدر أولاً",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    try {
      // حفظ معرف الولاية في إعدادات JSON
      await saveSettings({
        is_enabled: isEnabled,
        api_token: apiToken,
        api_key: apiKey,
        settings: {
          origin_wilaya_id: originWilayaId
        }
      });
      
      // حفظ اختيار الولاية أيضًا في localStorage للاستخدام في المزامنة
      try {
        const syncOptions = JSON.parse(localStorage.getItem('yalidine_sync_options') || '{}');
        syncOptions.sourceProvinceId = originWilayaId;
        localStorage.setItem('yalidine_sync_options', JSON.stringify(syncOptions));
        console.log(`تم حفظ ولاية المصدر ${originWilayaId} في localStorage`);
      } catch (e) {
        console.error('خطأ في حفظ خيارات المزامنة:', e);
      }
      
      toast({
        title: "تم الحفظ",
        description: "تم حفظ ولاية المصدر بنجاح",
        variant: "default",
      });
    } catch (error) {
      console.error('Error saving origin wilaya:', error);
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ ولاية المصدر: " + ((error as Error)?.message || 'خطأ غير معروف'),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ولاية المصدر</CardTitle>
        <CardDescription>
          اختر الولاية التي ستنطلق منها الشحنات
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="origin-wilaya">
              ولاية المصدر <span className="text-destructive">*</span>
            </Label>
            
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">جاري تحميل الولايات...</span>
              </div>
            ) : (
              <Select
                disabled={wilayas.length === 0}
                value={originWilayaId?.toString() || ''}
                onValueChange={(value) => {
                  if (setOriginWilayaId) {
                    const provinceId = parseInt(value);
                    console.log(`تم اختيار الولاية: ${provinceId}`);
                    setOriginWilayaId(provinceId);
                    
                    // حفظ مؤقت في localStorage
                    try {
                      const syncOptions = JSON.parse(localStorage.getItem('yalidine_sync_options') || '{}');
                      syncOptions.sourceProvinceId = provinceId;
                      localStorage.setItem('yalidine_sync_options', JSON.stringify(syncOptions));
                    } catch (e) {
                      console.error('خطأ في حفظ خيارات المزامنة:', e);
                    }
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر ولاية المصدر" />
                </SelectTrigger>
                <SelectContent>
                  {wilayas.map((wilaya) => (
                    <SelectItem key={wilaya.id} value={wilaya.id.toString()}>
                      {wilaya.name} (المنطقة {wilaya.zone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <p className="text-sm text-muted-foreground">
              الولاية التي سيتم شحن المنتجات منها. هذا سيؤثر على حساب تكاليف الشحن.
            </p>
          </div>
        </div>
        
        <Button 
          onClick={handleSaveOrigin} 
          disabled={!originWilayaId || isSaving}
          className="mt-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              جاري الحفظ...
            </>
          ) : 'حفظ ولاية المصدر'}
        </Button>
      </CardContent>
    </Card>
  );
} 