import React from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CalendarIcon, 
  Clock, 
  Edit3, 
  Settings, 
  AlertCircle, 
  Info, 
  ExternalLink,
  Timer,
  Zap,
  Calendar as CalendarIconLucide,
  Users,
  Target
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
// import { Textarea } from \"@/components/ui/textarea\"; // Consider if needed for longer texts

interface ProductOfferTimerTabProps {
  form: UseFormReturn<ProductFormValues>;
  organizationId: string; 
  productId?: string; 
}

const ProductOfferTimerTab: React.FC<ProductOfferTimerTabProps> = ({ form, organizationId, productId }) => {
  const { control, watch, setValue } = form;

  const offerTimerType = watch('marketingSettings.offer_timer_type');
  const offerTimerEnabled = watch('marketingSettings.offer_timer_enabled');

  return (
    <div className="space-y-6">
      {/* Main Timer Settings */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            مؤقت العروض
            <Badge variant="outline" className="text-xs">تسويق متقدم</Badge>
          </CardTitle>
          <CardDescription>
            قم بإنشاء وإدارة مؤقتات العروض الخاصة بالمنتج لزيادة الإلحاح وتحفيز المبيعات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={control}
            name="marketingSettings.offer_timer_enabled"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="bg-orange-100 p-2 rounded-full">
                      <Timer className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <FormLabel className="font-medium">تفعيل مؤقت العرض</FormLabel>
                      <div className="text-xs text-muted-foreground">
                        تشغيل مؤقت عد تنازلي لزيادة الإلحاح
                      </div>
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />

          {offerTimerEnabled && (
            <div className="space-y-6 border-t pt-6">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                إعدادات المؤقت
              </h4>

              <FormField
                control={control}
                name="marketingSettings.offer_timer_title"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                        عنوان المؤقت/العرض
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="مثال: عرض نهاية الأسبوع!" 
                          value={field.value || ''} 
                          onChange={field.onChange}
                          className="h-10"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        عنوان جذاب يظهر مع المؤقت (اختياري)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="marketingSettings.offer_timer_type"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-purple-500" />
                        نوع المؤقت
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="اختر نوع المؤقت" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="specific_date">
                            <div className="flex items-center gap-2">
                              <CalendarIconLucide className="w-4 h-4 text-blue-500" />
                              <span>عد تنازلي لتاريخ/وقت محدد</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="evergreen">
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-green-500" />
                              <span>دائم الخضرة (لكل زائر)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="fixed_duration_per_visitor">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-amber-500" />
                              <span>مدة ثابتة بعد أول زيارة للزائر</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        اختر كيف سيعمل المؤقت
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {offerTimerType === 'specific_date' && (
                <Card className="bg-blue-50/50 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-blue-600" />
                      إعدادات التاريخ المحدد
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={control}
                      name="marketingSettings.offer_timer_end_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-sm font-medium">تاريخ ووقت انتهاء العرض</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full justify-start text-left font-normal h-10",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(new Date(field.value), "PPP HH:mm") : <span>اختر تاريخ ووقت</span>}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    const currentTime = field.value ? new Date(field.value) : new Date();
                                    date.setHours(currentTime.getHours());
                                    date.setMinutes(currentTime.getMinutes());
                                    field.onChange(date.toISOString());
                                  }
                                }}
                                initialFocus
                              />
                              <div className="p-2 border-t">
                                <FormLabel className="text-sm">الوقت:</FormLabel>
                                <Input 
                                  type="time"
                                  defaultValue={field.value ? format(new Date(field.value), "HH:mm") : "00:00"}
                                  onChange={(e) => {
                                    const newDate = field.value ? new Date(field.value) : new Date();
                                    const [hours, minutes] = e.target.value.split(':');
                                    newDate.setHours(parseInt(hours, 10));
                                    newDate.setMinutes(parseInt(minutes, 10));
                                    setValue(`marketingSettings.offer_timer_end_date`, newDate.toISOString());
                                  }}
                                  className="mt-1 h-8"
                                />
                              </div>
                            </PopoverContent>
                          </Popover>
                          <FormDescription className="text-xs">
                            حدد التاريخ والوقت الذي سينتهي فيه العرض
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              {(offerTimerType === 'evergreen' || offerTimerType === 'fixed_duration_per_visitor') && (
                <Card className="bg-green-50/50 border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Timer className="w-4 h-4 text-green-600" />
                      إعدادات المدة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={control}
                      name="marketingSettings.offer_timer_duration_minutes"
                      render={({ field }) => (
                        <FormItem>
                          <div className="space-y-2">
                            <FormLabel className="text-sm font-medium">مدة المؤقت (بالدقائق)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="مثال: 60" 
                                value={field.value || ''} 
                                onChange={e => field.onChange(parseInt(e.target.value, 10) || null)}
                                className="h-10"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              كم دقيقة سيستمر المؤقت لكل زائر
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}
              
              <div className="grid gap-4">
                <FormField
                  control={control}
                  name="marketingSettings.offer_timer_text_above"
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2">
                        <FormLabel className="text-sm font-medium">النص فوق المؤقت</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="مثال: العرض ينتهي خلال:" 
                            value={field.value || ''} 
                            onChange={field.onChange}
                            className="h-10"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          نص يظهر أعلى المؤقت
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="marketingSettings.offer_timer_text_below"
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2">
                        <FormLabel className="text-sm font-medium">النص أسفل المؤقت</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="مثال: لا تفوت هذا العرض المحدود!" 
                            value={field.value || ''} 
                            onChange={field.onChange}
                            className="h-10"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          نص يظهر أسفل المؤقت
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <Alert className="border-orange-200 bg-orange-50/50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-sm text-orange-800">
                  <div className="flex items-center gap-2">
                    <div className="bg-orange-100 p-1.5 rounded-full">
                      <Info className="w-3.5 h-3.5 text-orange-600" />
                    </div>
                    <span className="font-medium">
                      تأكد من اختبار المؤقت قبل تفعيله للتأكد من عمله بشكل صحيح مع تصميم موقعك
                    </span>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductOfferTimerTab; 