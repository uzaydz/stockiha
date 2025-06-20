import React, { useState, useEffect } from 'react';
import { Save, Upload, Globe, Phone, Mail, MapPin, Facebook, Instagram, Twitter, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface GameDownloadsSettings {
  id?: string;
  organization_id: string;
  business_name?: string;
  business_logo?: string;
  welcome_message?: string;
  terms_conditions?: string;
  contact_info?: {
    phone?: string;
    whatsapp?: string;
    email?: string;
    address?: string;
  };
  social_links?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  order_prefix?: string;
  auto_assign_orders?: boolean;
  notification_settings?: {
    email_enabled?: boolean;
    sms_enabled?: boolean;
    whatsapp_enabled?: boolean;
  };
  working_hours?: {
    [key: string]: {
      open: string;
      close: string;
      is_closed: boolean;
    };
  };
  is_active?: boolean;
}

const defaultWorkingHours = {
  sunday: { open: '09:00', close: '22:00', is_closed: false },
  monday: { open: '09:00', close: '22:00', is_closed: false },
  tuesday: { open: '09:00', close: '22:00', is_closed: false },
  wednesday: { open: '09:00', close: '22:00', is_closed: false },
  thursday: { open: '09:00', close: '22:00', is_closed: false },
  friday: { open: '09:00', close: '22:00', is_closed: false },
  saturday: { open: '09:00', close: '22:00', is_closed: false },
};

const dayNames = {
  sunday: 'الأحد',
  monday: 'الإثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
  saturday: 'السبت',
};

export default function GameDownloadsSettings() {
  const { organizationId } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<GameDownloadsSettings>({
    organization_id: organizationId || '',
    order_prefix: 'GD',
    auto_assign_orders: false,
    is_active: true,
    contact_info: {},
    social_links: {},
    notification_settings: {
      email_enabled: true,
      sms_enabled: false,
      whatsapp_enabled: true,
    },
    working_hours: defaultWorkingHours,
  });

  useEffect(() => {
    if (organizationId) {
      fetchSettings();
    }
  }, [organizationId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('game_downloads_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          ...settings,
          ...data,
          working_hours: data.working_hours || defaultWorkingHours,
        });
      }
    } catch (error: any) {
      toast.error('فشل في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const dataToSave = {
        ...settings,
        organization_id: organizationId,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('game_downloads_settings')
        .upsert(dataToSave, {
          onConflict: 'organization_id',
        });

      if (error) throw error;

      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error: any) {
      toast.error('فشل في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${organizationId}/game-downloads-logo.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('business-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('business-assets')
        .getPublicUrl(fileName);

      setSettings(prev => ({
        ...prev,
        business_logo: publicUrl,
      }));

      toast.success('تم رفع الشعار بنجاح');
    } catch (error: any) {
      toast.error('فشل في رفع الشعار');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">إعدادات تطبيق تحميل الألعاب</h2>
          <p className="text-muted-foreground">قم بتخصيص إعدادات متجر تحميل الألعاب الخاص بك</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="ml-2 h-4 w-4" />
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">الإعدادات العامة</TabsTrigger>
          <TabsTrigger value="contact">معلومات الاتصال</TabsTrigger>
          <TabsTrigger value="hours">ساعات العمل</TabsTrigger>
          <TabsTrigger value="notifications">الإشعارات</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>معلومات المتجر</CardTitle>
              <CardDescription>المعلومات الأساسية التي ستظهر للعملاء</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">اسم المتجر</Label>
                <Input
                  id="business_name"
                  value={settings.business_name || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, business_name: e.target.value }))}
                  placeholder="متجر الألعاب المتميز"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">شعار المتجر</Label>
                <div className="flex items-center gap-4">
                  {settings.business_logo && (
                    <img
                      src={settings.business_logo}
                      alt="Business Logo"
                      className="h-20 w-20 object-contain rounded-lg border"
                    />
                  )}
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="max-w-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcome_message">رسالة الترحيب</Label>
                <Textarea
                  id="welcome_message"
                  value={settings.welcome_message || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, welcome_message: e.target.value }))}
                  placeholder="مرحباً بك في متجرنا لتحميل الألعاب..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="order_prefix">بادئة رقم الطلب</Label>
                <Input
                  id="order_prefix"
                  value={settings.order_prefix || 'GD'}
                  onChange={(e) => setSettings(prev => ({ ...prev, order_prefix: e.target.value }))}
                  placeholder="GD"
                  className="max-w-xs"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto_assign"
                  checked={settings.auto_assign_orders || false}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_assign_orders: checked }))}
                />
                <Label htmlFor="auto_assign" className="cursor-pointer">
                  توزيع الطلبات تلقائياً على الموظفين
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={settings.is_active !== false}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  تفعيل المتجر
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الشروط والأحكام</CardTitle>
              <CardDescription>الشروط والأحكام التي ستظهر للعملاء</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={settings.terms_conditions || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, terms_conditions: e.target.value }))}
                placeholder="أدخل الشروط والأحكام هنا..."
                rows={6}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>معلومات الاتصال</CardTitle>
              <CardDescription>كيف يمكن للعملاء التواصل معك</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={settings.contact_info?.phone || ''}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        contact_info: { ...prev.contact_info, phone: e.target.value }
                      }))}
                      placeholder="0550123456"
                      className="pr-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">واتساب</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="whatsapp"
                      value={settings.contact_info?.whatsapp || ''}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        contact_info: { ...prev.contact_info, whatsapp: e.target.value }
                      }))}
                      placeholder="0550123456"
                      className="pr-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={settings.contact_info?.email || ''}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        contact_info: { ...prev.contact_info, email: e.target.value }
                      }))}
                      placeholder="info@example.com"
                      className="pr-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">العنوان</Label>
                  <div className="relative">
                    <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="address"
                      value={settings.contact_info?.address || ''}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        contact_info: { ...prev.contact_info, address: e.target.value }
                      }))}
                      placeholder="الرياض، شارع الملك فهد"
                      className="pr-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>روابط التواصل الاجتماعي</CardTitle>
              <CardDescription>حساباتك على مواقع التواصل الاجتماعي</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook">فيسبوك</Label>
                  <div className="relative">
                    <Facebook className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="facebook"
                      value={settings.social_links?.facebook || ''}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        social_links: { ...prev.social_links, facebook: e.target.value }
                      }))}
                      placeholder="https://facebook.com/yourpage"
                      className="pr-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">إنستغرام</Label>
                  <div className="relative">
                    <Instagram className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="instagram"
                      value={settings.social_links?.instagram || ''}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        social_links: { ...prev.social_links, instagram: e.target.value }
                      }))}
                      placeholder="https://instagram.com/yourpage"
                      className="pr-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter">تويتر</Label>
                  <div className="relative">
                    <Twitter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="twitter"
                      value={settings.social_links?.twitter || ''}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        social_links: { ...prev.social_links, twitter: e.target.value }
                      }))}
                      placeholder="https://twitter.com/yourpage"
                      className="pr-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ساعات العمل</CardTitle>
              <CardDescription>حدد ساعات عمل المتجر خلال الأسبوع</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(settings.working_hours || defaultWorkingHours).map(([day, hours]) => (
                <div key={day} className="flex items-center gap-4">
                  <div className="w-24 font-medium">{dayNames[day as keyof typeof dayNames]}</div>
                  
                  <Switch
                    checked={!hours.is_closed}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      working_hours: {
                        ...prev.working_hours,
                        [day]: { ...hours, is_closed: !checked }
                      }
                    }))}
                  />
                  
                  {!hours.is_closed && (
                    <>
                      <Input
                        type="time"
                        value={hours.open}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          working_hours: {
                            ...prev.working_hours,
                            [day]: { ...hours, open: e.target.value }
                          }
                        }))}
                        className="w-32"
                      />
                      <span>إلى</span>
                      <Input
                        type="time"
                        value={hours.close}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          working_hours: {
                            ...prev.working_hours,
                            [day]: { ...hours, close: e.target.value }
                          }
                        }))}
                        className="w-32"
                      />
                    </>
                  )}
                  
                  {hours.is_closed && (
                    <span className="text-muted-foreground">مغلق</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الإشعارات</CardTitle>
              <CardDescription>حدد كيفية إرسال الإشعارات للعملاء</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>إشعارات البريد الإلكتروني</Label>
                    <p className="text-sm text-muted-foreground">إرسال إشعارات عبر البريد الإلكتروني</p>
                  </div>
                  <Switch
                    checked={settings.notification_settings?.email_enabled || false}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      notification_settings: {
                        ...prev.notification_settings,
                        email_enabled: checked
                      }
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>إشعارات الرسائل النصية</Label>
                    <p className="text-sm text-muted-foreground">إرسال إشعارات عبر الرسائل النصية</p>
                  </div>
                  <Switch
                    checked={settings.notification_settings?.sms_enabled || false}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      notification_settings: {
                        ...prev.notification_settings,
                        sms_enabled: checked
                      }
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>إشعارات واتساب</Label>
                    <p className="text-sm text-muted-foreground">إرسال إشعارات عبر واتساب</p>
                  </div>
                  <Switch
                    checked={settings.notification_settings?.whatsapp_enabled || false}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      notification_settings: {
                        ...prev.notification_settings,
                        whatsapp_enabled: checked
                      }
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
