import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import ModuleNavigation from '@/components/courses/ModuleNavigation';
import { tiktokAdsModule8Data } from '@/data/tiktokAdsModule8Data';
import { Play, CheckCircle, Clock, Code, Users, ShoppingBag, Target } from 'lucide-react';

const TikTokAdsModule8: React.FC = () => {
  const navigate = useNavigate();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [completedVideos, setCompletedVideos] = useState<number[]>([]);
  const [isVideoCompleted, setIsVideoCompleted] = useState(false);

  const currentVideo = tiktokAdsModule8Data.videos[currentVideoIndex];
  const storageKey = 'tiktok-ads-module-8-completed-videos';

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
    if (currentVideoIndex < tiktokAdsModule8Data.videos.length - 1) {
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
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-xl">
              <Code className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                المحور {tiktokAdsModule8Data.moduleNumber} - الختامي
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {tiktokAdsModule8Data.title}
              </h1>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {tiktokAdsModule8Data.description}
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <Play className="w-4 h-4" />
              <span>{tiktokAdsModule8Data.totalVideos} فيديوهات</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <Clock className="w-4 h-4" />
              <span>{tiktokAdsModule8Data.estimatedDuration}</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <CheckCircle className="w-4 h-4" />
              <span>{completedVideos.length} / {tiktokAdsModule8Data.totalVideos} مكتمل</span>
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
                    
                    {currentVideoIndex < tiktokAdsModule8Data.videos.length - 1 && (
                      <button
                        onClick={nextVideo}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
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
                  {completedVideos.length} من {tiktokAdsModule8Data.videos.length} مكتمل
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-emerald-600 h-2 rounded-full transition-all"
                    style={{ width: `${(completedVideos.length / tiktokAdsModule8Data.videos.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {tiktokAdsModule8Data.videos.map((video, index) => (
                  <button
                    key={video.id}
                    onClick={() => goToVideo(index)}
                    className={`w-full p-4 text-right hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      currentVideoIndex === index ? 'bg-emerald-50 dark:bg-emerald-900/20 border-r-4 border-emerald-500' : ''
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
                          currentVideoIndex === index ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-900 dark:text-white'
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

            {/* Pixel Benefits */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 p-4 mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Code className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">فوائد البكسل</h4>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <div>• تتبع دقيق للتحويلات</div>
                <div>• تحسين الاستهداف التلقائي</div>
                <div>• قياس ROI بشكل صحيح</div>
                <div>• إنشاء جماهير مخصصة</div>
              </div>
            </div>

            {/* Custom Audiences */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4 mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">الجماهير المخصصة</h4>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <div>• زوار الموقع (Website Visitors)</div>
                <div>• عملاء حاليون (Customer Lists)</div>
                <div>• متفاعلون مع الفيديو</div>
                <div>• الجمهور المشابه (Lookalike)</div>
              </div>
            </div>

            {/* Shopify Integration */}
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4 mt-6">
              <div className="flex items-center gap-2 mb-3">
                <ShoppingBag className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">تكامل شوبيفاي</h4>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <div>• تتبع المبيعات التلقائي</div>
                <div>• تحليل سلوك المشترين</div>
                <div>• تحسين حملات التجارة الإلكترونية</div>
                <div>• تزامن البيانات المباشر</div>
              </div>
            </div>
          </div>
        </div>

        {/* Completion Badge */}
        {completedVideos.length === tiktokAdsModule8Data.totalVideos && (
          <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              <h3 className="text-xl font-bold text-green-800 dark:text-green-300">
                مبروك! أكملت المحور الأخير من دورة تيك توك أدس
              </h3>
            </div>
            <p className="text-green-700 dark:text-green-300 mb-4">
              لقد أنهيت جميع محاور الدورة بنجاح! الآن أصبحت قادراً على إنشاء وإدارة حملات إعلانية احترافية على تيك توك.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Target className="w-4 h-4" />
              <span>ابدأ الآن في تطبيق ما تعلمته وحقق نجاحك في التسويق الرقمي!</span>
            </div>
          </div>
        )}

        {/* Module Navigation */}
        <ModuleNavigation 
          currentModule={8}
          totalModules={8}
          courseSlug="tiktok-marketing"
          completedVideos={completedVideos.length}
          totalVideos={tiktokAdsModule8Data.totalVideos}
        />
      </div>
    </POSPureLayout>
  );
};

export default TikTokAdsModule8;
