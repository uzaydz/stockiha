import React from 'react';
import { GraduationCap, PlayCircle, Users, Gift, TrendingUp, Award, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { courseData } from '@/data/digitalMarketingCourseData';

const CourseHero: React.FC = () => {
  const handleStartCourse = () => {
    const modulesSection = document.getElementById('course-modules');
    if (modulesSection) {
      modulesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center bg-gradient-to-br from-brand-50/30 via-background to-brand-50/20 border border-brand-100 rounded-lg p-8 mb-6">
      <div className="text-center max-w-4xl mx-auto">
        {/* Free Badge */}
        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-brand-200 rounded-full px-4 py-2 mb-6 shadow-sm">
          <div className="w-2 h-2 bg-brand-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-brand-700 font-semibold">دورة مجانية تماماً</span>
          <Gift className="w-4 h-4 text-brand-600" />
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight">
          دورة التسويق الإلكتروني
          <span className="block text-brand-500 mt-2">الشاملة والمتقدمة</span>
        </h1>

        {/* Description */}
        <p className="text-base text-muted-foreground mb-8 leading-relaxed max-w-3xl mx-auto">
          {courseData.description}
        </p>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="w-12 h-12 bg-white/60 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm">
              <PlayCircle className="w-6 h-6 text-brand-500" />
            </div>
            <div className="text-xl font-bold text-foreground">{courseData.totalVideos}+</div>
            <div className="text-xs text-muted-foreground">فيديو تعليمي</div>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white/60 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm">
              <Clock className="w-6 h-6 text-brand-500" />
            </div>
            <div className="text-xl font-bold text-foreground">{courseData.totalDuration}</div>
            <div className="text-xs text-muted-foreground">مدة الدورة</div>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white/60 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm">
              <Award className="w-6 h-6 text-brand-500" />
            </div>
            <div className="text-xl font-bold text-foreground">100%</div>
            <div className="text-xs text-muted-foreground">ضمان الرضا</div>
          </div>
        </div>

        {/* Target Audience */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {courseData.targetAudience.map((audience, index) => (
            <div key={index} className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm text-muted-foreground px-4 py-2 rounded-full text-sm font-medium shadow-sm">
              <Users className="w-4 h-4 text-brand-500" />
              {audience}
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={handleStartCourse}
            className="bg-brand-500 hover:bg-brand-600 text-white px-8 py-3 text-base font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <PlayCircle className="w-5 h-5 mr-2" />
            ابدأ الدورة الآن
          </Button>

          <Button
            variant="outline"
            className="border-2 border-white/60 bg-white/40 backdrop-blur-sm text-foreground hover:bg-white/60 px-6 py-3 text-base font-semibold rounded-lg shadow-sm"
          >
            <TrendingUp className="w-5 h-5 mr-2" />
            معرفة المزيد
          </Button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 pt-6 border-t border-brand-200/50">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <span className="text-lg">🚀</span>
            أكثر من 10,000 طالب نجحوا في إكمال هذه الدورة
          </p>
        </div>
      </div>
    </div>
  );
};

export default CourseHero;
