import React from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from "@/components/ui/textarea";
import { 
  Facebook, 
  Target, 
  BarChart2, 
  AlertTriangle, 
  Info, 
  Settings2, 
  Play,
  Link as LinkIcon,
  Server,
  Eye,
  TestTube2,
  Shield
} from 'lucide-react';

// Adjusted Google Icon - using a generic analytics or ads icon
const GoogleAdsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-area-chart">
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <BarChart2 className="h-4 w-4 text-primary" />
            </div>
            تتبع التحويلات المتقدم
            <Badge variant="outline" className="text-xs">Pixel + Conversion API</Badge>
          </CardTitle>
          <CardDescription>
            قم بإعداد تتبع دقيق للتحويلات يجمع بين البكسل والـ Conversion API لضمان دقة البيانات
          </CardDescription>
          
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              هذا النظام يدعم تتبع مزدوج (Pixel + Server-side) لضمان دقة عالية ومقاومة ad blockers
            </AlertDescription>
          </Alert>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            
            {/* وضع الاختبار العام */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <FormField
                control={control}
                name="marketingSettings.test_mode"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className="bg-yellow-100 p-2 rounded-full">
                          <TestTube2 className="w-4 h-4 text-yellow-600" />
                        </div>
                        <div>
                          <FormLabel className="font-medium text-yellow-900">وضع الاختبار</FormLabel>
                          <div className="text-xs text-yellow-700">
                            تفعيل وضع الاختبار لجميع منصات التتبع
                          </div>
                        </div>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Facebook Pixel & Conversion API Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50/50 border border-blue-200 rounded-lg">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Facebook className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">فيسبوك - تتبع مزدوج</h3>
                  <p className="text-sm text-blue-700">Pixel (العميل) + Conversion API (الخادم)</p>
                </div>
              </div>

              <FormField
                control={control}
                name="marketingSettings.enable_facebook_pixel"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <Eye className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <FormLabel className="font-medium">تفعيل فيسبوك بكسل</FormLabel>
                          <div className="text-xs text-muted-foreground">
                            تتبع من جانب العميل (Client-side)
                          </div>
                        </div>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              {watch('marketingSettings.enable_facebook_pixel') && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-muted-foreground" />
                    إعدادات فيسبوك بكسل
                  </h4>
                  
                  <div className="grid gap-4">
                    <FormField
                      control={control}
                      name="marketingSettings.facebook_pixel_id"
                      render={({ field }) => (
                        <FormItem>
                          <div className="space-y-2">
                            <FormLabel className="text-sm font-medium">معرف البيكسل *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="123456789012345" 
                                value={field.value || ''} 
                                onChange={field.onChange}
                                className="h-10"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              أدخل معرف فيسبوك بيكسل (15 رقم)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Conversion API Section */}
                    <div className="border border-green-200 rounded-lg p-4 bg-green-50/30">
                      <FormField
                        control={control}
                        name="marketingSettings.enable_facebook_conversion_api"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3 space-x-reverse">
                                <div className="bg-green-100 p-2 rounded-full">
                                  <Server className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                  <FormLabel className="font-medium text-green-900">تفعيل Conversion API</FormLabel>
                                  <div className="text-xs text-green-700">
                                    تتبع من جانب الخادم لضمان دقة أعلى
                                  </div>
                                </div>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </div>
                          </FormItem>
                        )}
                      />

                      {watch('marketingSettings.enable_facebook_conversion_api') && (
                        <div className="space-y-4">
                          <FormField
                            control={control}
                            name="marketingSettings.facebook_access_token"
                            render={({ field }) => (
                              <FormItem>
                                <div className="space-y-2">
                                  <FormLabel className="text-sm font-medium flex items-center gap-2">
                                    <Shield className="w-3 h-3" />
                                    رمز الوصول *
                                  </FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="EAABC..." 
                                      value={field.value || ''} 
                                      onChange={field.onChange}
                                      className="h-20 resize-none"
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs">
                                    رمز الوصول لـ Conversion API من Facebook Business
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={control}
                            name="marketingSettings.facebook_dataset_id"
                            render={({ field }) => (
                              <FormItem>
                                <div className="space-y-2">
                                  <FormLabel className="text-sm font-medium">معرف Dataset</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="1234567890123456" 
                                      value={field.value || ''} 
                                      onChange={field.onChange}
                                      className="h-10"
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs">
                                    معرف مجموعة البيانات (اختياري لتحسين المطابقة)
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={control}
                            name="marketingSettings.facebook_test_event_code"
                            render={({ field }) => (
                              <FormItem>
                                <div className="space-y-2">
                                  <FormLabel className="text-sm font-medium">كود اختبار الأحداث</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="TEST12345" 
                                      value={field.value || ''} 
                                      onChange={field.onChange}
                                      className="h-10"
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs">
                                    كود الاختبار لتتبع الأحداث في وضع التطوير
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Google Ads Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50/50 border border-green-200 rounded-lg">
                <div className="bg-green-100 p-2 rounded-full">
                  <GoogleAdsIcon />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900">جوجل Ads - تتبع التحويلات</h3>
                  <p className="text-sm text-green-700">Google Analytics + Enhanced Conversions</p>
                </div>
              </div>

              <FormField
                control={control}
                name="marketingSettings.enable_google_ads_tracking"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className="bg-green-100 p-2 rounded-full">
                          <Target className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <FormLabel className="font-medium">تفعيل تتبع جوجل Ads</FormLabel>
                          <div className="text-xs text-muted-foreground">
                            تمكين تتبع التحويلات لحملات جوجل Ads
                          </div>
                        </div>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              {watch('marketingSettings.enable_google_ads_tracking') && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-muted-foreground" />
                    إعدادات جوجل Ads
                  </h4>
                  
                  <div className="grid gap-4">
                    <FormField
                      control={control}
                      name="marketingSettings.google_gtag_id"
                      render={({ field }) => (
                        <FormItem>
                          <div className="space-y-2">
                            <FormLabel className="text-sm font-medium">Google Tag ID *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="G-XXXXXXXXXX or AW-XXXXXXXXXX" 
                                value={field.value || ''} 
                                onChange={field.onChange}
                                className="h-10"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              معرف Google Analytics 4 أو Google Ads
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name="marketingSettings.google_ads_conversion_id"
                      render={({ field }) => (
                        <FormItem>
                          <div className="space-y-2">
                            <FormLabel className="text-sm font-medium">معرف التحويل</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="AW-1234567890" 
                                value={field.value || ''} 
                                onChange={field.onChange}
                                className="h-10"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              أدخل معرف التحويل من جوجل Ads
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name="marketingSettings.google_ads_conversion_label"
                      render={({ field }) => (
                        <FormItem>
                          <div className="space-y-2">
                            <FormLabel className="text-sm font-medium">تسمية التحويل</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="purchase-conversion" 
                                value={field.value || ''} 
                                onChange={field.onChange}
                                className="h-10"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              تسمية التحويل المحددة في جوجل Ads
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* TikTok Pixel Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-pink-50/50 border border-pink-200 rounded-lg">
                <div className="bg-pink-100 p-2 rounded-full">
                  <Play className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-pink-900">تيك توك - تتبع التحويلات</h3>
                  <p className="text-sm text-pink-700">TikTok Pixel + Events API</p>
                </div>
              </div>

              <FormField
                control={control}
                name="marketingSettings.enable_tiktok_pixel"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className="bg-pink-100 p-2 rounded-full">
                          <Target className="w-4 h-4 text-pink-600" />
                        </div>
                        <div>
                          <FormLabel className="font-medium">تفعيل تيك توك بكسل</FormLabel>
                          <div className="text-xs text-muted-foreground">
                            تمكين تتبع التحويلات لتيك توك
                          </div>
                        </div>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              {watch('marketingSettings.enable_tiktok_pixel') && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-muted-foreground" />
                    إعدادات تيك توك بكسل
                  </h4>
                  
                  <div className="grid gap-4">
                    <FormField
                      control={control}
                      name="marketingSettings.tiktok_pixel_id"
                      render={({ field }) => (
                        <FormItem>
                          <div className="space-y-2">
                            <FormLabel className="text-sm font-medium">معرف تيك توك بكسل *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="C9A1B2C3D4E5F6G7H8I9J0" 
                                value={field.value || ''} 
                                onChange={field.onChange}
                                className="h-10"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              أدخل معرف تيك توك بكسل
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name="marketingSettings.tiktok_access_token"
                      render={({ field }) => (
                        <FormItem>
                          <div className="space-y-2">
                            <FormLabel className="text-sm font-medium">رمز الوصول للـ Events API</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="abc123..." 
                                value={field.value || ''} 
                                onChange={field.onChange}
                                className="h-20 resize-none"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              رمز وصول TikTok Events API (اختياري للتتبع المتقدم)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name="marketingSettings.tiktok_test_event_code"
                      render={({ field }) => (
                        <FormItem>
                          <div className="space-y-2">
                            <FormLabel className="text-sm font-medium">كود اختبار الأحداث</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="TEST12345" 
                                value={field.value || ''} 
                                onChange={field.onChange}
                                className="h-10"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              كود الاختبار لتتبع الأحداث في وضع التطوير
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* معلومات مهمة */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>ملاحظات مهمة:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• تأكد من إعداد الأحداث في لوحة تحكم كل منصة</li>
                  <li>• اختبر البكسلات باستخدام أدوات التطوير</li>
                  <li>• مراجعة سياسة الخصوصية لتتوافق مع GDPR</li>
                  <li>• في وضع الاختبار لن يتم إرسال بيانات حقيقية</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversionTrackingTab;
