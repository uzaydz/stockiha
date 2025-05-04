import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { getOrganizationSettings, updateOrganizationSettings } from '@/lib/api/settings';
import { Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/context/ThemeContext';

const GamePlatformSettings = () => {
  const { toast } = useToast();
  const { reloadOrganizationTheme } = useTheme();
  const { currentOrganization, isOrgAdmin } = useTenant();
  const { user } = useAuth();
  
  // Estados para las configuraciones específicas de la plataforma de juegos
  const [customJS, setCustomJS] = useState<string>('');
  const [customHeader, setCustomHeader] = useState<string>('');
  const [customFooter, setCustomFooter] = useState<string>('');
  const [enableRegistration, setEnableRegistration] = useState<boolean>(true);
  const [enablePublicSite, setEnablePublicSite] = useState<boolean>(true);
  
  // Estados de UI
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  
  // Cargar datos iniciales
  useEffect(() => {
    const loadSettings = async () => {
      if (!currentOrganization?.id) return;
      
      try {
        const settings = await getOrganizationSettings(currentOrganization.id);
        if (settings) {
          setCustomJS(settings.custom_js || '');
          setCustomHeader(settings.custom_header || '');
          setCustomFooter(settings.custom_footer || '');
          setEnableRegistration(settings.enable_registration !== false);
          setEnablePublicSite(settings.enable_public_site !== false);
        }
      } catch (error) {
        console.error('Error al cargar la configuración de la plataforma:', error);
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء تحميل إعدادات المنصة',
          variant: 'destructive',
        });
      }
    };
    
    loadSettings();
  }, [currentOrganization?.id, toast]);
  
  // Guardar configuraciones
  const saveSettings = async () => {
    if (!currentOrganization?.id || !isOrgAdmin) {
      toast({
        title: 'خطأ',
        description: 'ليس لديك صلاحية لتحديث إعدادات المنصة',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Actualizar configuración
      await updateOrganizationSettings(currentOrganization.id, {
        custom_js: customJS,
        custom_header: customHeader,
        custom_footer: customFooter,
        enable_registration: enableRegistration,
        enable_public_site: enablePublicSite
      });
      
      // Actualizar el tema si hubo cambios
      await reloadOrganizationTheme(currentOrganization.id);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ إعدادات المنصة بنجاح',
      });
    } catch (error) {
      console.error('Error al guardar la configuración:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حفظ إعدادات المنصة',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Si no hay organización o el usuario no es administrador
  if (!currentOrganization || !isOrgAdmin) {
    return (
      <div className="flex items-center justify-center h-40 text-center p-4 border rounded-md bg-muted">
        <p>ليس لديك صلاحية لعرض هذه الإعدادات</p>
      </div>
    );
  }
  
  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-right">إعدادات متقدمة للمنصة</h2>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-right">خيارات المنصة</CardTitle>
          <CardDescription className="text-right">
            تخصيص سلوك منصة الألعاب الخاصة بك
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* خيارات الوصول */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-right">خيارات الوصول</h3>
            
            {/* تفعيل التسجيل */}
            <div className="flex flex-row-reverse items-center justify-between">
              <Label htmlFor="enable-registration" className="text-right flex-1">
                تفعيل تسجيل المستخدمين الجدد
                <p className="text-sm text-muted-foreground mt-1">
                  السماح للمستخدمين الجدد بإنشاء حسابات في المنصة
                </p>
              </Label>
              <Switch
                id="enable-registration"
                checked={enableRegistration}
                onCheckedChange={setEnableRegistration}
              />
            </div>
            
            {/* تفعيل الموقع العام */}
            <div className="flex flex-row-reverse items-center justify-between">
              <Label htmlFor="enable-public-site" className="text-right flex-1">
                تفعيل الواجهة العامة للمنصة
                <p className="text-sm text-muted-foreground mt-1">
                  السماح للزوار بتصفح المنصة دون تسجيل الدخول
                </p>
              </Label>
              <Switch
                id="enable-public-site"
                checked={enablePublicSite}
                onCheckedChange={setEnablePublicSite}
              />
            </div>
          </div>
          
          {/* JavaScript مخصص */}
          <div className="space-y-2">
            <Label htmlFor="custom-js" className="text-right block">JavaScript مخصص</Label>
            <Textarea
              id="custom-js"
              value={customJS}
              onChange={(e) => setCustomJS(e.target.value)}
              rows={5}
              className="font-mono text-sm"
              dir="ltr"
              placeholder="// أضف كود JavaScript مخصص ليتم تنفيذه في كافة صفحات المنصة"
            />
            <p className="text-sm text-muted-foreground text-right">
              سيتم إضافة هذا الكود إلى جميع صفحات المنصة. استخدمه بحذر.
            </p>
          </div>
          
          {/* HTML مخصص للرأس */}
          <div className="space-y-2">
            <Label htmlFor="custom-header" className="text-right block">HTML مخصص لرأس الصفحة</Label>
            <Textarea
              id="custom-header"
              value={customHeader}
              onChange={(e) => setCustomHeader(e.target.value)}
              rows={3}
              className="font-mono text-sm"
              dir="ltr"
              placeholder="<!-- HTML إضافي لقسم <head> -->"
            />
            <p className="text-sm text-muted-foreground text-right">
              يتم إضافته إلى قسم head في كل صفحة. مفيد لإضافة تحليلات أو أكواد تتبع.
            </p>
          </div>
          
          {/* HTML مخصص للتذييل */}
          <div className="space-y-2">
            <Label htmlFor="custom-footer" className="text-right block">HTML مخصص لتذييل الصفحة</Label>
            <Textarea
              id="custom-footer"
              value={customFooter}
              onChange={(e) => setCustomFooter(e.target.value)}
              rows={3}
              className="font-mono text-sm"
              dir="ltr"
              placeholder="<!-- HTML إضافي لقسم تذييل الصفحة -->"
            />
            <p className="text-sm text-muted-foreground text-right">
              يتم إضافته إلى تذييل كل صفحة. مفيد للإشعارات أو معلومات الاتصال.
            </p>
          </div>
          
          {/* زر الحفظ */}
          <div className="flex justify-end mt-6">
            <Button
              onClick={saveSettings}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> جاري الحفظ...</>
              ) : saveSuccess ? (
                <><Check className="mr-2 h-4 w-4" /> تم الحفظ</>
              ) : (
                "حفظ إعدادات المنصة"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GamePlatformSettings; 