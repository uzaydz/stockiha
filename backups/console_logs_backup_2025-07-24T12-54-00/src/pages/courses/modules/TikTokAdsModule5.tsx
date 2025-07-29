import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import ModuleNavigation from '@/components/courses/ModuleNavigation';
import { tiktokAdsModule5Data } from '@/data/tiktokAdsModule5Data';
import { Play, CheckCircle, Clock, Layers, Target, MapPin, Calendar, DollarSign, Users, Zap } from 'lucide-react';

const TikTokAdsModule5: React.FC = () => {
  const navigate = useNavigate();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [completedVideos, setCompletedVideos] = useState<number[]>([]);
  const [isVideoCompleted, setIsVideoCompleted] = useState(false);

  const currentVideo = tiktokAdsModule5Data.videos[currentVideoIndex];
  const storageKey = 'tiktok-ads-module-5-completed-videos';

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setCompletedVideos(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    const isCompleted = completedVideos.includes(currentVideo.id);
    setIsVideoCompleted(isCompleted);
  }, [currentVideoIndex, completedVideos, currentVideo.id]);

  const markVideoAsCompleted = () => {
    if (!completedVideos.includes(currentVideo.id)) {
      const newCompleted = [...completedVideos, currentVideo.id];
      setCompletedVideos(newCompleted);
      localStorage.setItem(storageKey, JSON.stringify(newCompleted));
      setIsVideoCompleted(true);
    }
  };

  const goToVideo = (index: number) => {
    setCurrentVideoIndex(index);
  };

  const nextVideo = () => {
    if (currentVideoIndex < tiktokAdsModule5Data.videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  const previousVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  const adGroupFeatures = [
    { name: 'الاستهداف', icon: Target, color: 'text-blue-500', description: 'تحديد الجمهور المناسب' },
    { name: 'المواضع', icon: MapPin, color: 'text-green-500', description: 'اختيار أماكن عرض الإعلانات' },
    { name: 'الجدولة', icon: Calendar, color: 'text-purple-500', description: 'ضبط أوقات العرض' },
    { name: 'الميزانية', icon: DollarSign, color: 'text-orange-500', description: 'إدارة التكاليف' },
    { name: 'التحسين', icon: Zap, color: 'text-red-500', description: 'تحسين الأداء' }
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Module Header */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-xl">
              <Layers className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                المحور {tiktokAdsModule5Data.moduleNumber}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {tiktokAdsModule5Data.title}
              </h1>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {tiktokAdsModule5Data.description}
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <Play className="w-4 h-4" />
              <span>{tiktokAdsModule5Data.totalVideos} فيديوهات</span>
            </div>
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <Clock className="w-4 h-4" />
              <span>{tiktokAdsModule5Data.estimatedDuration}</span>
            </div>
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <CheckCircle className="w-4 h-4" />
              <span>{completedVideos.length} / {tiktokAdsModule5Data.totalVideos} مكتمل</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Video Player */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Video Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {currentVideo.title}
                  </h2>
                  <div className="flex items-center gap-2">
                    {isVideoCompleted && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {currentVideo.duration}
                    </span>
                  </div>
                </div>
              </div>

              {/* Video Player */}
              <div className="aspect-video bg-gray-100 dark:bg-gray-700">
                <div 
                  dangerouslySetInnerHTML={{ __html: currentVideo.embedCode }}
                  className="w-full h-full"
                />
              </div>

              {/* Video Description */}
              <div className="p-4">
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                  {currentVideo.description}
                </p>
                
                {/* Video Actions */}
                <div className="flex flex-wrap gap-3">
                  {!isVideoCompleted && (
                    <button
                      onClick={markVideoAsCompleted}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      وضع علامة كمكتمل
                    </button>
                  )}
                  
                  <div className="flex gap-2">
                    {currentVideoIndex > 0 && (
                      <button
                        onClick={previousVideo}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                      >
                        الفيديو السابق
                      </button>
                    )}
                    
                    {currentVideoIndex < tiktokAdsModule5Data.videos.length - 1 && (
                      <button
                        onClick={nextVideo}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors"
                      >
                        الفيديو التالي
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Playlist Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  قائمة الفيديوهات
                </h3>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {completedVideos.length} من {tiktokAdsModule5Data.videos.length} مكتمل
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-orange-600 h-2 rounded-full transition-all"
                    style={{ width: `${(completedVideos.length / tiktokAdsModule5Data.videos.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {tiktokAdsModule5Data.videos.map((video, index) => (
                  <button
                    key={video.id}
                    onClick={() => goToVideo(index)}
                    className={`w-full p-4 text-right hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      currentVideoIndex === index ? 'bg-orange-50 dark:bg-orange-900/20 border-r-4 border-orange-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {completedVideos.includes(video.id) ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
                            <span className="text-xs text-gray-600 dark:text-gray-400">{index + 1}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-medium text-right ${
                          currentVideoIndex === index ? 'text-orange-700 dark:text-orange-300' : 'text-gray-900 dark:text-white'
                        }`}>
                          {video.title}
                        </h4>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                          {video.duration}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Ad Group Features */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800 p-4 mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">عناصر المجموعة الإعلانية</h4>
              </div>
              <div className="space-y-2">
                {adGroupFeatures.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <Icon className={`w-3 h-3 ${feature.color}`} />
                      <span className="font-medium text-gray-900 dark:text-white">{feature.name}</span>
                      <span className="text-gray-500 dark:text-gray-400">- {feature.description}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Campaign Types Comparison */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4 mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">نصائح المجموعة الإعلانية</h4>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <div>• استخدم مجموعات منفصلة لجماهير مختلفة</div>
                <div>• اختبر مواضع مختلفة في مجموعات منفصلة</div>
                <div>• حدد ميزانيات مناسبة لكل مجموعة</div>
                <div>• راقب الأداء وأوقف المجموعات الضعيفة</div>
              </div>
            </div>
          </div>
        </div>

        {/* Module Navigation */}
        <ModuleNavigation 
          currentModule={5}
          totalModules={8}
          courseSlug="tiktok-marketing"
          completedVideos={completedVideos.length}
          totalVideos={tiktokAdsModule5Data.totalVideos}
        />
      </div>
    </Layout>
  );
};

export default TikTokAdsModule5; 