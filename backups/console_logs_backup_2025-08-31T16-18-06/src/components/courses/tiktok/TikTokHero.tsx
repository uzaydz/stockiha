import React from 'react';
import { Play, Zap, Target, TrendingUp, Gift, PlayCircle, GraduationCap, Users, Music, Award, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tiktokAdsCourseData } from '@/data/tiktokAdsCourseData';

const TikTokHero: React.FC = () => {
  const handleStartCourse = () => {
    const modulesSection = document.getElementById('course-modules');
    if (modulesSection) {
      modulesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-[450px] flex items-center justify-center bg-gradient-to-br from-pink-50/30 via-background to-purple-50/20 border border-pink-100 rounded-lg p-8 mb-6">
      <div className="text-center max-w-5xl mx-auto">
        {/* Free Badge */}
        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-pink-200 rounded-full px-4 py-2 mb-6 shadow-sm">
          <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-pink-700 font-semibold">دورة مجانية تماماً</span>
          <Gift className="w-4 h-4 text-pink-600" />
        </div>

        {/* TikTok Logo and Icons */}
        <div className="flex justify-center items-center gap-4 mb-6">
          <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl shadow-sm">
            <Music className="w-8 h-8 text-pink-600" />
          </div>
          <div className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-black bg-clip-text text-transparent">
            TikTok Ads
          </div>
          <div className="bg-black p-4 rounded-xl shadow-sm">
            <Play className="w-8 h-8 text-white fill-current" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight">
          {tiktokAdsCourseData.title}
          <span className="block text-pink-500 mt-2">المنصة الأسرع نمواً</span>
        </h1>

        {/* Description */}
        <p className="text-base text-muted-foreground mb-8 leading-relaxed max-w-3xl mx-auto">
          {tiktokAdsCourseData.description}
        </p>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="w-12 h-12 bg-white/60 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm">
              <PlayCircle className="w-6 h-6 text-pink-500" />
            </div>
            <div className="text-xl font-bold text-foreground">{tiktokAdsCourseData.totalVideos}</div>
            <div className="text-xs text-muted-foreground">فيديو تعليمي</div>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white/60 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm">
              <Clock className="w-6 h-6 text-pink-500" />
            </div>
            <div className="text-xl font-bold text-foreground">{tiktokAdsCourseData.totalDuration}</div>
            <div className="text-xs text-muted-foreground">مدة الدورة</div>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white/60 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm">
              <Award className="w-6 h-6 text-pink-500" />
            </div>
            <div className="text-xl font-bold text-foreground">{tiktokAdsCourseData.modules.length}</div>
            <div className="text-xs text-muted-foreground">محور تعليمي</div>
          </div>
        </div>

        {/* Target Audience */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {tiktokAdsCourseData.targetAudience.map((audience, index) => (
            <div key={index} className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm text-muted-foreground px-4 py-2 rounded-full text-sm font-medium shadow-sm">
              <Users className="w-4 h-4 text-pink-500" />
              {audience}
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={handleStartCourse}
            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8 py-3 text-base font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
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

        {/* Key Highlights */}
        <div className="mt-8 bg-white/40 backdrop-blur-sm rounded-xl p-6 border border-pink-200/50 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center justify-center gap-2">
            <Target className="w-5 h-5 text-pink-500" />
            ماذا ستتعلم في هذه الدورة؟
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="bg-white/60 p-3 rounded-lg shadow-sm">
                <Target className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <div className="font-medium text-foreground">استهداف دقيق</div>
                <div className="text-xs text-muted-foreground">للجمهور المناسب</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/60 p-3 rounded-lg shadow-sm">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="font-medium text-foreground">إبداع متميز</div>
                <div className="text-xs text-muted-foreground">محتوى جذاب</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/60 p-3 rounded-lg shadow-sm">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-foreground">نتائج مضمونة</div>
                <div className="text-xs text-muted-foreground">ROI عالي</div>
              </div>
            </div>
          </div>
        </div>

        {/* TikTok Special Note */}
        <div className="mt-6 p-4 bg-gradient-to-r from-black to-pink-600 text-white rounded-lg shadow-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Music className="w-5 h-5" />
            <span className="font-bold">خاص بـ TikTok</span>
          </div>
          <p className="text-sm opacity-90">
            المنصة الأسرع نمواً في العالم مع أكثر من مليار مستخدم نشط شهرياً
          </p>
        </div>
      </div>
    </div>
  );
};

export default TikTokHero;
