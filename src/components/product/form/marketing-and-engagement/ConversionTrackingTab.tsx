import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from '@/components/ui/badge';
import { Textarea } from "@/components/ui/textarea";
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Facebook, 
  Target, 
  BarChart2, 
  Info, 
  Play,
  Server,
  Eye,
  TestTube2,
  Shield,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// أيقونة جوجل محسنة
const GoogleAdsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18"/>
    <path d="M7 12v5h12V8l-5 5-4-4Z"/>
  </svg>
);

interface ConversionTrackingTabProps {
  form: UseFormReturn<ProductFormValues>;
  organizationId: string;
  productId?: string;
}

const ConversionTrackingTab: React.FC<ConversionTrackingTabProps> = ({ form, organizationId, productId }) => {
  const { control, watch } = form;
  const [expandedSections, setExpandedSections] = useState<string[]>(['facebook']);
  const [forceUpdate, setForceUpdate] = useState(0);

  // مراقبة القيم مع إجبار إعادة الرسم
  const watchedValues = watch([
    'marketingSettings.test_mode',
    'marketingSettings.enable_facebook_pixel',
    'marketingSettings.enable_google_ads_tracking',
    'marketingSettings.enable_tiktok_pixel',
    'marketingSettings.enable_facebook_conversion_api'
  ]);

  const [isTestMode, facebookEnabled, googleEnabled, tiktokEnabled, facebookApiEnabled] = watchedValues;

  // إجبار إعادة الرسم عند تغيير أي قيمة
  useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [isTestMode, facebookEnabled, googleEnabled, tiktokEnabled, facebookApiEnabled]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  return (
    <div className="space-y-6" key={forceUpdate}>
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="bg-gradient-to-br from-primary/20 to-primary/10 p-3 rounded-xl">
            <BarChart2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">تتبع التحويلات المتقدم</h2>
            <p className="text-sm text-muted-foreground">تتبع دقيق عبر منصات متعددة</p>
          </div>
            </div>
        
        <div className="flex items-center justify-center gap-2">
          <Badge variant="outline" className="text-xs">Pixel + API</Badge>
          <Badge variant="outline" className="text-xs">Server-side</Badge>
          <Badge variant="outline" className="text-xs">Ad Blocker Resistant</Badge>
        </div>
      </div>

      {/* Test Mode Toggle */}
      <Card className="border-amber-200/60 bg-gradient-to-r from-amber-50/80 to-orange-50/60 dark:from-amber-950/40 dark:to-orange-950/30">
        <CardContent className="p-4">
              <FormField
                control={control}
                name="marketingSettings.test_mode"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-100 dark:bg-amber-900/60 p-2 rounded-lg">
                      <TestTube2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                      <FormLabel className="font-medium text-amber-900 dark:text-amber-100">
                        وضع الاختبار
                      </FormLabel>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        تفعيل وضع التطوير لجميع المنصات
                      </p>
                        </div>
                      </div>
                      <FormControl>
                    <Switch 
                      checked={field.value || false} 
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        // إجبار إعادة الرسم فوراً
                        setTimeout(() => setForceUpdate(prev => prev + 1), 0);
                      }}
                      className="data-[state=checked]:bg-amber-500"
                    />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
        </CardContent>
      </Card>

      {/* Platforms */}
            <div className="space-y-4">
        {/* Facebook */}
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
          <CardHeader 
            className="cursor-pointer p-4 hover:bg-muted/30 transition-colors"
            onClick={() => toggleSection('facebook')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/60 p-2.5 rounded-xl">
                  <Facebook className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">فيسبوك</CardTitle>
                  <p className="text-sm text-muted-foreground">Pixel + Conversion API</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {facebookEnabled && (
                  <Badge variant="secondary" className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    مفعل
                  </Badge>
                )}
                {expandedSections.includes('facebook') ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
          
          {expandedSections.includes('facebook') && (
            <CardContent className="p-4 pt-0 space-y-4">
              {/* Main Toggle */}
              <FormField
                control={control}
                name="marketingSettings.enable_facebook_pixel"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center gap-3">
                          <Eye className="w-4 h-4 text-blue-600" />
                        <div>
                          <FormLabel className="font-medium">تفعيل فيسبوك بكسل</FormLabel>
                          <p className="text-xs text-muted-foreground">تتبع من جانب العميل</p>
                        </div>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value || false} 
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            // إجبار إعادة الرسم فوراً
                            setTimeout(() => setForceUpdate(prev => prev + 1), 0);
                          }}
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              {facebookEnabled && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  {/* Pixel ID */}
                    <FormField
                      control={control}
                      name="marketingSettings.facebook_pixel_id"
                      render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-sm font-medium">معرف البيكسل</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="123456789012345" 
                                value={field.value || ''} 
                                onChange={field.onChange}
                            className="h-10 font-mono"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                          معرف فيسبوك بيكسل (15 رقم)
                            </FormDescription>
                        <FormMessage />
                        </FormItem>
                      )}
                    />

                  <Separator />

                  {/* Conversion API */}
                  <div className="space-y-4">
                      <FormField
                        control={control}
                        name="marketingSettings.enable_facebook_conversion_api"
                        render={({ field }) => (
                          <FormItem>
                          <div className="flex items-center justify-between p-3 bg-green-50/50 dark:bg-green-950/20 rounded-lg border border-green-200/50 dark:border-green-800/30">
                            <div className="flex items-center gap-3">
                              <Server className="w-4 h-4 text-green-600 dark:text-green-400" />
                                <div>
                                <FormLabel className="font-medium text-green-900 dark:text-green-100">
                                  Conversion API
                                </FormLabel>
                                <p className="text-xs text-green-700 dark:text-green-300">
                                  تتبع من جانب الخادم
                                </p>
                              </div>
                              </div>
                              <FormControl>
                              <Switch 
                                checked={field.value || false} 
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  // إجبار إعادة الرسم فوراً
                                  setTimeout(() => setForceUpdate(prev => prev + 1), 0);
                                }}
                                className="data-[state=checked]:bg-green-500"
                              />
                              </FormControl>
                            </div>
                          </FormItem>
                        )}
                      />

                    {facebookApiEnabled && (
                      <div className="space-y-4 pl-4 border-l-2 border-green-200 dark:border-green-800">
                          <FormField
                            control={control}
                            name="marketingSettings.facebook_access_token"
                            render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="text-sm font-medium flex items-center gap-2">
                                    <Shield className="w-3 h-3" />
                                رمز الوصول
                                  </FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="EAABC..." 
                                      value={field.value || ''} 
                                      onChange={field.onChange}
                                  className="h-16 resize-none font-mono text-xs"
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs">
                                رمز الوصول من Facebook Business
                                  </FormDescription>
                              <FormMessage />
                              </FormItem>
                            )}
                          />

                        {isTestMode && (
                          <FormField
                            control={control}
                            name="marketingSettings.facebook_test_event_code"
                            render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="text-sm font-medium">كود اختبار الأحداث</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="TEST12345" 
                                      value={field.value || ''} 
                                      onChange={field.onChange}
                                    className="h-10 font-mono"
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs">
                                  كود الاختبار لوضع التطوير
                                  </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        </div>
                      )}
                    </div>

                  {/* Help Link */}
                  <div className="flex items-center justify-center">
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      دليل إعداد فيسبوك بكسل
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Google Ads */}
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
          <CardHeader 
            className="cursor-pointer p-4 hover:bg-muted/30 transition-colors"
            onClick={() => toggleSection('google')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 dark:bg-green-900/60 p-2.5 rounded-xl">
                  <GoogleAdsIcon />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">جوجل Ads</CardTitle>
                  <p className="text-sm text-muted-foreground">Analytics + Enhanced Conversions</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {googleEnabled && (
                  <Badge variant="secondary" className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    مفعل
                  </Badge>
                )}
                {expandedSections.includes('google') ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
          
          {expandedSections.includes('google') && (
            <CardContent className="p-4 pt-0 space-y-4">
              {/* Main Toggle */}
              <FormField
                control={control}
                name="marketingSettings.enable_google_ads_tracking"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center gap-3">
                          <Target className="w-4 h-4 text-green-600" />
                        <div>
                          <FormLabel className="font-medium">تفعيل تتبع جوجل</FormLabel>
                          <p className="text-xs text-muted-foreground">تتبع التحويلات والتحليلات</p>
                        </div>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value || false} 
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            // إجبار إعادة الرسم فوراً
                            setTimeout(() => setForceUpdate(prev => prev + 1), 0);
                          }}
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              {googleEnabled && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="grid gap-4">
                    <FormField
                      control={control}
                      name="marketingSettings.google_gtag_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Google Tag ID</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="G-XXXXXXXXXX or AW-XXXXXXXXXX" 
                                value={field.value || ''} 
                                onChange={field.onChange}
                              className="h-10 font-mono"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              معرف Google Analytics 4 أو Google Ads
                            </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name="marketingSettings.google_ads_conversion_id"
                      render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium">معرف التحويل</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="AW-1234567890" 
                                value={field.value || ''} 
                                onChange={field.onChange}
                              className="h-10 font-mono"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                            معرف التحويل من جوجل Ads
                            </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex items-center justify-center">
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      دليل إعداد جوجل Ads
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* TikTok */}
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
          <CardHeader 
            className="cursor-pointer p-4 hover:bg-muted/30 transition-colors"
            onClick={() => toggleSection('tiktok')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-pink-100 dark:bg-pink-900/60 p-2.5 rounded-xl">
                  <Play className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">تيك توك</CardTitle>
                  <p className="text-sm text-muted-foreground">Pixel + Events API</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {tiktokEnabled && (
                  <Badge variant="secondary" className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    مفعل
                  </Badge>
                )}
                {expandedSections.includes('tiktok') ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
          
          {expandedSections.includes('tiktok') && (
            <CardContent className="p-4 pt-0 space-y-4">
              <FormField
                control={control}
                name="marketingSettings.enable_tiktok_pixel"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center gap-3">
                          <Target className="w-4 h-4 text-pink-600" />
                        <div>
                          <FormLabel className="font-medium">تفعيل تيك توك بكسل</FormLabel>
                          <p className="text-xs text-muted-foreground">تتبع التحويلات لتيك توك</p>
                        </div>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value || false} 
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            // إجبار إعادة الرسم فوراً
                            setTimeout(() => setForceUpdate(prev => prev + 1), 0);
                          }}
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              {tiktokEnabled && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <FormField
                      control={control}
                      name="marketingSettings.tiktok_pixel_id"
                      render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-sm font-medium">معرف تيك توك بكسل</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="C9A1B2C3D4E5F6G7H8I9J0" 
                                value={field.value || ''} 
                                onChange={field.onChange}
                            className="h-10 font-mono"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                          معرف بيكسل تيك توك
                            </FormDescription>
                        <FormMessage />
                        </FormItem>
                      )}
                    />

                  <div className="flex items-center justify-center">
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      دليل إعداد تيك توك بكسل
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
            </div>

      {/* Summary */}
      {(facebookEnabled || googleEnabled || tiktokEnabled) && (
        <Card className="bg-gradient-to-r from-green-50/50 to-emerald-50/30 dark:from-green-950/20 dark:to-emerald-950/10 border-green-200/50 dark:border-green-800/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900/60 p-2 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">
                  تم تفعيل {[facebookEnabled, googleEnabled, tiktokEnabled].filter(Boolean).length} منصة
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  {isTestMode ? 'وضع الاختبار مفعل' : 'وضع الإنتاج مفعل'}
                </p>
              </div>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
};

export default ConversionTrackingTab;
