import React from 'react';
import { Store, ArrowRight, BarChart3, CreditCard, Gift, PlayCircle, GraduationCap, Users, Package, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { traditionalBusinessCourseData } from '@/data/traditionalBusinessCourseData';

const TraditionalBusinessHero: React.FC = () => {
  const handleStartCourse = () => {
    const modulesSection = document.getElementById('course-modules');
    if (modulesSection) {
      modulesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <div className="text-center max-w-4xl mx-auto">
        {/* Free Badge */}
        <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-md px-3 py-1.5 mb-4">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
          <span className="text-xs text-green-700 font-medium">دورة مجانية تماماً</span>
          <Gift className="w-3.5 h-3.5 text-green-600" />
        </div>

        {/* Logo */}
        <div className="flex justify-center items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
            <Store className="w-6 h-6 text-orange-600" />
          </div>
          <div className="text-xl font-bold text-orange-600">
            سطوكيها
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl md:text-2xl font-bold text-foreground mb-3 leading-tight">
          {traditionalBusinessCourseData.title}
        </h1>

        {/* Subtitle */}
        <p className="text-sm text-muted-foreground mb-6 max-w-2xl mx-auto">
          التحول من التجارة التقليدية للرقمية
        </p>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-2xl mx-auto">
          {traditionalBusinessCourseData.description}
        </p>

        {/* Target Audience */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {traditionalBusinessCourseData.targetAudience.map((audience, index) => (
            <div key={index} className="inline-flex items-center gap-1.5 bg-muted text-muted-foreground px-3 py-1.5 rounded-md text-xs font-medium">
              <Users className="w-3.5 h-3.5 text-orange-500" />
              {audience}
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 max-w-lg mx-auto">
          <div className="text-center">
            <div className="w-8 h-8 bg-orange-50 rounded-md flex items-center justify-center mx-auto mb-1.5">
              <PlayCircle className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-lg font-bold text-foreground">{traditionalBusinessCourseData.totalVideos}</div>
            <div className="text-xs text-muted-foreground">فيديو</div>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-50 rounded-md flex items-center justify-center mx-auto mb-1.5">
              <Monitor className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-lg font-bold text-foreground">{traditionalBusinessCourseData.totalDuration}</div>
            <div className="text-xs text-muted-foreground">محتوى</div>
          </div>
          <div className="text-center md:col-span-1 col-span-2">
            <div className="w-8 h-8 bg-green-50 rounded-md flex items-center justify-center mx-auto mb-1.5">
              <BarChart3 className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-lg font-bold text-foreground">{traditionalBusinessCourseData.modules.length}</div>
            <div className="text-xs text-muted-foreground">محور</div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Button
            onClick={handleStartCourse}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 text-sm font-semibold rounded-md"
          >
            <PlayCircle className="w-4 h-4 mr-1.5" />
            ابدأ رحلة التحول الرقمي
          </Button>

          <Button
            variant="outline"
            className="border-border text-foreground hover:bg-muted px-5 py-2.5 text-sm font-semibold rounded-md"
          >
            <GraduationCap className="w-4 h-4 mr-1.5" />
            مخصصة للتجار التقليديين
          </Button>
        </div>

        {/* Key Features */}
        <div className="mt-6 bg-muted rounded-md p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center justify-center gap-2">
            <Store className="w-4 h-4 text-orange-500" />
            مميزات التحول الرقمي
          </h3>
          <div className="grid md:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-orange-50 rounded-md flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-3.5 h-3.5 text-orange-600" />
              </div>
              <div>
                <div className="font-medium text-foreground">نقطة البيع POS</div>
                <div className="text-muted-foreground">كاشير ذكي متطور</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-50 rounded-md flex items-center justify-center flex-shrink-0">
                <Package className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-foreground">إدارة المخزون</div>
                <div className="text-muted-foreground">تزامن تلقائي</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-50 rounded-md flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-3.5 h-3.5 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-foreground">المحاسبة الذكية</div>
                <div className="text-muted-foreground">تقارير تلقائية</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TraditionalBusinessHero;
