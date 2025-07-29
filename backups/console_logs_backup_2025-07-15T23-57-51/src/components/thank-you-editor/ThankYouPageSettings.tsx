import { useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { ThankYouTemplate } from "@/pages/dashboard/ThankYouPageEditor";

// مخطط للتحقق من البيانات
const settingsSchema = z.object({
  name: z.string().min(3, {
    message: "يجب أن يحتوي الاسم على 3 أحرف على الأقل",
  }),
  is_active: z.boolean(),
  is_default: z.boolean(),
  content: z.object({
    header: z.object({
      title: z.string().min(3, {
        message: "يجب أن يحتوي العنوان على 3 أحرف على الأقل",
      }),
      subtitle: z.string(),
    }),
    features: z.object({
      showOrderDetails: z.boolean(),
      showShippingDetails: z.boolean(),
      showContactSupport: z.boolean(),
      showRelatedProducts: z.boolean(),
      showSocialSharing: z.boolean(),
      showLoyaltyPoints: z.boolean(),
      showDiscount: z.boolean(),
    }),
    call_to_action: z.object({
      primary: z.object({
        text: z.string(),
        action: z.string(),
      }),
      secondary: z.object({
        text: z.string(),
        action: z.string(),
      }).optional(),
    }),
    footer_text: z.string(),
  }),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface ThankYouPageSettingsProps {
  template: ThankYouTemplate;
  onChange: (template: ThankYouTemplate) => void;
}

export default function ThankYouPageSettings({
  template,
  onChange,
}: ThankYouPageSettingsProps) {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // إعداد نموذج React Hook Form
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: template.name,
      is_active: template.is_active,
      is_default: template.is_default,
      content: {
        header: {
          title: template.content.header.title,
          subtitle: template.content.header.subtitle,
        },
        features: {
          showOrderDetails: template.content.features.showOrderDetails,
          showShippingDetails: template.content.features.showShippingDetails,
          showContactSupport: template.content.features.showContactSupport,
          showRelatedProducts: template.content.features.showRelatedProducts,
          showSocialSharing: template.content.features.showSocialSharing,
          showLoyaltyPoints: template.content.features.showLoyaltyPoints,
          showDiscount: template.content.features.showDiscount,
        },
        call_to_action: {
          primary: {
            text: template.content.call_to_action.primary.text,
            action: template.content.call_to_action.primary.action,
          },
          secondary: template.content.call_to_action.secondary,
        },
        footer_text: template.content.footer_text,
      },
    },
  });

  // متابعة التغييرات وتحديث القالب
  const handleFormChange = (field: string, value: any) => {
    const updatedTemplate = { ...template };
    
    // تحديث القيمة في الكائن بناءً على المسار
    const fieldParts = field.split('.');
    let target: any = updatedTemplate;
    
    for (let i = 0; i < fieldParts.length - 1; i++) {
      const part = fieldParts[i];
      
      if (!(part in target)) {
        target[part] = {};
      }
      
      target = target[part];
    }
    
    target[fieldParts[fieldParts.length - 1]] = value;
    onChange(updatedTemplate);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>الإعدادات الأساسية</CardTitle>
          <CardDescription>
            ضبط المعلومات الأساسية لصفحة الشكر
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم القالب</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="اسم القالب"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          handleFormChange("name", e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">تفعيل القالب</Label>
                  <p className="text-sm text-muted-foreground">
                    عند تفعيل القالب سيتم استخدامه في صفحات الشكر
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleFormChange("is_active", checked);
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_default">
                    تعيين كقالب افتراضي
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    سيتم استخدام هذا القالب لجميع المنتجات التي لم يتم تخصيص قالب لها
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="is_default"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleFormChange("is_default", checked);
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>محتوى الصفحة</CardTitle>
          <CardDescription>
            تخصيص المحتوى النصي الذي سيظهر على صفحة الشكر
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">ترويسة الصفحة</h3>
                
                <FormField
                  control={form.control}
                  name="content.header.title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>العنوان الرئيسي</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="شكرًا لطلبك!"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleFormChange("content.header.title", e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content.header.subtitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>العنوان الفرعي</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="تم استلام طلبك بنجاح وسنعمل على معالجته في أقرب وقت"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleFormChange("content.header.subtitle", e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">أزرار الإجراءات</h3>
                
                <FormField
                  control={form.control}
                  name="content.call_to_action.primary.text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نص الزر الرئيسي</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="العودة للتسوق"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleFormChange("content.call_to_action.primary.text", e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content.call_to_action.primary.action"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رابط الزر الرئيسي</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="/"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleFormChange("content.call_to_action.primary.action", e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content.call_to_action.secondary.text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نص الزر الثانوي</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="طباعة معلومات الطلب"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            field.onChange(e);
                            handleFormChange("content.call_to_action.secondary.text", e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content.call_to_action.secondary.action"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>إجراء الزر الثانوي</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="print"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            field.onChange(e);
                            handleFormChange("content.call_to_action.secondary.action", e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">تذييل الصفحة</h3>
                
                <FormField
                  control={form.control}
                  name="content.footer_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نص التذييل</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="إذا كان لديك أي استفسار، يمكنك التواصل معنا عبر الهاتف أو البريد الإلكتروني"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleFormChange("content.footer_text", e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الميزات المعروضة</CardTitle>
          <CardDescription>
            تحديد المعلومات والميزات التي ستظهر على صفحة الشكر
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label>تفاصيل الطلب</Label>
                    <p className="text-sm text-muted-foreground">
                      عرض تفاصيل الطلب (رقم الطلب، المبلغ، إلخ)
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="content.features.showOrderDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleFormChange("content.features.showOrderDetails", checked);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label>تفاصيل الشحن</Label>
                    <p className="text-sm text-muted-foreground">
                      عرض معلومات الشحن وطريقة التوصيل
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="content.features.showShippingDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleFormChange("content.features.showShippingDetails", checked);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label>معلومات الدعم</Label>
                    <p className="text-sm text-muted-foreground">
                      عرض معلومات التواصل مع خدمة العملاء
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="content.features.showContactSupport"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleFormChange("content.features.showContactSupport", checked);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label>منتجات مقترحة</Label>
                    <p className="text-sm text-muted-foreground">
                      عرض منتجات مشابهة أو ذات صلة
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="content.features.showRelatedProducts"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleFormChange("content.features.showRelatedProducts", checked);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label>مشاركة على السوشيال ميديا</Label>
                    <p className="text-sm text-muted-foreground">
                      إضافة أزرار لمشاركة المنتج على مواقع التواصل
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="content.features.showSocialSharing"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleFormChange("content.features.showSocialSharing", checked);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label>نقاط الولاء</Label>
                    <p className="text-sm text-muted-foreground">
                      عرض النقاط المكتسبة من عملية الشراء
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="content.features.showLoyaltyPoints"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleFormChange("content.features.showLoyaltyPoints", checked);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label>كوبون خصم للطلب القادم</Label>
                    <p className="text-sm text-muted-foreground">
                      عرض كوبون خصم يمكن استخدامه في الطلب القادم
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="content.features.showDiscount"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleFormChange("content.features.showDiscount", checked);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
