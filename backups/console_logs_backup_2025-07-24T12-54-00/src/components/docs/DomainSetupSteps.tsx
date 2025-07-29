import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  Globe,
  Settings,
  Shield,
  Zap
} from 'lucide-react';

interface Step {
  id: number;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  icon: React.ReactNode;
  details: string[];
  time: string;
}

const DomainSetupSteps: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);

  const steps: Step[] = [
    {
      id: 1,
      title: 'شراء النطاق',
      description: 'احصل على نطاق من مزود معتمد',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'upcoming',
      icon: <Globe className="w-5 h-5" />,
      details: [
        'اختر اسم نطاق مناسب لعلامتك التجارية',
        'استخدم مزودين موثوقين مثل GoDaddy أو Namecheap',
        'تأكد من تجديد النطاق سنوياً'
      ],
      time: '5-10 دقائق'
    },
    {
      id: 2,
      title: 'إضافة النطاق في سطوكيها',
      description: 'أضف النطاق في لوحة تحكم موقعك',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'upcoming',
      icon: <Settings className="w-5 h-5" />,
      details: [
        'سجل دخول إلى حسابك في stockiha.com',
        'انتقل إلى صفحة إعدادات النطاق',
        'أدخل اسم النطاق واحفظ الإعدادات'
      ],
      time: '2-3 دقائق'
    },
    {
      id: 3,
      title: 'تكوين سجلات DNS',
      description: 'أضف السجلات المطلوبة عند مزود النطاق',
      status: currentStep === 3 ? 'current' : currentStep > 3 ? 'completed' : 'upcoming',
      icon: <Settings className="w-5 h-5" />,
      details: [
        'سجل دخول إلى لوحة تحكم مزود النطاق',
        'أضف سجل A يشير إلى 76.76.21.21',
        'أضف سجل CNAME للـ www يشير إلى connect.ktobi.online'
      ],
      time: '5-15 دقيقة'
    },
    {
      id: 4,
      title: 'إصدار شهادة الأمان',
      description: 'نقوم بإصدار شهادة SSL تلقائياً',
      status: currentStep === 4 ? 'current' : currentStep > 4 ? 'completed' : 'upcoming',
      icon: <Shield className="w-5 h-5" />,
      details: [
        'يتم إصدار الشهادة تلقائياً من Let\'s Encrypt',
        'تغطي الشهادة النطاق الرئيسي و www',
        'تحديث تلقائي كل 90 يوم'
      ],
      time: '10-30 دقيقة'
    },
    {
      id: 5,
      title: 'اختبار النطاق',
      description: 'تأكد من عمل النطاق بشكل صحيح',
      status: currentStep === 5 ? 'current' : currentStep > 5 ? 'completed' : 'upcoming',
      icon: <Zap className="w-5 h-5" />,
      details: [
        'تصفح النطاق الجديد في المتصفح',
        'تأكد من ظهور شهادة SSL (القفل الأخضر)',
        'اختبر جميع صفحات الموقع'
      ],
      time: '5-10 دقائق'
    }
  ];

  const getStepIcon = (step: Step) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'current':
        return <Clock className="w-6 h-6 text-blue-500" />;
      case 'upcoming':
        return <AlertCircle className="w-6 h-6 text-gray-400" />;
      default:
        return step.icon;
    }
  };

  const getStepBg = (step: Step) => {
    switch (step.status) {
      case 'completed':
        return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
      case 'current':
        return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800';
      case 'upcoming':
        return 'bg-muted/30 border-border';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">خطوات إعداد النطاق المخصص</h2>
        <p className="text-muted-foreground">اتبع هذه الخطوات البسيطة لربط نطاقك بموقعك</p>
      </div>

      <div className="grid gap-4">
        {steps.map((step, index) => (
          <Card key={step.id} className={`transition-all duration-200 ${getStepBg(step)}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStepIcon(step)}
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {step.id}
                      </span>
                      {step.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {step.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {step.time}
                  </Badge>
                  {step.status === 'current' && (
                    <Button
                      size="sm"
                      onClick={() => setCurrentStep(step.id + 1)}
                      className="ml-2"
                    >
                      تم الانتهاء
                      <ArrowRight className="w-4 h-4 mr-1" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {step.details.map((detail, detailIndex) => (
                  <div key={detailIndex} className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-current rounded-full mt-2 ml-2 opacity-60"></div>
                    <p className="text-sm text-muted-foreground">{detail}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 ml-2"></div>
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              ملاحظة مهمة
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              عملية انتشار DNS قد تستغرق من بضع دقائق إلى 48 ساعة. كن صبوراً ولا تقلق إذا لم يعمل النطاق فوراً.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DomainSetupSteps;
