import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Star, 
  MessageSquare, 
  Shield, 
  CheckCircle, 
  Settings, 
  Users, 
  TrendingUp,
  AlertTriangle,
  Info
} from 'lucide-react';

interface ProductReviewsTabProps {
  form: UseFormReturn<ProductFormValues>;
  organizationId: string;
  productId?: string;
}

const ProductReviewsTab: React.FC<ProductReviewsTabProps> = ({ form, organizationId, productId }) => {
  const watchEnableReviews = form.watch('marketingSettings.enable_reviews');
  const watchEnableFakeStarRatings = form.watch('marketingSettings.enable_fake_star_ratings');
  const watchEnableFakePurchaseCounter = form.watch('marketingSettings.enable_fake_purchase_counter');

  return (
    <div className="space-y-6">
      {/* Main Reviews Settings */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <Star className="h-4 w-4 text-primary" />
            </div>
            إعدادات التقييمات والمراجعات
          </CardTitle>
          <CardDescription>
            التحكم في كيفية عمل التقييمات والمراجعات لهذا المنتج
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={form.control}
            name="marketingSettings.enable_reviews"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <FormLabel className="font-medium">تمكين التقييمات والمراجعات</FormLabel>
                      <div className="text-xs text-muted-foreground">
                        السماح للعملاء بترك تقييمات ومراجعات للمنتج
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

          {watchEnableReviews && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                إعدادات متقدمة للتقييمات
              </h4>
              
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="marketingSettings.reviews_verify_purchase"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-background">
                        <div className="flex items-center space-x-3 space-x-reverse">
                          <div className="bg-green-100 p-1.5 rounded-full">
                            <Shield className="w-3.5 h-3.5 text-green-600" />
                          </div>
                          <div>
                            <FormLabel className="text-sm font-medium">التحقق من الشراء</FormLabel>
                            <div className="text-xs text-muted-foreground">
                              عرض علامة "شراء موثوق" للمشترين الفعليين
                            </div>
                          </div>
                        </div>
                        <FormControl>
                          <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="marketingSettings.reviews_auto_approve"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-background">
                        <div className="flex items-center space-x-3 space-x-reverse">
                          <div className="bg-purple-100 p-1.5 rounded-full">
                            <CheckCircle className="w-3.5 h-3.5 text-purple-600" />
                          </div>
                          <div>
                            <FormLabel className="text-sm font-medium">الموافقة التلقائية</FormLabel>
                            <div className="text-xs text-muted-foreground">
                              الموافقة على التقييمات الجديدة ونشرها فوراً
                            </div>
                          </div>
                        </div>
                        <FormControl>
                          <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fake Reviews Settings */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="bg-amber-100 p-2 rounded-full">
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
            التقييمات الوهمية
            <Badge variant="outline" className="text-xs">متقدم</Badge>
          </CardTitle>
          <CardDescription>
            عرض تقييمات نجوم وهمية لزيادة الثقة (يُستخدم بحذر)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={form.control}
            name="marketingSettings.enable_fake_star_ratings"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="bg-yellow-100 p-2 rounded-full">
                      <Star className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div>
                      <FormLabel className="font-medium">تمكين تقييمات النجوم الوهمية</FormLabel>
                      <div className="text-xs text-muted-foreground">
                        عرض تقييمات نجوم تسويقية
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

          {watchEnableFakeStarRatings && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
              <FormField
                control={form.control}
                name="marketingSettings.fake_star_rating"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <Star className="w-3.5 h-3.5 text-yellow-500" />
                        تقييم النجوم
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="5"
                          step="0.1"
                          placeholder="4.5"
                          value={field.value || ''}
                          onChange={field.onChange}
                          className="h-10"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        من 1 إلى 5 نجوم
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="marketingSettings.fake_review_count"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        عدد التقييمات
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="150"
                          value={field.value || ''}
                          onChange={field.onChange}
                          className="h-10"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        عدد التقييمات المعروضة
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="marketingSettings.fake_review_text"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-green-500" />
                        نص التقييم
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ممتاز جداً"
                          value={field.value || ''}
                          onChange={field.onChange}
                          className="h-10"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        نص وصفي للتقييم
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          )}

          <Alert className="border-amber-200 bg-amber-50/50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-800">
              <div className="flex items-center gap-2">
                <div className="bg-amber-100 p-1.5 rounded-full">
                  <Info className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <span className="font-medium">
                  استخدم التقييمات الوهمية بحذر وفقاً لقوانين بلدك ومنصات التسويق
                </span>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Current Reviews Display */}
      {productId && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="bg-green-100 p-2 rounded-full">
                <MessageSquare className="h-4 w-4 text-green-600" />
              </div>
              التقييمات الحالية
            </CardTitle>
            <CardDescription>
              عرض وإدارة التقييمات التي تم تقديمها لهذا المنتج
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="bg-muted/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                سيتم عرض قائمة التقييمات هنا عند توفرها
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductReviewsTab;
