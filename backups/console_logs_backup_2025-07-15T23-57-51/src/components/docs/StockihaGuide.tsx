import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  ExternalLink, 
  Settings, 
  Plus,
  Check,
  AlertTriangle,
  RefreshCw,
  Globe,
  Shield,
  Eye,
  Edit,
  Trash2,
  Clock
} from 'lucide-react';

interface StockihaStep {
  step: number;
  title: string;
  description: string;
  action?: string;
  screenshot?: string;
  tips?: string[];
  warning?: string;
}

const StockihaGuide: React.FC = () => {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const stockihaSteps: StockihaStep[] = [
    {
      step: 1,
      title: 'تسجيل الدخول إلى حسابك',
      description: 'ادخل إلى موقع stockiha.com باستخدام بيانات حسابك',
      action: 'الانتقال إلى stockiha.com',
      tips: [
        'تأكد من استخدام الحساب الصحيح للمؤسسة',
        'إذا نسيت كلمة المرور، استخدم خيار "نسيت كلمة المرور"'
      ]
    },
    {
      step: 2,
      title: 'الوصول إلى إعدادات المؤسسة',
      description: 'انقر على اسم المؤسسة في الشريط العلوي، ثم اختر "إعدادات"',
      tips: [
        'يمكنك أيضاً الوصول من القائمة الجانبية',
        'تأكد من أن لديك صلاحيات الإدارة'
      ]
    },
    {
      step: 3,
      title: 'الانتقال إلى صفحة النطاقات',
      description: 'في صفحة الإعدادات، ابحث عن قسم "النطاق المخصص" وانقر عليه',
      tips: [
        'إذا لم تجد القسم، تأكد من تفعيل الخطة المناسبة',
        'قد تحتاج إلى ترقية اشتراكك لاستخدام النطاقات المخصصة'
      ]
    },
    {
      step: 4,
      title: 'إضافة نطاق جديد',
      description: 'انقر على زر "إضافة نطاق جديد" أو "+"',
      action: 'إدخال اسم النطاق',
      tips: [
        'أدخل النطاق بدون www (مثال: example.com)',
        'تأكد من أن النطاق صحيح ومملوك لك',
        'يمكنك إضافة عدة نطاقات إذا سمحت خطتك بذلك'
      ],
      warning: 'لا تضع http:// أو https:// في بداية النطاق'
    },
    {
      step: 5,
      title: 'حفظ إعدادات النطاق',
      description: 'انقر على "حفظ" لإضافة النطاق إلى حسابك',
      tips: [
        'سيظهر النطاق في قائمة النطاقات مع حالة "في انتظار التحقق"',
        'ستحصل على تعليمات DNS المطلوبة'
      ]
    },
    {
      step: 6,
      title: 'نسخ إعدادات DNS',
      description: 'انسخ سجلات DNS المطلوبة التي ستظهر لك',
      tips: [
        'استخدم زر النسخ لتجنب الأخطاء',
        'ستحتاج هذه المعلومات في لوحة تحكم مزود النطاق'
      ]
    },
    {
      step: 7,
      title: 'التحقق من حالة النطاق',
      description: 'بعد إعداد DNS، ارجع لهذه الصفحة وانقر على "التحقق من النطاق"',
      action: 'فحص حالة النطاق',
      tips: [
        'قد تحتاج للانتظار بعض الوقت حتى ينتشر DNS',
        'يمكنك التحقق عدة مرات دون مشاكل',
        'ستتغير الحالة من "منتظر" إلى "نشط" عند نجاح التحقق'
      ]
    }
  ];

  const domainStates = [
    {
      state: 'pending',
      label: 'في انتظار التحقق',
      description: 'تم إضافة النطاق ولكن لم يتم التحقق من DNS بعد',
      color: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
      icon: <Clock className="w-4 h-4" />
    },
    {
      state: 'verifying',
      label: 'جاري التحقق',
      description: 'نقوم بفحص سجلات DNS والتحقق من الإعدادات',
      color: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
      icon: <RefreshCw className="w-4 h-4 animate-spin" />
    },
    {
      state: 'active',
      label: 'نشط',
      description: 'النطاق يعمل بشكل صحيح ومتاح للاستخدام',
      color: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
      icon: <Check className="w-4 h-4" />
    },
    {
      state: 'error',
      label: 'خطأ في التكوين',
      description: 'هناك مشكلة في إعدادات DNS أو تكوين النطاق',
      color: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
      icon: <AlertTriangle className="w-4 h-4" />
    }
  ];

  const domainActions = [
    {
      action: 'view',
      label: 'عرض الموقع',
      description: 'افتح موقعك باستخدام النطاق المخصص',
      icon: <Eye className="w-4 h-4" />,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      action: 'edit',
      label: 'تعديل الإعدادات',
      description: 'تغيير إعدادات النطاق أو SSL',
      icon: <Edit className="w-4 h-4" />,
      color: 'bg-gray-500 hover:bg-gray-600'
    },
    {
      action: 'verify',
      label: 'التحقق مرة أخرى',
      description: 'إعادة فحص سجلات DNS والتحقق من الحالة',
      icon: <RefreshCw className="w-4 h-4" />,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      action: 'delete',
      label: 'حذف النطاق',
      description: 'إزالة النطاق من حسابك (غير قابل للتراجع)',
      icon: <Trash2 className="w-4 h-4" />,
      color: 'bg-red-500 hover:bg-red-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">دليل استخدام موقع سطوكيها</h2>
        <p className="text-muted-foreground">كيفية إضافة وإدارة النطاقات المخصصة في لوحة التحكم</p>
      </div>

      {/* الوصول السريع */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-lg text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            الوصول السريع
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={() => window.open('https://stockiha.com/login', '_blank')}
            >
              <ExternalLink className="w-4 h-4 ml-2" />
              تسجيل الدخول إلى سطوكيها
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/30"
              onClick={() => window.open('https://stockiha.com/settings/domain', '_blank')}
            >
              <Globe className="w-4 h-4 ml-2" />
              صفحة إعدادات النطاق
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* خطوات الإعداد */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-foreground">خطوات الإعداد التفصيلية</h3>
        {stockihaSteps.map((step) => (
          <Card key={step.step} className="border border-border">
            <CardHeader 
              className="cursor-pointer" 
              onClick={() => setExpandedStep(expandedStep === step.step ? null : step.step)}
            >
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
                    {step.step}
                  </span>
                  {step.title}
                </div>
                <div className="flex items-center gap-2">
                  {step.action && (
                    <Badge variant="outline" className="text-xs">
                      {step.action}
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm">
                    {expandedStep === step.step ? '−' : '+'}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            
            {expandedStep === step.step && (
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{step.description}</p>
                
                {step.tips && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">نصائح مفيدة:</p>
                    <div className="space-y-1">
                      {step.tips.map((tip, tipIndex) => (
                        <div key={tipIndex} className="flex items-start space-x-2">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 ml-2"></div>
                          <p className="text-sm text-muted-foreground">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {step.warning && (
                  <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <AlertTitle className="text-amber-700 dark:text-amber-300 text-sm">تحذير</AlertTitle>
                    <AlertDescription className="text-amber-600 dark:text-amber-400 text-sm">
                      {step.warning}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* حالات النطاق */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-foreground">حالات النطاق المختلفة</h3>
        <div className="grid gap-3">
          {domainStates.map((state) => (
            <Card key={state.state} className={`border ${state.color.includes('border') ? state.color : 'border-border'}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${state.color.split(' ')[0]} ${state.color.split(' ')[1]}`}>
                    {state.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-medium ${state.color.split(' ').find(c => c.includes('text'))}`}>
                      {state.label}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">{state.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* الإجراءات المتاحة */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-foreground">الإجراءات المتاحة</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {domainActions.map((action) => (
            <Card key={action.action} className="border border-border hover:bg-muted/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full text-white ${action.color}`}>
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{action.label}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* نصائح متقدمة */}
      <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-lg text-green-700 dark:text-green-300 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            نصائح متقدمة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 ml-2"></div>
              <p className="text-sm text-green-700 dark:text-green-300">
                <strong>نطاقات متعددة:</strong> يمكنك إضافة عدة نطاقات للموقع نفسه (مثل .com و .net)
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 ml-2"></div>
              <p className="text-sm text-green-700 dark:text-green-300">
                <strong>النطاق الرئيسي:</strong> يمكنك تحديد أي نطاق كالرئيسي لإعادة التوجيه التلقائي
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 ml-2"></div>
              <p className="text-sm text-green-700 dark:text-green-300">
                <strong>شهادة SSL:</strong> يتم إصدار شهادة أمان مجانية تلقائياً لكل نطاق
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 ml-2"></div>
              <p className="text-sm text-green-700 dark:text-green-300">
                <strong>النسخ الاحتياطي:</strong> احتفظ دائماً بنسخة من إعدادات DNS في مكان آمن
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* دعم إضافي */}
      <Card className="bg-muted/30 border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            المساعدة والدعم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            إذا واجهت أي مشاكل أو احتجت لمساعدة إضافية، لا تتردد في التواصل معنا:
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" className="flex-1">
              <ExternalLink className="w-4 h-4 ml-2" />
              مركز المساعدة
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <ExternalLink className="w-4 h-4 ml-2" />
              دردشة مباشرة
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <ExternalLink className="w-4 h-4 ml-2" />
              support@stockiha.com
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockihaGuide;
