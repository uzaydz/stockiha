import React from 'react';
import { CheckCircle, Star, Target, TrendingUp, Users, Award, Zap, Shield } from 'lucide-react';

const CourseFeatures: React.FC = () => {
  const features = [
    {
      icon: Star,
      title: 'التسويق بفيسبوك وإنستقرام',
      description: 'تعلم كل شيء عن التسويق على منصات فيسبوك وإنستقرام بالتفصيل والعمق',
      highlight: 'أكثر من 40 درس عملي',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Target,
      title: 'استراتيجيات فعّالة',
      description: 'أحدث الاستراتيجيات والتقنيات المثبتة في عالم التسويق الإلكتروني',
      highlight: 'محدثة 2024',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: TrendingUp,
      title: 'نتائج مضمونة',
      description: 'طبق ما تتعلمه واحصل على نتائج ملموسة في مشروعك التجاري',
      highlight: 'ضمان الرضا 100%',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: Users,
      title: 'دعم مستمر',
      description: 'احصل على الدعم والمساعدة من فريقنا المتخصص والمجتمع',
      highlight: '24/7 دعم',
      color: 'from-orange-500 to-orange-600'
    },
    {
      icon: Award,
      title: 'شهادة معتمدة',
      description: 'احصل على شهادة معتمدة تثبت إكمالك للدورة بنجاح',
      highlight: 'معترف بها',
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      icon: Zap,
      title: 'محتوى تفاعلي',
      description: 'فيديوهات وتمارين عملية تجعل التعلم ممتعاً وفعالاً',
      highlight: 'تجربة تعليمية فريدة',
      color: 'from-pink-500 to-pink-600'
    }
  ];

  const benefits = [
    'تعلم من خبراء في المجال',
    'محتوى عملي وليس نظري فقط',
    'أمثلة حقيقية من مشاريع ناجحة',
    'إمكانية الوصول مدى الحياة',
    'تحديثات مجانية مستمرة',
    'شهادة معتمدة عند الإكمال'
  ];

  return (
    <div className="mb-6">
      {/* Section Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 bg-brand-50 border border-brand-200 rounded-md px-3 py-1.5 mb-3">
          <Star className="w-3.5 h-3.5 text-brand-500" />
          <span className="text-xs font-medium text-brand-700">لماذا تختار هذه الدورة؟</span>
        </div>

        <h2 className="text-lg font-bold text-foreground mb-2">
          دورة شاملة ومتميزة
        </h2>

        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          مصممة خصيصاً لمساعدتك على تحقيق النجاح في عالم التسويق الرقمي
          مع محتوى عملي ودعم مستمر من فريق الخبراء
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className="bg-card border border-border rounded-md p-4"
            >
              {/* Icon */}
              <div className="w-8 h-8 bg-brand-50 rounded-md flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-brand-500" />
              </div>

              {/* Highlight badge */}
              <div className="inline-flex items-center gap-1 bg-muted rounded-md px-2 py-0.5 mb-2">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span className="text-xs font-medium text-muted-foreground">{feature.highlight}</span>
              </div>

              {/* Title */}
              <h3 className="text-base font-bold text-foreground mb-2">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Benefits Section */}
      <div className="bg-muted rounded-md p-4 border border-border mb-6">
        <div className="text-center mb-4">
          <h3 className="text-base font-bold text-foreground mb-1">
            ما ستحصل عليه
          </h3>
          <p className="text-xs text-muted-foreground">
            فوائد إضافية تجعل تجربتك التعليمية أكثر تميزاً
          </p>
        </div>

        <div className="grid gap-2">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm text-foreground">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center">
        <div className="bg-card border border-border rounded-md p-4">
          <Shield className="w-8 h-8 text-brand-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-foreground mb-1">
            جاهز للبدء؟
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            انضم إلى آلاف الطلاب الذين نجحوا في رحلتهم التعليمية
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>✨ محتوى حصري</span>
            <span>•</span>
            <span>🚀 دعم متخصص</span>
            <span>•</span>
            <span>🏆 شهادة معتمدة</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseFeatures;
