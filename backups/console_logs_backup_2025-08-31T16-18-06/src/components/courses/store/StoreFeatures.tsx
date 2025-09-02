import React from 'react';
import { 
  UserPlus, 
  Palette, 
  Package, 
  CreditCard, 
  BarChart3, 
  Search, 
  Rocket, 
  CheckCircle,
  Clock,
  Users
} from 'lucide-react';

const StoreFeatures: React.FC = () => {
  const features = [
    {
      icon: UserPlus,
      title: 'إنشاء الحساب والبداية',
      description: 'تعلم كيفية التسجيل في سطوكيها وإعداد حسابك الأول بالطريقة الصحيحة مع جميع المعلومات المطلوبة',
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      icon: Palette,
      title: 'تخصيص التصميم والمظهر',
      description: 'اختيار وتخصيص قالب متجرك، إضافة شعارك والألوان، وجعل متجرك يعكس هوية علامتك التجارية',
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      icon: Package,
      title: 'إدارة المنتجات بذكاء',
      description: 'كيفية إضافة منتجاتك، رفع الصور بجودة عالية، كتابة أوصاف جذابة، وتنظيم منتجاتك في تصنيفات',
      color: 'text-green-600 dark:text-green-400'
    },
    {
      icon: CreditCard,
      title: 'إعداد الدفع والشحن',
      description: 'تكوين طرق الدفع المختلفة بما في ذلك الدفع عند الاستلام، وإعداد خيارات الشحن وحساب التكاليف',
      color: 'text-orange-600 dark:text-orange-400'
    },
    {
      icon: BarChart3,
      title: 'إدارة الطلبات والعملاء',
      description: 'كيفية استقبال الطلبات، معالجتها، والتواصل مع العملاء بطريقة احترافية لضمان رضاهم',
      color: 'text-red-600 dark:text-red-400'
    },
    {
      icon: Search,
      title: 'تحسين محركات البحث',
      description: 'أساسيات SEO لمتجرك لزيادة ظهورك في نتائج البحث وجذب المزيد من العملاء المحتملين',
      color: 'text-indigo-600 dark:text-indigo-400'
    }
  ];

  const benefits = [
    {
      icon: Clock,
      title: 'توفير الوقت',
      description: 'تعلم بطريقة منظمة ومرتبة'
    },
    {
      icon: Users,
      title: 'للمبتدئين',
      description: 'لا تحتاج لخبرة سابقة'
    },
    {
      icon: CheckCircle,
      title: 'نتائج مضمونة',
      description: 'متجر جاهز للعمل في النهاية'
    },
    {
      icon: Rocket,
      title: 'بداية سريعة',
      description: 'ابدأ البيع في أسرع وقت'
    }
  ];

  return (
    <div className="mb-6">
      {/* Section Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5 mb-3">
          <Rocket className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs font-medium text-blue-700">خطوة بخطوة نحو متجرك الأول</span>
        </div>

        <h2 className="text-lg font-bold text-foreground mb-2">
          خطوة بخطوة نحو متجرك الأول
        </h2>

        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          دورة مفصلة ومبسطة تأخذك من نقطة الصفر إلى إطلاق متجرك الإلكتروني الأول
          على منصة سطوكيها
        </p>
      </div>

      {/* Main Features */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className="bg-card border border-border rounded-md p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded-md flex items-center justify-center">
                  <Icon className={`w-4 h-4 ${feature.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Benefits */}
      <div className="grid md:grid-cols-2 gap-3 mb-6">
        {benefits.map((benefit, index) => {
          const Icon = benefit.icon;
          return (
            <div
              key={index}
              className="bg-card border border-border rounded-md p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">
                    {benefit.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Success Promise */}
      <div className="bg-card border border-border rounded-md p-4">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 mb-3">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="font-bold text-green-700 text-sm">وعد النجاح</span>
          </div>
          <h3 className="text-base font-bold text-foreground mb-3">
            في نهاية هذه الدورة ستحصل على:
          </h3>
          <div className="grid md:grid-cols-1 gap-2 text-sm">
            <div className="flex items-center justify-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span>متجر إلكتروني كامل وجاهز</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span>تصميم احترافي يناسب علامتك</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span>القدرة على استقبال الطلبات</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreFeatures;
