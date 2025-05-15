import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/context/ThemeContext';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { 
  getUserSettings, 
  getOrganizationSettings, 
  updateUserSettings, 
  updateOrganizationSettings 
} from '@/lib/api/settings';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Check, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

const AppearanceSettings = () => {
  const { toast } = useToast();
  const { theme, setTheme, reloadOrganizationTheme } = useTheme();
  const { currentOrganization, isOrgAdmin } = useTenant();
  const { user } = useAuth();
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [userSettings, setUserSettings] = useState<any>(null);
  const [orgSettings, setOrgSettings] = useState<any>(null);
  
  // إعدادات المظهر المؤقتة
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(theme || 'system');
  const [primaryColor, setPrimaryColor] = useState('#0099ff');
  const [enableCustomCSS, setEnableCustomCSS] = useState(false);
  const [customCSS, setCustomCSS] = useState('');
  const [userThemeMode, setUserThemeMode] = useState<'light' | 'dark' | 'system'>(theme as any || 'system');
  const [selectedDateFormat, setSelectedDateFormat] = useState('');
  const [saveSuccessUser, setSaveSuccessUser] = useState(false);
  const [saveSuccessOrg, setSaveSuccessOrg] = useState(false);

  // جلب الإعدادات عند تحميل المكون
  useEffect(() => {
    const fetchSettings = async () => {
      // جلب إعدادات المستخدم
      if (user?.id) {
        try {
          const userSettingsData = await getUserSettings(user.id);
          setUserSettings(userSettingsData);
          setThemeMode(userSettingsData.theme_mode || 'system');
        } catch (error) {
          console.error('Error fetching user settings:', error);
        }
      }

      // جلب إعدادات المؤسسة
      if (currentOrganization?.id) {
        try {
          
          const orgSettingsData = await getOrganizationSettings(currentOrganization.id);
          
          // Verificamos que las configuraciones pertenecen a la organización actual
          if (orgSettingsData && orgSettingsData.organization_id === currentOrganization.id) {
            setOrgSettings(orgSettingsData);
            
            if (orgSettingsData?.theme_primary_color) {
              setPrimaryColor(orgSettingsData.theme_primary_color);
            }
            
            if (orgSettingsData?.custom_css) {
              setCustomCSS(orgSettingsData.custom_css);
              setEnableCustomCSS(true);
            }
          } else {
            
            // Si no hay configuraciones para esta organización, o son de otra organización,
            // utilizamos valores por defecto
            setPrimaryColor('#0099ff');
            setCustomCSS('');
            setEnableCustomCSS(false);
          }
        } catch (error) {
          console.error('Error fetching organization settings:', error);
        }
      }
    };

    fetchSettings();
  }, [user?.id, currentOrganization?.id]);

  // حفظ إعدادات المستخدم
  const saveUserSettings = async () => {
    if (!user?.id) return;
    
    setIsSavingUser(true);
    try {
      await updateUserSettings(user.id, {
        theme_mode: themeMode,
        date_format: 'DD/MM/YYYY',
      });
      
      setIsSavingUser(false);
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ إعدادات المظهر الشخصية بنجاح',
      });
      
      // Aplicar el nuevo tema inmediatamente
      setTheme(themeMode as 'light' | 'dark' | 'system');
      setSaveSuccessUser(true);
      setTimeout(() => {
        setSaveSuccessUser(false);
      }, 2000);
    } catch (error) {
      console.error('Error saving user settings:', error);
      setIsSavingUser(false);
      toast({
        title: 'خطأ',
        description: 'فشل في حفظ إعدادات المظهر الشخصية',
        variant: 'destructive',
      });
    }
  };

  // حفظ إعدادات المؤسسة
  const saveOrganizationSettings = async () => {
    if (!currentOrganization?.id || !isOrgAdmin) return;
    
    setIsSavingOrg(true);
    try {
      await updateOrganizationSettings(currentOrganization.id, {
        theme_primary_color: primaryColor,
        theme_mode_org: 'light', // نستخدم قيمة افتراضية للمؤسسة
        custom_css: enableCustomCSS ? customCSS : null,
      });
      
      // Reload theme with the specific organization ID
      await reloadOrganizationTheme(currentOrganization.id);
      
      setIsSavingOrg(false);
      setSaveSuccessOrg(true);
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ إعدادات مظهر المؤسسة بنجاح',
      });
      setTimeout(() => {
        setSaveSuccessOrg(false);
      }, 2000);
    } catch (error) {
      console.error('Error saving organization settings:', error);
      setIsSavingOrg(false);
      toast({
        title: 'خطأ',
        description: 'فشل في حفظ إعدادات المؤسسة',
        variant: 'destructive',
      });
    }
  };

  // عرض رسالة عدم وجود مستخدم
  if (!user?.id) {
    return (
      <div className="flex items-center justify-center h-40 text-center p-4 border rounded-md bg-muted">
        <p>يجب تسجيل الدخول لعرض وتعديل إعدادات المظهر</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-right">إعدادات المظهر</h2>

      {/* اعدادات المظهر الشخصية */}
      <div className="mb-8 p-6 bg-card rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4 text-right">إعدادات المظهر الشخصية</h3>
        
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="theme-mode" className="text-right">وضع المظهر</Label>
            <Select
              value={themeMode}
              onValueChange={(value) => setThemeMode(value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">فاتح</SelectItem>
                <SelectItem value="dark">داكن</SelectItem>
                <SelectItem value="system">تلقائي (حسب إعدادات النظام)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button
            onClick={saveUserSettings} 
            disabled={isSavingUser}
            className="mt-4 w-full sm:w-auto"
          >
            {isSavingUser ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> جاري الحفظ...</>
            ) : saveSuccessUser ? (
              <><Check className="mr-2 h-4 w-4" /> تم الحفظ</>
            ) : (
              "حفظ إعدادات المظهر الشخصية"
            )}
          </Button>
        </div>
      </div>

      {/* اعدادات مظهر المؤسسة */}
      {isOrgAdmin && (
        <div className="p-6 bg-card rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-right">إعدادات مظهر المؤسسة</h3>
          
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="primary-color" className="text-right">اللون الرئيسي</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-24 p-1"
                />
                <Input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mt-4">
              <Checkbox
                id="enable-custom-css"
                checked={enableCustomCSS}
                onCheckedChange={(checked) => setEnableCustomCSS(!!checked)}
              />
              <Label htmlFor="enable-custom-css" className="mr-2">تمكين CSS مخصص</Label>
            </div>
            
            {enableCustomCSS && (
              <div className="flex flex-col space-y-2">
                <Label htmlFor="custom-css" className="text-right">CSS مخصص</Label>
                <Textarea
                  id="custom-css"
                  value={customCSS}
                  onChange={(e) => setCustomCSS(e.target.value)}
                  className="min-h-32 font-mono text-sm"
                  placeholder=":root { --custom-color: #ff0000; }"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">
                  يمكنك إضافة CSS مخصص لتخصيص مظهر التطبيق. سيتم تطبيق هذا على جميع المستخدمين في المؤسسة.
                </p>
              </div>
            )}
            
            <Button
              onClick={saveOrganizationSettings}
              disabled={isSavingOrg}
              className="mt-4 w-full sm:w-auto"
            >
              {isSavingOrg ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> جاري الحفظ...</>
              ) : saveSuccessOrg ? (
                <><Check className="mr-2 h-4 w-4" /> تم الحفظ</>
              ) : (
                "حفظ إعدادات مظهر المؤسسة"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppearanceSettings; 