import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import ModuleNavigation from '@/components/courses/ModuleNavigation';
import { eCommerceModule2Data } from '@/data/eCommerceModule2Data';
import { Play, CheckCircle, Clock, Truck, Smartphone, Target, Lightbulb } from 'lucide-react';

const ECommerceModule2: React.FC = () => {
  const navigate = useNavigate();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [completedVideos, setCompletedVideos] = useState<number[]>([]);
  const [isVideoCompleted, setIsVideoCompleted] = useState(false);

  const currentVideo = eCommerceModule2Data.videos[currentVideoIndex];
  const storageKey = 'ecommerce-module-2-completed-videos';

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
    if (currentVideoIndex < eCommerceModule2Data.videos.length - 1) {
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
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl">
              <Target className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                المحور {eCommerceModule2Data.moduleNumber}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {eCommerceModule2Data.title}
              </h1>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {eCommerceModule2Data.description}
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Play className="w-4 h-4" />
              <span>{eCommerceModule2Data.totalVideos} فيديوهات</span>
            </div>
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Clock className="w-4 h-4" />
              <span>{eCommerceModule2Data.estimatedDuration}</span>
            </div>
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <CheckCircle className="w-4 h-4" />
              <span>{completedVideos.length} / {eCommerceModule2Data.totalVideos} مكتمل</span>
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
                    
                    {currentVideoIndex < eCommerceModule2Data.videos.length - 1 && (
                      <button
                        onClick={nextVideo}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
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
                  {completedVideos.length} من {eCommerceModule2Data.videos.length} مكتمل
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(completedVideos.length / eCommerceModule2Data.videos.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {eCommerceModule2Data.videos.map((video, index) => (
                  <button
                    key={video.id}
                    onClick={() => goToVideo(index)}
                    className={`w-full p-4 text-right hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      currentVideoIndex === index ? 'bg-blue-50 dark:bg-blue-900/20 border-r-4 border-blue-500' : ''
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
                          currentVideoIndex === index ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
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

            {/* Tools & Apps */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4 mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">أدوات وتطبيقات</h4>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <div>• تطبيقات إدارة التجارة</div>
                <div>• أدوات تحليل المنافسين</div>
                <div>• تطبيقات التصوير والتحرير</div>
                <div>• أدوات التسويق الرقمي</div>
              </div>
            </div>

            {/* Delivery Services */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800 p-4 mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">شركات التوصيل</h4>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <div>• شركة ياليدين</div>
                <div>• شركة إيكو تراك</div>
                <div>• شركة بروكوليس</div>
                <div>• مقارنة الأسعار والخدمات</div>
              </div>
            </div>

            {/* Business Strategy */}
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4 mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">استراتيجيات العمل</h4>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <div>• اختيار المنتجات الرابحة</div>
                <div>• التفوق على المنافسة</div>
                <div>• وضع خطة عمل شاملة</div>
                <div>• التجسس على المنافسين</div>
              </div>
            </div>
          </div>
        </div>

        {/* Completion Badge */}
        {completedVideos.length === eCommerceModule2Data.totalVideos && (
          <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              <h3 className="text-xl font-bold text-green-800 dark:text-green-300">
                مبروك! أكملت دورة التجارة الإلكترونية
              </h3>
            </div>
            <p className="text-green-700 dark:text-green-300 mb-4">
              لقد أنهيت جميع محاور الدورة بنجاح! الآن أصبحت مستعداً لبدء تجارتك الإلكترونية في الجزائر.
            </p>
          </div>
        )}

        {/* Module Navigation */}
        <ModuleNavigation 
          currentModule={2}
          totalModules={2}
          courseSlug="e-commerce"
          completedVideos={completedVideos.length}
          totalVideos={eCommerceModule2Data.totalVideos}
        />
      </div>
    </POSPureLayout>
  );
};

export default ECommerceModule2;
