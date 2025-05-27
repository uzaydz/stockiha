import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface PlanFeature {
  title: string;
  available: boolean;
}

interface PricingPlan {
  name: string;
  price: {
    monthly: number;
    yearly: number;
  };
  description: string;
  features: PlanFeature[];
  buttonText: string;
  popular?: boolean;
  highlight?: boolean;
}

const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const plans: PricingPlan[] = [
    {
      name: "أساسي",
      price: {
        monthly: 29,
        yearly: 290,
      },
      description: "للشركات الصغيرة التي بدأت للتو",
      features: [
        { title: "متجر واحد", available: true },
        { title: "حتى 1,000 منتج", available: true },
        { title: "مستخدمان", available: true },
        { title: "إدارة المخزون الأساسية", available: true },
        { title: "التقارير الأساسية", available: true },
        { title: "دعم بالبريد الإلكتروني", available: true },
        { title: "تكامل أنظمة الدفع", available: false },
        { title: "إدارة متعددة للمتاجر", available: false },
        { title: "تقارير متقدمة", available: false },
      ],
      buttonText: "ابدأ مجانًا",
    },
    {
      name: "احترافي",
      price: {
        monthly: 99,
        yearly: 990,
      },
      description: "للأعمال النامية التي تتطلع إلى التوسع",
      features: [
        { title: "حتى 3 متاجر", available: true },
        { title: "حتى 10,000 منتج", available: true },
        { title: "10 مستخدمين", available: true },
        { title: "إدارة المخزون المتقدمة", available: true },
        { title: "التقارير المتقدمة", available: true },
        { title: "دعم على مدار الساعة", available: true },
        { title: "تكامل أنظمة الدفع", available: true },
        { title: "نظام ولاء العملاء", available: true },
        { title: "تحليلات التسويق", available: false },
      ],
      buttonText: "بدء الاشتراك",
      popular: true,
      highlight: true,
    },
    {
      name: "مؤسسة",
      price: {
        monthly: 299,
        yearly: 2990,
      },
      description: "للشركات الكبيرة والمؤسسات",
      features: [
        { title: "عدد غير محدود من المتاجر", available: true },
        { title: "عدد غير محدود من المنتجات", available: true },
        { title: "مستخدمون غير محدودين", available: true },
        { title: "حلول مخصصة", available: true },
        { title: "تقارير متقدمة", available: true },
        { title: "دعم مخصص على مدار الساعة", available: true },
        { title: "تكامل API مخصص", available: true },
        { title: "تحليلات متقدمة للبيانات", available: true },
        { title: "مدير حساب مخصص", available: true },
      ],
      buttonText: "تواصل معنا",
    },
  ];

  const toggleBillingCycle = () => {
    setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly");
  };

  const calculateDiscount = (monthly: number, yearly: number) => {
    const monthlyTotal = monthly * 12;
    const discount = ((monthlyTotal - yearly) / monthlyTotal) * 100;
    return Math.round(discount);
  };

  return (
    <section id="الاسعار" className="py-20">
      <div className="container px-4 mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="mb-4">الأسعار والباقات</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">اختر الخطة المناسبة لاحتياجات عملك</h2>
          <p className="text-lg text-muted-foreground mb-8">
            باقات متنوعة تناسب جميع أحجام الأعمال، مع فترة تجريبية مجانية لمدة 14 يومًا
          </p>

          <div className="flex items-center justify-center">
            <Label htmlFor="billing-toggle" className={billingCycle === "monthly" ? "font-medium" : "text-muted-foreground"}>
              شهري
            </Label>
            <Switch
              id="billing-toggle"
              className="mx-3"
              checked={billingCycle === "yearly"}
              onCheckedChange={toggleBillingCycle}
            />
            <Label htmlFor="billing-toggle" className={billingCycle === "yearly" ? "font-medium" : "text-muted-foreground"}>
              سنوي <Badge className="ml-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">وفر 17%</Badge>
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-xl border ${
                plan.highlight
                  ? "border-primary/50 shadow-lg shadow-primary/10"
                  : "border-border"
              } bg-card p-6 transition-all duration-300 hover:shadow-md`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 right-5 bg-primary">الأكثر شيوعًا</Badge>
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <div className="mt-4 mb-6">
                <div className="text-3xl font-bold">
                  {billingCycle === "monthly" ? plan.price.monthly : plan.price.yearly}{" "}
                  <span className="text-lg text-muted-foreground font-normal">
                    {billingCycle === "monthly" ? "ريال/شهريًا" : "ريال/سنويًا"}
                  </span>
                </div>
                <p className="text-muted-foreground mt-2">{plan.description}</p>
              </div>

              <Button
                className={`w-full mb-6 ${
                  plan.highlight ? "bg-primary hover:bg-primary/90" : ""
                }`}
                variant={plan.highlight ? "default" : "outline"}
              >
                {plan.buttonText}
              </Button>

              <div className="space-y-3">
                {plan.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-center">
                    {feature.available ? (
                      <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground/50 mr-2 flex-shrink-0" />
                    )}
                    <span
                      className={
                        feature.available ? "" : "text-muted-foreground/60 line-through"
                      }
                    >
                      {feature.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h3 className="text-xl font-bold mb-4">تحتاج إلى حل مخصص؟</h3>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            تواصل معنا للحصول على عرض سعر خاص يناسب احتياجات عملك الفريدة، مع إمكانية تخصيص الميزات والدعم
          </p>
          <Button variant="outline" size="lg">
            تواصل مع فريق المبيعات
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
