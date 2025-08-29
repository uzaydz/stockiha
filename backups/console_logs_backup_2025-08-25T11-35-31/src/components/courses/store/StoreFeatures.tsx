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
    <div className="mb-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          خطوة بخطوة نحو متجرك الأول
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          دورة مفصلة ومبسطة تأخذك من نقطة الصفر إلى إطلاق متجرك الإلكتروني الأول
          على منصة سطوكيها
        </p>
      </div>
      
      {/* Main Features */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <Icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Benefits */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {benefits.map((benefit, index) => {
          const Icon = benefit.icon;
          return (
            <div
              key={index}
              className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4 text-center"
            >
              <Icon className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                {benefit.title}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {benefit.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Success Promise */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800 p-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            <span className="font-bold text-green-800 dark:text-green-300 text-lg">وعد النجاح</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            في نهاية هذه الدورة ستحصل على:
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="w-4 h-4" />
              <span>متجر إلكتروني كامل وجاهز</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="w-4 h-4" />
              <span>تصميم احترافي يناسب علامتك</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
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
