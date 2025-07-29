import React from 'react';
import { Play, Zap, Target, TrendingUp, Gift, PlayCircle, GraduationCap, Users, Music } from 'lucide-react';
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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full px-3 py-1 mb-4">
          <Gift className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-700 dark:text-green-300 font-medium">دورة مجانية</span>
        </div>
        
        {/* TikTok Logo and Icons */}
        <div className="flex justify-center items-center gap-4 mb-6">
          <div className="bg-pink-100 dark:bg-pink-900/20 p-4 rounded-xl">
            <Music className="w-10 h-10 text-pink-600 dark:text-pink-400" />
          </div>
          <div className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-black bg-clip-text text-transparent">
            TikTok Ads
          </div>
          <div className="bg-black dark:bg-white p-4 rounded-xl">
            <Play className="w-10 h-10 text-white dark:text-black fill-current" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          {tiktokAdsCourseData.title}
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-3xl mx-auto text-lg">
          {tiktokAdsCourseData.description}
        </p>

        {/* Target Audience */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {tiktokAdsCourseData.targetAudience.map((audience, index) => (
            <span key={index} className="inline-flex items-center gap-1 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 px-3 py-1 rounded-full text-sm">
              <Users className="w-3 h-3" />
              {audience}
            </span>
          ))}
        </div>

        {/* Course Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 max-w-lg mx-auto">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {tiktokAdsCourseData.totalVideos}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">فيديو</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {tiktokAdsCourseData.totalDuration}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">من المحتوى</div>
          </div>
          <div className="text-center md:col-span-1 col-span-2">
            <div className="text-2xl font-bold text-primary mb-1">
              {tiktokAdsCourseData.modules.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">محور</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
          <Button
            onClick={handleStartCourse}
            className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white px-8 py-3 text-lg"
          >
            <PlayCircle className="w-5 h-5 mr-2" />
            ابدأ الدورة الآن
          </Button>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <GraduationCap className="w-5 h-5" />
            <span className="text-sm">لجميع المستويات</span>
          </div>
        </div>

        {/* Key Highlights */}
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-pink-200 dark:border-pink-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ماذا ستتعلم في هذه الدورة؟
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="bg-pink-100 dark:bg-pink-900/30 p-2 rounded-lg">
                <Target className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">استهداف دقيق</div>
                <div className="text-gray-600 dark:text-gray-300">للجمهور المناسب</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">إبداع متميز</div>
                <div className="text-gray-600 dark:text-gray-300">محتوى جذاب</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">نتائج مضمونة</div>
                <div className="text-gray-600 dark:text-gray-300">ROI عالي</div>
              </div>
            </div>
          </div>
        </div>

        {/* TikTok Special Note */}
        <div className="mt-6 p-4 bg-gradient-to-r from-black to-pink-600 text-white rounded-lg">
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
