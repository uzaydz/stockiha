import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThankYouTemplate } from "@/pages/dashboard/ThankYouPageEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Copy } from "lucide-react";

interface ThankYouPageDesignEditorProps {
  template: ThankYouTemplate;
  onChange: (template: ThankYouTemplate) => void;
}

export default function ThankYouPageDesignEditor({
  template,
  onChange,
}: ThankYouPageDesignEditorProps) {
  const [activeTab, setActiveTab] = useState("layout");
  const [showColorPicker, setShowColorPicker] = useState(false);

  // التخطيطات المتوفرة
  const layouts = [
    {
      id: "standard",
      name: "قياسي",
      description: "تخطيط بسيط مع كافة المعلومات الأساسية",
      preview: "🖼️",
    },
    {
      id: "minimalist",
      name: "مينيمال",
      description: "تصميم بسيط وأنيق مع التركيز على رسالة الشكر",
      preview: "🖼️",
    },
    {
      id: "elegant",
      name: "أنيق",
      description: "تصميم فاخر مع تأثيرات بصرية وخطوط مميزة",
      preview: "🖼️",
    },
    {
      id: "colorful",
      name: "ملون",
      description: "تصميم نابض بالحياة مع ألوان متعددة وعناصر مرحة",
      preview: "🖼️",
    },
  ];

  // سكيمات الألوان
  const colorSchemes = [
    {
      id: "primary",
      name: "أساسي",
      description: "يستخدم ألوان الموقع الرئيسية",
      preview: "🎨",
    },
    {
      id: "success",
      name: "نجاح",
      description: "تدرجات اللون الأخضر للتأكيد على نجاح العملية",
      preview: "🎨",
    },
    {
      id: "info",
      name: "معلوماتي",
      description: "تدرجات اللون الأزرق لعرض المعلومات بشكل واضح",
      preview: "🎨",
    },
    {
      id: "custom",
      name: "مخصص",
      description: "تخصيص جميع الألوان يدويًا",
      preview: "🎨",
    },
  ];

  // تحديث التخطيط
  const handleLayoutChange = (layoutType: string) => {
    const updatedTemplate = {
      ...template,
      layout_type: layoutType as ThankYouTemplate["layout_type"],
    };
    onChange(updatedTemplate);
  };

  // تحديث سكيم الألوان
  const handleColorSchemeChange = (scheme: string) => {
    const updatedTemplate = {
      ...template,
      color_scheme: scheme as ThankYouTemplate["color_scheme"],
    };
    onChange(updatedTemplate);
  };

  // تحديث الألوان المخصصة
  const handleCustomColorChange = (colorType: string, value: string) => {
    const updatedTemplate = {
      ...template,
      custom_colors: {
        ...(template.custom_colors || {
          background: "#ffffff",
          accent: "#3b82f6",
          text: "#374151",
          border: "#e5e7eb",
        }),
        [colorType]: value,
      },
    };
    onChange(updatedTemplate);
  };

  return (
    <div className="space-y-6">
      <Tabs
        defaultValue="layout"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="mb-6 w-full justify-start">
          <TabsTrigger value="layout">نوع التخطيط</TabsTrigger>
          <TabsTrigger value="colors">الألوان</TabsTrigger>
          <TabsTrigger value="fonts">الخطوط</TabsTrigger>
          <TabsTrigger value="effects">التأثيرات</TabsTrigger>
        </TabsList>

        <TabsContent value="layout" className="space-y-6">
          <CardHeader className="px-0">
            <CardTitle>اختر نوع التخطيط</CardTitle>
            <CardDescription>
              حدد الشكل العام للصفحة ومكوناتها
            </CardDescription>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {layouts.map((layout) => (
              <Card
                key={layout.id}
                className={cn(
                  "cursor-pointer border-2 transition-all hover:shadow-md",
                  template.layout_type === layout.id
                    ? "border-primary"
                    : "border-muted"
                )}
                onClick={() => handleLayoutChange(layout.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-lg">{layout.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {layout.description}
                      </p>
                    </div>
                    <div className="text-5xl">{layout.preview}</div>
                  </div>

                  <div
                    className={cn(
                      "h-32 rounded-md border-2 flex items-center justify-center",
                      template.layout_type === layout.id
                        ? "border-primary bg-primary/5"
                        : "border-muted"
                    )}
                  >
                    {template.layout_type === layout.id ? (
                      <span className="text-sm font-medium text-primary">
                        التخطيط المحدد
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        اضغط للاختيار
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="colors" className="space-y-6">
          <CardHeader className="px-0">
            <CardTitle>تخصيص الألوان</CardTitle>
            <CardDescription>
              اختر مجموعة ألوان مناسبة لعلامتك التجارية
            </CardDescription>
          </CardHeader>

          <h3 className="text-lg font-medium mb-4">نظام الألوان</h3>

          <RadioGroup
            defaultValue={template.color_scheme}
            value={template.color_scheme}
            onValueChange={handleColorSchemeChange}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
          >
            {colorSchemes.map((scheme) => (
              <div key={scheme.id}>
                <RadioGroupItem
                  value={scheme.id}
                  id={`color-scheme-${scheme.id}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`color-scheme-${scheme.id}`}
                  className={cn(
                    "flex flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer",
                    template.color_scheme === scheme.id
                      ? "border-primary"
                      : "border-muted"
                  )}
                >
                  <div className="mb-4 text-4xl">{scheme.preview}</div>
                  <div className="space-y-1 text-center">
                    <p className="text-lg font-medium leading-none">
                      {scheme.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {scheme.description}
                    </p>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>

          {template.color_scheme === "custom" && (
            <Card>
              <CardHeader>
                <CardTitle>الألوان المخصصة</CardTitle>
                <CardDescription>
                  خصص كل لون من ألوان صفحة الشكر
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>لون الخلفية</Label>
                    <div className="flex">
                      <div
                        className="h-10 w-10 rounded-l-md"
                        style={{
                          backgroundColor:
                            template.custom_colors?.background || "#ffffff",
                        }}
                      ></div>
                      <Input
                        value={template.custom_colors?.background || "#ffffff"}
                        onChange={(e) =>
                          handleCustomColorChange("background", e.target.value)
                        }
                        className="rounded-l-none flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>لون التأكيد</Label>
                    <div className="flex">
                      <div
                        className="h-10 w-10 rounded-l-md"
                        style={{
                          backgroundColor:
                            template.custom_colors?.accent || "#3b82f6",
                        }}
                      ></div>
                      <Input
                        value={template.custom_colors?.accent || "#3b82f6"}
                        onChange={(e) =>
                          handleCustomColorChange("accent", e.target.value)
                        }
                        className="rounded-l-none flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>لون النص</Label>
                    <div className="flex">
                      <div
                        className="h-10 w-10 rounded-l-md"
                        style={{
                          backgroundColor:
                            template.custom_colors?.text || "#374151",
                        }}
                      ></div>
                      <Input
                        value={template.custom_colors?.text || "#374151"}
                        onChange={(e) =>
                          handleCustomColorChange("text", e.target.value)
                        }
                        className="rounded-l-none flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>لون الحدود</Label>
                    <div className="flex">
                      <div
                        className="h-10 w-10 rounded-l-md"
                        style={{
                          backgroundColor:
                            template.custom_colors?.border || "#e5e7eb",
                        }}
                      ></div>
                      <Input
                        value={template.custom_colors?.border || "#e5e7eb"}
                        onChange={(e) =>
                          handleCustomColorChange("border", e.target.value)
                        }
                        className="rounded-l-none flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-md bg-slate-50">
                  <h3 className="font-medium text-base mb-2">معاينة الألوان</h3>
                  <div
                    className="p-4 rounded-md"
                    style={{
                      backgroundColor:
                        template.custom_colors?.background || "#ffffff",
                      color: template.custom_colors?.text || "#374151",
                      borderColor: template.custom_colors?.border || "#e5e7eb",
                      borderWidth: "1px",
                    }}
                  >
                    <div className="mb-2">نص عادي للمعاينة</div>
                    <div
                      style={{
                        color: template.custom_colors?.accent || "#3b82f6",
                      }}
                    >
                      نص بلون التأكيد
                    </div>
                    <button
                      className="px-3 py-1 mt-2 rounded-md text-white"
                      style={{
                        backgroundColor:
                          template.custom_colors?.accent || "#3b82f6",
                      }}
                    >
                      زر للمعاينة
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="fonts" className="space-y-6">
          <CardHeader className="px-0">
            <CardTitle>تخصيص الخطوط</CardTitle>
            <CardDescription>
              اختر الخطوط المناسبة لعناصر صفحة الشكر
            </CardDescription>
          </CardHeader>

          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label>خط العناوين</Label>
                <Select defaultValue="cairo">
                  <SelectTrigger>
                    <SelectValue placeholder="اختر خط العناوين" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cairo">Cairo</SelectItem>
                    <SelectItem value="tajawal">Tajawal</SelectItem>
                    <SelectItem value="almarai">Almarai</SelectItem>
                    <SelectItem value="ibm-plex-sans-arabic">
                      IBM Plex Sans Arabic
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>خط النصوص</Label>
                <Select defaultValue="tajawal">
                  <SelectTrigger>
                    <SelectValue placeholder="اختر خط النصوص" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cairo">Cairo</SelectItem>
                    <SelectItem value="tajawal">Tajawal</SelectItem>
                    <SelectItem value="almarai">Almarai</SelectItem>
                    <SelectItem value="ibm-plex-sans-arabic">
                      IBM Plex Sans Arabic
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>حجم خط العناوين</Label>
                <Select defaultValue="3xl">
                  <SelectTrigger>
                    <SelectValue placeholder="اختر حجم خط العناوين" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xl">صغير (xl)</SelectItem>
                    <SelectItem value="2xl">متوسط (2xl)</SelectItem>
                    <SelectItem value="3xl">كبير (3xl)</SelectItem>
                    <SelectItem value="4xl">كبير جدًا (4xl)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>حجم خط النصوص</Label>
                <Select defaultValue="base">
                  <SelectTrigger>
                    <SelectValue placeholder="اختر حجم خط النصوص" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">صغير (sm)</SelectItem>
                    <SelectItem value="base">عادي (base)</SelectItem>
                    <SelectItem value="lg">كبير (lg)</SelectItem>
                    <SelectItem value="xl">كبير جدًا (xl)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="effects" className="space-y-6">
          <CardHeader className="px-0">
            <CardTitle>تأثيرات إضافية</CardTitle>
            <CardDescription>
              أضف تأثيرات وحركات لجعل صفحة الشكر أكثر تفاعلية
            </CardDescription>
          </CardHeader>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>تأثيرات الحركة</Label>
                  <p className="text-sm text-muted-foreground">
                    إضافة حركات انتقالية للعناصر عند تحميل الصفحة
                  </p>
                </div>
                <Select defaultValue="fade">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="اختر نوع التأثير" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون</SelectItem>
                    <SelectItem value="fade">تلاشي</SelectItem>
                    <SelectItem value="slide">انزلاق</SelectItem>
                    <SelectItem value="scale">تكبير/تصغير</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>تأثيرات ثلاثية الأبعاد</Label>
                  <p className="text-sm text-muted-foreground">
                    إضافة تأثيرات عمق وظلال لعناصر الصفحة
                  </p>
                </div>
                <Select defaultValue="medium">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="اختر مستوى العمق" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون</SelectItem>
                    <SelectItem value="light">خفيف</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="heavy">قوي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>تأثير الخلفية</Label>
                  <p className="text-sm text-muted-foreground">
                    تخصيص خلفية الصفحة بتأثيرات مختلفة
                  </p>
                </div>
                <Select defaultValue="gradient">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="اختر نوع الخلفية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">لون واحد</SelectItem>
                    <SelectItem value="gradient">تدرج لوني</SelectItem>
                    <SelectItem value="pattern">نمط</SelectItem>
                    <SelectItem value="image">صورة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>أيقونات متحركة</Label>
                  <p className="text-sm text-muted-foreground">
                    إضافة أيقونات متحركة تُعزز تجربة المستخدم
                  </p>
                </div>
                <Select defaultValue="simple">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="اختر نوع الأيقونات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون</SelectItem>
                    <SelectItem value="simple">بسيطة</SelectItem>
                    <SelectItem value="animated">متحركة</SelectItem>
                    <SelectItem value="interactive">تفاعلية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>تأثيرات الطباعة</CardTitle>
              <CardDescription>
                تخصيص نسخة الطباعة من صفحة التأكيد
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>تضمين شعار المتجر</Label>
                  <p className="text-sm text-muted-foreground">
                    عرض شعار المتجر في نسخة الطباعة
                  </p>
                </div>
                <Select defaultValue="colored">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="اختر نوع الشعار" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون</SelectItem>
                    <SelectItem value="colored">ملون</SelectItem>
                    <SelectItem value="monochrome">أحادي اللون</SelectItem>
                    <SelectItem value="watermark">علامة مائية</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>تضمين تفاصيل الاتصال</Label>
                  <p className="text-sm text-muted-foreground">
                    عرض معلومات التواصل في نسخة الطباعة
                  </p>
                </div>
                <Select defaultValue="full">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="اختر المعلومات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون</SelectItem>
                    <SelectItem value="minimal">الأساسية فقط</SelectItem>
                    <SelectItem value="full">كاملة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>عرض كود QR</Label>
                  <p className="text-sm text-muted-foreground">
                    عرض كود QR لتتبع الطلب في نسخة الطباعة
                  </p>
                </div>
                <Select defaultValue="order_tracking">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="اختر محتوى الكود" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون</SelectItem>
                    <SelectItem value="store_url">رابط المتجر</SelectItem>
                    <SelectItem value="order_tracking">تتبع الطلب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 