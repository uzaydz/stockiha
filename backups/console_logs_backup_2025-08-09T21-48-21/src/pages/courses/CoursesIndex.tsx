import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { coursesList } from '@/data/coursesListData';
import { PlayCircle, Clock, BookOpen, Users, Badge as BadgeIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const CoursesIndex: React.FC = () => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'متاح': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'جديد': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'قريباً': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'مبتدئ': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'متوسط': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'متقدم': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'شامل': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            الدورات التعليمية
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            دورات تعليمية شاملة ومجانية مصممة خصيصاً لمشتركي سطوكيها وكتوبي
            لتطوير مهاراتكم في التسويق الرقمي والتجارة الإلكترونية
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {coursesList.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">دورة متاحة</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
            <PlayCircle className="w-8 h-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {coursesList.reduce((acc, course) => acc + course.totalVideos, 0)}+
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">فيديو تعليمي</div>
          </div>
                     <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
             <Clock className="w-8 h-8 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
             <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">45+</div>
             <div className="text-sm text-gray-500 dark:text-gray-400">ساعة محتوى</div>
           </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-orange-600 dark:text-orange-400" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">100%</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">مجاني</div>
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {coursesList.map((course) => (
            <div
              key={course.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow group"
            >
              {/* Course Header */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{course.icon}</div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getStatusColor(course.status)}>
                          {course.status}
                        </Badge>
                        {course.isFree && (
                          <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400">
                            مجاني
                          </Badge>
                        )}
                      </div>
                      <Badge className={getLevelColor(course.level)} variant="outline">
                        {course.level}
                      </Badge>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                
                <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 leading-relaxed">
                  {course.description}
                </p>

                {/* Course Stats */}
                <div className="flex items-center gap-4 mb-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <PlayCircle className="w-4 h-4" />
                    <span>{course.totalVideos} فيديو</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{course.totalDuration}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {course.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  {course.tags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                      +{course.tags.length - 3}
                    </span>
                  )}
                </div>

                {/* Target Audience */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {course.targetAudience.map((audience, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full text-xs"
                      >
                        <Users className="w-3 h-3" />
                        {audience}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  onClick={() => navigate(course.path)}
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  disabled={course.status === 'قريباً'}
                >
                  {course.status === 'قريباً' ? (
                    <>
                      <Clock className="w-4 h-4 mr-2" />
                      قريباً
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4 mr-2" />
                      ابدأ الدورة
                      <ArrowLeft className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            هل تريد المزيد من الدورات؟
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
            نحن نعمل باستمرار على إضافة دورات جديدة ومحدثة. 
            تابعنا لتكون أول من يعرف عن الدورات الجديدة.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={() => window.open('https://stockiha.com', '_blank')}>
              زيارة سطوكيها
            </Button>
            <Button variant="outline" onClick={() => window.open('https://kutubi.net', '_blank')}>
              زيارة كتوبي
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CoursesIndex;
