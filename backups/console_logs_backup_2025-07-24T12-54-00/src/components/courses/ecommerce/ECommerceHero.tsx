import React from 'react';
import { Store, TruckIcon, CreditCard, Users, Gift, PlayCircle, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { eCommerceAlgeriaCourseData } from '@/data/eCommerceAlgeriaCourseData';

const ECommerceHero: React.FC = () => {
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
        
        <div className="flex justify-center items-center gap-3 mb-4">
          <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-lg">
            <Store className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-lg">
            <TruckIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-lg">
            <CreditCard className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          {eCommerceAlgeriaCourseData.title}
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-3xl mx-auto">
          {eCommerceAlgeriaCourseData.description}
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {eCommerceAlgeriaCourseData.targetAudience.map((audience, index) => (
            <span key={index} className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm">
              <Users className="w-3 h-3" />
              {audience}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              +{eCommerceAlgeriaCourseData.totalVideos}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">فيديو</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {eCommerceAlgeriaCourseData.totalDuration}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">من المحتوى</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {eCommerceAlgeriaCourseData.modules.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">محور</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">COD</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">دفع عند الاستلام</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Button
            onClick={handleStartCourse}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-2"
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            ابدأ الدورة الآن
          </Button>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <GraduationCap className="w-4 h-4" />
            <span className="text-sm">متخصصة في السوق الجزائري</span>
          </div>
        </div>

        {/* Key Features */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300">
              <Store className="w-4 h-4 text-blue-500" />
              <span>إنشاء متجر مع سطوكيها</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300">
              <TruckIcon className="w-4 h-4 text-green-500" />
              <span>شركات التوصيل الجزائرية</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300">
              <CreditCard className="w-4 h-4 text-orange-500" />
              <span>الدفع عند الاستلام</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ECommerceHero; 