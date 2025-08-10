import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import ModuleNavigation from '@/components/courses/ModuleNavigation';
import { tiktokAdsModule4Data } from '@/data/tiktokAdsModule4Data';
import { Play, CheckCircle, Clock, Target, Eye, MousePointer, Video, Heart, Smartphone, Users, ShoppingCart } from 'lucide-react';

const TikTokAdsModule4: React.FC = () => {
  const navigate = useNavigate();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [completedVideos, setCompletedVideos] = useState<number[]>([]);
  const [isVideoCompleted, setIsVideoCompleted] = useState(false);

  const currentVideo = tiktokAdsModule4Data.videos[currentVideoIndex];
  const storageKey = 'tiktok-ads-module-4-completed-videos';

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
    if (currentVideoIndex < tiktokAdsModule4Data.videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  const previousVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  const campaignObjectives = [
    { name: 'Reach', icon: Eye, color: 'text-blue-500', description: 'زيادة الوعي بالعلامة التجارية' },
    { name: 'Traffic', icon: MousePointer, color: 'text-green-500', description: 'جذب الزيارات للموقع' },
    { name: 'Video Views', icon: Video, color: 'text-purple-500', description: 'زيادة مشاهدات الفيديو' },
    { name: 'Community Interaction', icon: Heart, color: 'text-red-500', description: 'تعزيز التفاعل' },
    { name: 'App Promotion', icon: Smartphone, color: 'text-indigo-500', description: 'ترويج التطبيقات' },
    { name: 'Lead Generation', icon: Users, color: 'text-orange-500', description: 'جمع بيانات العملاء' },
    { name: 'Website Conversions', icon: ShoppingCart, color: 'text-emerald-500', description: 'زيادة المبيعات' }
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Module Header */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-xl">
              <Target className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                المحور {tiktokAdsModule4Data.moduleNumber}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {tiktokAdsModule4Data.title}
              </h1>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {tiktokAdsModule4Data.description}
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <Play className="w-4 h-4" />
              <span>{tiktokAdsModule4Data.totalVideos} فيديوهات</span>
            </div>
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <Clock className="w-4 h-4" />
              <span>{tiktokAdsModule4Data.estimatedDuration}</span>
            </div>
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="w-4 h-4" />
              <span>{completedVideos.length} / {tiktokAdsModule4Data.totalVideos} مكتمل</span>
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
                    
                    {currentVideoIndex < tiktokAdsModule4Data.videos.length - 1 && (
                      <button
                        onClick={nextVideo}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
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
                  {completedVideos.length} من {tiktokAdsModule4Data.videos.length} مكتمل
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${(completedVideos.length / tiktokAdsModule4Data.videos.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {tiktokAdsModule4Data.videos.map((video, index) => (
                  <button
                    key={video.id}
                    onClick={() => goToVideo(index)}
                    className={`w-full p-4 text-right hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      currentVideoIndex === index ? 'bg-green-50 dark:bg-green-900/20 border-r-4 border-green-500' : ''
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
                          currentVideoIndex === index ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'
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

            {/* Campaign Objectives Overview */}
            <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800 p-4 mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">أهداف الحملة</h4>
              </div>
              <div className="space-y-2">
                {campaignObjectives.map((objective, index) => {
                  const Icon = objective.icon;
                  return (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <Icon className={`w-3 h-3 ${objective.color}`} />
                      <span className="font-medium text-gray-900 dark:text-white">{objective.name}</span>
                      <span className="text-gray-500 dark:text-gray-400">- {objective.description}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Objective Selection Tips */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4 mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">نصائح اختيار الهدف</h4>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <div>• ابدأ بأهداف الوعي للعلامات الجديدة</div>
                <div>• استخدم Traffic لزيادة زيارات الموقع</div>
                <div>• اختر Conversions للمبيعات</div>
                <div>• Video Views مناسب للمحتوى التعليمي</div>
                <div>• Lead Generation لجمع بيانات العملاء</div>
              </div>
            </div>
          </div>
        </div>

        {/* Module Navigation */}
        <ModuleNavigation 
          currentModule={4}
          totalModules={8}
          courseSlug="tiktok-marketing"
          completedVideos={completedVideos.length}
          totalVideos={tiktokAdsModule4Data.totalVideos}
        />
      </div>
    </Layout>
  );
};

export default TikTokAdsModule4;
