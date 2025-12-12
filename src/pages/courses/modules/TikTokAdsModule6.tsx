import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import ModuleNavigation from '@/components/courses/ModuleNavigation';
import { tiktokAdsModule6Data } from '@/data/tiktokAdsModule6Data';
import { Play, CheckCircle, Clock, Palette, Brain, Layers } from 'lucide-react';

const TikTokAdsModule6: React.FC = () => {
  const navigate = useNavigate();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [completedVideos, setCompletedVideos] = useState<number[]>([]);
  const [isVideoCompleted, setIsVideoCompleted] = useState(false);

  const currentVideo = tiktokAdsModule6Data.videos[currentVideoIndex];
  const storageKey = 'tiktok-ads-module-6-completed-videos';

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
    if (currentVideoIndex < tiktokAdsModule6Data.videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  const previousVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  return (
    <POSPureLayout>
      <div className="container mx-auto px-4 py-6 max-w-6xl" dir="rtl">
        {/* Module Header */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-xl">
              <Palette className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <div className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                المحور {tiktokAdsModule6Data.moduleNumber}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {tiktokAdsModule6Data.title}
              </h1>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {tiktokAdsModule6Data.description}
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
              <Play className="w-4 h-4" />
              <span>{tiktokAdsModule6Data.totalVideos} فيديوهات</span>
            </div>
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
              <Clock className="w-4 h-4" />
              <span>{tiktokAdsModule6Data.estimatedDuration}</span>
            </div>
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
              <CheckCircle className="w-4 h-4" />
              <span>{completedVideos.length} / {tiktokAdsModule6Data.totalVideos} مكتمل</span>
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
                    
                    {currentVideoIndex < tiktokAdsModule6Data.videos.length - 1 && (
                      <button
                        onClick={nextVideo}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
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
                  {completedVideos.length} من {tiktokAdsModule6Data.videos.length} مكتمل
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${(completedVideos.length / tiktokAdsModule6Data.videos.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {tiktokAdsModule6Data.videos.map((video, index) => (
                  <button
                    key={video.id}
                    onClick={() => goToVideo(index)}
                    className={`w-full p-4 text-right hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      currentVideoIndex === index ? 'bg-indigo-50 dark:bg-indigo-900/20 border-r-4 border-indigo-500' : ''
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
                          currentVideoIndex === index ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-white'
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

            {/* Smart Creative Features */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 p-4 mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">مميزات الإبداع الذكي</h4>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <div>• إنتاج إعلانات تلقائية</div>
                <div>• تكيف مع الجمهور المستهدف</div>
                <div>• تحسين باستخدام الذكاء الاصطناعي</div>
                <div>• اختبار نسخ مختلفة تلقائياً</div>
              </div>
            </div>

            {/* Ad Set Tips */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4 mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">نصائح مجموعة الإعلانات</h4>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <div>• راجع أهدافك قبل إعداد الإعلان</div>
                <div>• استخدم الإبداع الذكي للمبتدئين</div>
                <div>• نظم إعلاناتك في مجموعات منطقية</div>
                <div>• تابع الأداء وحسن باستمرار</div>
              </div>
            </div>
          </div>
        </div>

        {/* Module Navigation */}
        <ModuleNavigation 
          currentModule={6}
          totalModules={8}
          courseSlug="tiktok-marketing"
          completedVideos={completedVideos.length}
          totalVideos={tiktokAdsModule6Data.totalVideos}
        />
      </div>
    </POSPureLayout>
  );
};

export default TikTokAdsModule6;
