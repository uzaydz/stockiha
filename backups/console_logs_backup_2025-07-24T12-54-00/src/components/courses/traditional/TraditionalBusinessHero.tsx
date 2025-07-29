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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full px-3 py-1 mb-4">
          <Gift className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-700 dark:text-green-300 font-medium">دورة مجانية</span>
        </div>
        
        {/* Traditional to Digital Transformation Visual */}
        <div className="flex justify-center items-center gap-4 mb-6">
          <div className="bg-orange-100 dark:bg-orange-900/20 p-4 rounded-xl">
            <Store className="w-10 h-10 text-orange-600 dark:text-orange-400" />
          </div>
          <ArrowRight className="w-6 h-6 text-gray-400" />
          <div className="text-3xl font-bold text-primary">سطوكيها</div>
          <ArrowRight className="w-6 h-6 text-gray-400" />
          <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-xl">
            <Monitor className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          {traditionalBusinessCourseData.title}
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-3xl mx-auto text-lg">
          {traditionalBusinessCourseData.description}
        </p>

        {/* Target Audience */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {traditionalBusinessCourseData.targetAudience.map((audience, index) => (
            <span key={index} className="inline-flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full text-sm">
              <Users className="w-3 h-3" />
              {audience}
            </span>
          ))}
        </div>

        {/* Course Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 max-w-lg mx-auto">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {traditionalBusinessCourseData.totalVideos}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">فيديو</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {traditionalBusinessCourseData.totalDuration}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">من المحتوى</div>
          </div>
          <div className="text-center md:col-span-1 col-span-2">
            <div className="text-2xl font-bold text-primary mb-1">
              {traditionalBusinessCourseData.modules.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">محور</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
          <Button
            onClick={handleStartCourse}
            className="bg-gradient-to-r from-orange-600 to-blue-600 hover:from-orange-700 hover:to-blue-700 text-white px-8 py-3 text-lg"
          >
            <PlayCircle className="w-5 h-5 mr-2" />
            ابدأ رحلة التحول الرقمي
          </Button>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <GraduationCap className="w-5 h-5" />
            <span className="text-sm">مخصصة للتجار التقليديين</span>
          </div>
        </div>

        {/* Key Transformation Steps */}
        <div className="bg-gradient-to-r from-orange-50 to-blue-50 dark:from-orange-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-orange-200 dark:border-orange-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            رحلة التحول من التقليدي إلى الرقمي
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
                <CreditCard className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">نقطة البيع POS</div>
                <div className="text-gray-600 dark:text-gray-300">كاشير ذكي متطور</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">إدارة المخزون</div>
                <div className="text-gray-600 dark:text-gray-300">تزامن تلقائي</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">المحاسبة الذكية</div>
                <div className="text-gray-600 dark:text-gray-300">تقارير تلقائية</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stockiha Special Features */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-600 to-orange-600 text-white rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Store className="w-5 h-5" />
            <span className="font-bold">مميزات سطوكيها للتجار</span>
          </div>
          <p className="text-sm opacity-90">
            منصة متكاملة تربط بين متجرك التقليدي والإلكتروني مع تزامن فوري للمخزون والمبيعات
          </p>
        </div>
      </div>
    </div>
  );
};

export default TraditionalBusinessHero; 