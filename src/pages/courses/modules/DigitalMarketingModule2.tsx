import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { ArrowRight, PlayCircle, Clock, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { module2Data } from '@/data/digitalMarketingModule2Data';
import ModuleNavigation from '@/components/courses/ModuleNavigation';
import type { Video } from '@/data/digitalMarketingModule2Data';

const DigitalMarketingModule2: React.FC = () => {
  const navigate = useNavigate();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [completedVideos, setCompletedVideos] = useState<Set<number>>(new Set());
  const [isVideoLoaded, setIsVideoLoaded] = useState(true);

  const currentVideo = module2Data.videos[currentVideoIndex];
  const progress = (completedVideos.size / module2Data.videos.length) * 100;

  // حفظ التقدم في localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('module2_progress');
    if (savedProgress) {
      setCompletedVideos(new Set(JSON.parse(savedProgress)));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('module2_progress', JSON.stringify([...completedVideos]));
  }, [completedVideos]);

  const handleVideoComplete = (videoId: number) => {
    setCompletedVideos(prev => new Set([...prev, videoId]));
  };

  const handleNextVideo = () => {
    if (currentVideoIndex < module2Data.videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
      setIsVideoLoaded(false);
      setTimeout(() => setIsVideoLoaded(true), 100);
    }
  };

  const handlePreviousVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
      setIsVideoLoaded(false);
      setTimeout(() => setIsVideoLoaded(true), 100);
    }
  };

  const selectVideo = (index: number) => {
    setCurrentVideoIndex(index);
    setIsVideoLoaded(false);
    setTimeout(() => setIsVideoLoaded(true), 100);
  };

  return (
    <POSPureLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl" dir="rtl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard/courses-operations/digital-marketing')}
              className="flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              العودة إلى الدورة
            </Button>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {module2Data.title}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mb-3">
                  {module2Data.description}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <PlayCircle className="w-4 h-4" />
                    <span>{module2Data.totalVideos} فيديو</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{module2Data.totalDuration}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-center lg:text-right">
                <div className="text-2xl font-bold text-primary mb-1">
                  {Math.round(progress)}%
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  مكتمل
                </div>
                <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Video Info */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {currentVideo.title}
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <span>الفيديو {currentVideoIndex + 1} من {module2Data.videos.length}</span>
                      {currentVideo.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {currentVideo.duration}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {completedVideos.has(currentVideo.id) && (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        مكتمل
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Video Container */}
              <div className="relative">
                {isVideoLoaded && (
                  <div 
                    className="w-full"
                    dangerouslySetInnerHTML={{ __html: currentVideo.embedCode }}
                  />
                )}
                {!isVideoLoaded && (
                  <div className="w-full h-64 md:h-80 lg:h-96 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>

              {/* Video Controls */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePreviousVideo}
                    disabled={currentVideoIndex === 0}
                    className="flex items-center gap-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                    السابق
                  </Button>

                  <Button
                    onClick={() => handleVideoComplete(currentVideo.id)}
                    className={`px-6 ${
                      completedVideos.has(currentVideo.id) 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-primary hover:bg-primary/90'
                    } text-white`}
                  >
                    {completedVideos.has(currentVideo.id) ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        مكتمل
                      </>
                    ) : (
                      'تم المشاهدة'
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleNextVideo}
                    disabled={currentVideoIndex === module2Data.videos.length - 1}
                    className="flex items-center gap-2"
                  >
                    التالي
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Video Description */}
              {currentVideo.description && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    عن هذا الفيديو
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {currentVideo.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Video Playlist */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  محتويات المحور
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {completedVideos.size} من {module2Data.videos.length} مكتمل
                </p>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {module2Data.videos.map((video, index) => (
                  <div
                    key={video.id}
                    onClick={() => selectVideo(index)}
                    className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors ${
                      index === currentVideoIndex
                        ? 'bg-primary/10 border-r-2 border-r-primary'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">
                          {index + 1}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">
                          {video.title}
                        </h4>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            {video.duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {video.duration}
                              </span>
                            )}
                          </div>
                          
                          {completedVideos.has(video.id) && (
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation between modules */}
        <ModuleNavigation 
          currentModule={2} 
          totalModules={12} 
          courseSlug="digital-marketing"
          completedVideos={completedVideos.size}
          totalVideos={module2Data.videos.length}
        />
      </div>
    </POSPureLayout>
  );
};

export default DigitalMarketingModule2;
