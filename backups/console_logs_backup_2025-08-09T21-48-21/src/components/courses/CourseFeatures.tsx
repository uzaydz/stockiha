import React from 'react';
import { CheckCircle, Star, Target, TrendingUp } from 'lucide-react';

const CourseFeatures: React.FC = () => {
  const features = [
    {
      icon: Star,
      title: 'التسويق بفيسبوك وإنستقرام',
      description: 'تعلم كل شيء عن التسويق على منصات فيسبوك وإنستقرام بالتفصيل',
    },
    {
      icon: Target,
      title: 'استراتيجيات فعّالة',
      description: 'أحدث الاستراتيجيات والتقنيات المثبتة في عالم التسويق الإلكتروني',
    },
    {
      icon: TrendingUp,
      title: 'نتائج مضمونة',
      description: 'طبق ما تتعلمه واحصل على نتائج ملموسة في مشروعك التجاري',
    },
    {
      icon: CheckCircle,
      title: 'دعم مستمر',
      description: 'احصل على الدعم والمساعدة من فريقنا المتخصص',
    }
  ];

  return (
    <div className="mb-8">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          لماذا هذه الدورة؟
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          دورة شاملة ومجانية مصممة خصيصاً لمشتركي سطوكيها وكتوبي
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CourseFeatures;
