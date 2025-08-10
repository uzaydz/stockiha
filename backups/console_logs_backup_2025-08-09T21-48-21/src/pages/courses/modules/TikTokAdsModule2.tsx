import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import ModuleNavigation from '@/components/courses/ModuleNavigation';
import { tiktokAdsModule2Data } from '@/data/tiktokAdsModule2Data';
import { Play, CheckCircle, Clock, Users, Target, Star, DollarSign, Settings } from 'lucide-react';

const TikTokAdsModule2: React.FC = () => {
  const navigate = useNavigate();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [completedVideos, setCompletedVideos] = useState<number[]>([]);
  const [isVideoCompleted, setIsVideoCompleted] = useState(false);

  const currentVideo = tiktokAdsModule2Data.videos[currentVideoIndex];
  const storageKey = 'tiktok-ads-module-2-completed-videos';

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
    if (currentVideoIndex < tiktokAdsModule2Data.videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  const previousVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Module Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl">
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                المحور {tiktokAdsModule2Data.moduleNumber}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {tiktokAdsModule2Data.title}
              </h1>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {tiktokAdsModule2Data.description}
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Play className="w-4 h-4" />
              <span>{tiktokAdsModule2Data.totalVideos} فيديوهات</span>
            </div>
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Clock className="w-4 h-4" />
              <span>{tiktokAdsModule2Data.estimatedDuration}</span>
            </div>
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <CheckCircle className="w-4 h-4" />
              <span>{completedVideos.length} / {tiktokAdsModule2Data.totalVideos} مكتمل</span>
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

                {/* Agency Accounts Information - Shows only for videos 3 and 4 */}
                {(currentVideo.id === 3 || currentVideo.id === 4) && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                        <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">
                        مواقع تستطيع طلب منها حسابات تيك توك وفيسبوك أجونسي
                      </h3>
                    </div>

                    {/* Important Notice */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <div className="bg-yellow-100 dark:bg-yellow-900/30 p-1 rounded">
                          <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                            ملاحظة مهمة - اقرأ كل شيء هنا بتمعن
                          </h4>
                          <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2">
                            <p>جميع المواقع التي نوصي بها قد تمت تجربتها من قبل فريقنا لفترة طويلة وحققنا من خلالها نتائج جيدة. ومع ذلك، لا يمكننا تقديم أي ضمانات تتعلق بمستقبل هذه المواقع أو استمرارية أدائها بنفس المستوى، لأن الأمور قد تتغير مع الوقت، ولأننا لا نستطيع التحكم في سياسات هذه المواقع أو نوايا القائمين عليها.</p>
                            <p className="font-medium">لذلك، نرجو منكم التعامل بحذر وذكاء عند استخدام هذه المواقع.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Safety Tips */}
                    <div className="grid md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <h5 className="font-semibold text-gray-900 dark:text-white">ابدأ بمبالغ صغيرة</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          اختبر الخدمات التي يقدمونها قبل الالتزام بمبالغ أكبر.
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <h5 className="font-semibold text-gray-900 dark:text-white">تابع باستمرار</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          راقب أداء الحسابات والتعاملات بانتظام لتجنب أي مفاجآت غير متوقعة.
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          <h5 className="font-semibold text-gray-900 dark:text-white">لا تعتمد على موقع واحد</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          التنويع يقلل من المخاطر ويمنحك خيارات إضافية في حال حدثت تغييرات.
                        </p>
                      </div>
                    </div>

                    {/* Agency Accounts Websites */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                        حسابات تيك توك وفيسبوك أجونسي:
                      </h4>
                      <div className="grid md:grid-cols-2 gap-3">
                        {[
                          'https://luban.bluemediagroup.cn',
                          'https://ads.hdedu.net/register',
                          'https://volecom.com',
                          'https://yinolink.com',
                          'https://huntmobi.com',
                          'https://pandamobo.com',
                          'https://meetsocial.com',
                          'https://cifnews.com',
                          'https://wezonet.com',
                          'https://tec-do.com/en',
                          'https://empowerwin.com',
                          'https://overseas.cmcm.com',
                          'https://kimiagency.com'
                        ].map((url, index) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                          >
                            <span className="text-sm text-blue-600 dark:text-blue-400 font-mono">
                              {index + 1}. {url}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* China Phone Number Service */}
                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                        * شركات توفر أرقام هواتف صينية:
                      </h4>
                      <a
                        href="http://www.getsmscode.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 font-mono text-sm hover:underline"
                      >
                        http://www.getsmscode.com
                      </a>
                    </div>

                    {/* Final Note */}
                    <div className="mt-4 text-center">
                      <p className="text-sm text-blue-700 dark:text-blue-300 italic">
                        هدفنا هو مساعدتك على النجاح، ولكن تبقى مسؤوليتك الأساسية هي التعامل بحذر وإدارة مخاطر الاستثمار بشكل مدروس.
                      </p>
                    </div>
                  </div>
                )}
                
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
                    
                    {currentVideoIndex < tiktokAdsModule2Data.videos.length - 1 && (
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
                  {completedVideos.length} من {tiktokAdsModule2Data.videos.length} مكتمل
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(completedVideos.length / tiktokAdsModule2Data.videos.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {tiktokAdsModule2Data.videos.map((video, index) => (
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

            {/* Agency Account Benefits */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4 mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">مميزات حسابات Agency</h4>
              </div>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <li className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span>حدود إنفاق أعلى</span>
                </li>
                <li className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-purple-500" />
                  <span>صلاحيات متقدمة</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>إدارة عدة حسابات</span>
                </li>
                <li className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-500" />
                  <span>خيارات استهداف متطورة</span>
                </li>
              </ul>
            </div>

            {/* Important Resources */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4 mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">روابط مهمة</h4>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-3">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white mb-1">حساب Agency بـ 2$:</div>
                  <div className="text-xs bg-white dark:bg-gray-800 p-2 rounded border">
                    واتساب: +84 33 572 2983
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white mb-1">إضافة Chrome:</div>
                  <div className="text-xs bg-white dark:bg-gray-800 p-2 rounded border">
                    Add Balance Extension
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white mb-1">صلاحية الإضافة بـ 4$:</div>
                  <div className="text-xs bg-white dark:bg-gray-800 p-2 rounded border">
                    تواصل مع المطور
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Module Navigation */}
        <ModuleNavigation 
          currentModule={2}
          totalModules={8}
          courseSlug="tiktok-marketing"
          completedVideos={completedVideos.length}
          totalVideos={tiktokAdsModule2Data.totalVideos}
        />
      </div>
    </Layout>
  );
};

export default TikTokAdsModule2;
