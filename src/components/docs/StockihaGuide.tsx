import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, Globe, Link2, Settings, Shield, Timer } from 'lucide-react';

interface GuideStep {
  title: string;
  description: string;
  hint?: string;
}

const StockihaGuide: React.FC = () => {
  const steps: GuideStep[] = [
    {
      title: 'افتح صفحة النطاقات',
      description: 'من لوحة التحكم، اذهب إلى الإعدادات ثم قسم النطاقات المخصصة.',
      hint: 'المسار: الإعدادات → النطاقات',
    },
    {
      title: 'أضف نطاقك الرئيسي',
      description: 'أدخل النطاق بدون www (مثال: example.com) ثم احفظ.',
      hint: 'سيتم إنشاء سجلات التحقق تلقائياً.',
    },
    {
      title: 'فعّل إعادة التوجيه',
      description: 'اختر أن يتم توجيه www إلى النطاق الرئيسي أو العكس حسب تفضيلك.',
      hint: 'يوصى بجعل النطاق الرئيسي هو الافتراضي.',
    },
    {
      title: 'انتظر التحقق التلقائي',
      description: 'بمجرد وصول سجلات DNS، سيتم تأكيد النطاق وإصدار شهادة SSL.',
      hint: 'قد يستغرق ذلك من 10 إلى 30 دقيقة بعد الانتشار.',
    },
  ];

  const verificationStates = [
    {
      label: 'بانتظار التحقق',
      description: 'تأكد من أن سجلات DNS أضيفت بشكل صحيح.',
      variant: 'secondary' as const,
    },
    {
      label: 'تم التحقق',
      description: 'النطاق جاهز وسيعمل مع SSL تلقائياً.',
      variant: 'default' as const,
    },
    {
      label: 'فشل التحقق',
      description: 'راجع السجلات أو جرّب إعادة التحقق من لوحة التحكم.',
      variant: 'destructive' as const,
    },
  ];

  const tips = [
    'استخدم نطاقاً واحداً فقط كنطاق أساسي لتجنب التكرار.',
    'تأكد أن سجلات A و CNAME لا تتعارض مع سجلات قديمة.',
    'لا تفعل Proxy في Cloudflare أثناء التحقق الأولي.',
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">إعداد النطاق داخل سطوكيها</h2>
        <p className="text-muted-foreground">
          هذه الخطوات تشرح ما يحدث داخل لوحة التحكم بعد إضافة النطاق.
        </p>
      </div>

      <div className="grid gap-4">
        {steps.map((step, index) => (
          <Card key={step.title} className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  {index + 1}
                </span>
                {step.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{step.description}</p>
              {step.hint && (
                <Badge variant="outline" className="text-xs">
                  {step.hint}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/30 border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            حالة التحقق والشهادة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {verificationStates.map((state) => (
              <div
                key={state.label}
                className="rounded-lg border border-border bg-background p-3 space-y-1"
              >
                <Badge variant={state.variant}>{state.label}</Badge>
                <p className="text-sm text-muted-foreground">{state.description}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              إصدار الشهادة يتم تلقائياً بعد التحقق.
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              القفل الأخضر يظهر عند اكتمال SSL.
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5" />
              إعدادات مهمة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 mt-1" />
              النطاق الأساسي هو الذي يظهر في العنوان ويستخدم في الروابط.
            </div>
            <div className="flex items-start gap-2">
              <Link2 className="w-4 h-4 mt-1" />
              يمكن ربط www كنطاق ثانوي وتوجيهه تلقائياً.
            </div>
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 mt-1" />
              SSL يُدار تلقائياً ولا يتطلب تدخل يدوي.
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5" />
              أفضل الممارسات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tips.map((tip) => (
              <div key={tip} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
                <p className="text-sm text-muted-foreground">{tip}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Alert>
        <AlertTitle className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          في حال تأخر التفعيل
        </AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground">
          يمكنك إعادة التحقق من النطاق من لوحة التحكم بعد التأكد من صحة سجلات DNS.
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap gap-2 justify-center">
        <Button variant="outline" size="sm">
          مراجعة إعدادات النطاق
        </Button>
        <Button variant="outline" size="sm">
          إعادة التحقق
        </Button>
      </div>
    </div>
  );
};

export default StockihaGuide;
