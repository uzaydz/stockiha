import React from 'react';
import { Wrench, QrCode, MessageSquare, Clock, Gift, PlayCircle, GraduationCap, Users, Smartphone, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { serviceProvidersCourseData } from '@/data/serviceProvidersCourseData';

const ServiceProvidersHero: React.FC = () => {
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
        
        {/* Service Process Flow Visual */}
        <div className="flex justify-center items-center gap-3 mb-6 flex-wrap">
          <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-xl">
            <Wrench className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="hidden sm:block text-gray-400">→</div>
          <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-xl">
            <QrCode className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="hidden sm:block text-gray-400">→</div>
          <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-xl">
            <MessageSquare className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div className="hidden sm:block text-gray-400">→</div>
          <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-xl">
            <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          {serviceProvidersCourseData.title}
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-3xl mx-auto text-lg">
          {serviceProvidersCourseData.description}
        </p>

        {/* Target Audience */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {serviceProvidersCourseData.targetAudience.map((audience, index) => (
            <span key={index} className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm">
              <Users className="w-3 h-3" />
              {audience}
            </span>
          ))}
        </div>

        {/* Course Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 max-w-lg mx-auto">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {serviceProvidersCourseData.totalVideos}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">فيديو</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {serviceProvidersCourseData.totalDuration}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">من المحتوى</div>
          </div>
          <div className="text-center md:col-span-1 col-span-2">
            <div className="text-2xl font-bold text-primary mb-1">
              {serviceProvidersCourseData.modules.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">محور</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
          <Button
            onClick={handleStartCourse}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg"
          >
            <PlayCircle className="w-5 h-5 mr-2" />
            ابدأ الدورة الآن
          </Button>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <GraduationCap className="w-5 h-5" />
            <span className="text-sm">مخصصة لمقدمي الخدمات</span>
          </div>
        </div>

        {/* Key System Features */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            مميزات النظام الثوري لإدارة الخدمات
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                <QrCode className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">تتبع ذكي</div>
                <div className="text-gray-600 dark:text-gray-300">باركود + رقم</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">SMS تلقائي</div>
                <div className="text-gray-600 dark:text-gray-300">إشعارات فورية</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                <BarChart2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">طابور ذكي</div>
                <div className="text-gray-600 dark:text-gray-300">مراقبة الانتظار</div>
              </div>
            </div>
          </div>
        </div>

        {/* Innovation Highlight */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Wrench className="w-5 h-5" />
            <span className="font-bold">الأول من نوعه في المنطقة</span>
          </div>
          <p className="text-sm opacity-90">
            نظام ثوري يجمع بين التتبع الذكي والطوابير التفاعلية مع الإشعارات التلقائية
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServiceProvidersHero;
