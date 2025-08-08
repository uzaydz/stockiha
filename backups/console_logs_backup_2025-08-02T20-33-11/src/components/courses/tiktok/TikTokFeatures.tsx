import React from 'react';
import { 
  Play, 
  Users, 
  Target, 
  BarChart3, 
  Zap, 
  TrendingUp,
  Music,
  Eye,
  CreditCard,
  CheckCircle,
  Rocket,
  Award
} from 'lucide-react';

const TikTokFeatures: React.FC = () => {
  const features = [
    {
      icon: Play,
      title: 'مقدمة إلى تيك توك أدس',
      description: 'فهم شامل لمنصة تيك توك كأداة إعلانية قوية، ومقارنة مع منصات التواصل الأخرى، وكيفية الاستفادة من نموها السريع',
      color: 'text-pink-600 dark:text-pink-400'
    },
    {
      icon: Users,
      title: 'إدارة الحسابات الإعلانية',
      description: 'تعلم إنشاء وإدارة حسابات إعلانية عادية وAgency، وفهم الفروقات بينها وكيفية الحصول على أفضل مرونة في الإدارة',
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      icon: BarChart3,
      title: 'إتقان مدير الإعلانات',
      description: 'التعامل الاحترافي مع واجهة TikTok Ads Manager، إعداد طرق الدفع، وفهم نظام الفوترة والتقارير',
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      icon: Target,
      title: 'أهداف الحملات المتنوعة',
      description: 'استكشاف جميع أهداف الحملة من التفاعل والترافيك إلى التحويلات والمبيعات، ومتى تستخدم كل هدف لتحقيق أفضل النتائج',
      color: 'text-green-600 dark:text-green-400'
    },
    {
      icon: Eye,
      title: 'استهداف متقدم للجماهير',
      description: 'إعداد المجموعات الإعلانية بدقة، استهداف الجمهور المناسب، اختيار الاهتمامات والسلوكيات، وإدارة الميزانيات',
      color: 'text-orange-600 dark:text-orange-400'
    },
    {
      icon: Zap,
      title: 'إبداع المحتوى الإعلاني',
      description: 'تصميم إعلانات جذابة ومبتكرة تتناسب مع طبيعة تيك توك، وفهم أنواع الإعلانات المختلفة وأفضل الممارسات الإبداعية',
      color: 'text-red-600 dark:text-red-400'
    },
    {
      icon: TrendingUp,
      title: 'تحسين الأداء والتحليل',
      description: 'استخدام اختبارات A/B، قياس KPIs، تحليل ROI، وتحسين الحملات باستمرار لتحقيق أفضل النتائج الممكنة',
      color: 'text-indigo-600 dark:text-indigo-400'
    },
    {
      icon: CreditCard,
      title: 'تتبع متقدم بـ Pixel',
      description: 'إعداد TikTok Pixel لتتبع سلوك الزوار، إنشاء جماهير مخصصة ومشابهة، وفهم attribution models',
      color: 'text-cyan-600 dark:text-cyan-400'
    },
    {
      icon: Music,
      title: 'استراتيجيات متقدمة',
      description: 'استكشاف طرق مبتكرة مثل Trend Marketing، التعاون مع المؤثرين، والاستفادة من الموسمية والأحداث الخاصة',
      color: 'text-teal-600 dark:text-teal-400'
    }
  ];

  const benefits = [
    {
      icon: Rocket,
      title: 'نمو سريع',
      description: 'استفد من نمو تيك توك المتسارع'
    },
    {
      icon: Award,
      title: 'شهادة احترافية',
      description: 'أصبح خبير في تيك توك أدس'
    },
    {
      icon: CheckCircle,
      title: 'نتائج مضمونة',
      description: 'تطبيق عملي فوري'
    },
    {
      icon: TrendingUp,
      title: 'ROI عالي',
      description: 'عائد استثمار ممتاز'
    }
  ];

  return (
    <div className="mb-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          أصبح خبيراً في إعلانات تيك توك
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          دورة شاملة تأخذك من المبتدئ إلى الخبير في عالم الإعلانات على أسرع منصة نمواً في العالم
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
              className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-lg border border-pink-200 dark:border-pink-800 p-4 text-center"
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

      {/* TikTok Statistics */}
      <div className="bg-gradient-to-r from-black to-pink-600 text-white rounded-lg p-6 mb-8">
        <div className="text-center">
          <h3 className="text-xl font-bold mb-4 flex items-center justify-center gap-2">
            <Music className="w-6 h-6" />
            لماذا تيك توك الآن؟
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-2xl font-bold mb-1">1B+</div>
              <div className="text-sm opacity-90">مستخدم نشط شهرياً</div>
            </div>
            <div>
              <div className="text-2xl font-bold mb-1">52 دقيقة</div>
              <div className="text-sm opacity-90">متوسط الوقت اليومي</div>
            </div>
            <div>
              <div className="text-2xl font-bold mb-1">150+</div>
              <div className="text-sm opacity-90">دولة متاحة</div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Promise */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800 p-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            <span className="font-bold text-green-800 dark:text-green-300 text-lg">ضمان النجاح</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            في نهاية هذه الدورة ستكون قادراً على:
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="w-4 h-4" />
              <span>إطلاق حملات تيك توك احترافية</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="w-4 h-4" />
              <span>تحقيق ROI عالي ومستدام</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="w-4 h-4" />
              <span>إتقان جميع أدوات المنصة</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TikTokFeatures;
