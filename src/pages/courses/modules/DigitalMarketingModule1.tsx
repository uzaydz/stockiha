import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { ArrowLeft, PlayCircle, Clock, CheckCircle, ChevronLeft, ChevronRight, LayoutList, MonitorPlay } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { module1Data } from '@/data/digitalMarketingModule1Data';
import ModuleNavigation from '@/components/courses/ModuleNavigation';
import type { Video } from '@/data/digitalMarketingModule1Data';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const DigitalMarketingModule1: React.FC = () => {
  const navigate = useNavigate();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [completedVideos, setCompletedVideos] = useState<Set<number>>(new Set());
  const [isVideoLoaded, setIsVideoLoaded] = useState(true);

  const currentVideo = module1Data.videos[currentVideoIndex];
  const progress = (completedVideos.size / module1Data.videos.length) * 100;

  // Load progress
  useEffect(() => {
    const savedProgress = localStorage.getItem('module1_progress');
    if (savedProgress) {
      setCompletedVideos(new Set(JSON.parse(savedProgress)));
    }
  }, []);

  // Save progress
  useEffect(() => {
    localStorage.setItem('module1_progress', JSON.stringify([...completedVideos]));
  }, [completedVideos]);

  const handleVideoComplete = (videoId: number) => {
    setCompletedVideos(prev => new Set([...prev, videoId]));
  };

  const handleNextVideo = () => {
    if (currentVideoIndex < module1Data.videos.length - 1) {
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
      <div className="flex flex-col h-screen bg-white dark:bg-[#020408] text-slate-800 dark:text-slate-100 overflow-hidden font-sans">

        {/* Top Bar for Learning Mode */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#09090b] z-20 shrink-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard/courses-operations/digital-marketing')}
              className="text-slate-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-800 gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>خروج</span>
            </Button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden md:block" />
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 max-w-[200px] md:max-w-md">
                {module1Data.title}
              </h1>
              <span className="text-[10px] text-slate-400">الوحدة 1 من 12</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">تقدمك</span>
                <span className="text-xs font-bold text-orange-600 dark:text-orange-500">{Math.round(progress)}%</span>
              </div>
              <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </header>

        {/* Main Learning Area */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left: Video Player & Main Content */}
          <div className="flex-1 flex flex-col overflow-y-auto relative no-scrollbar bg-slate-50 dark:bg-[#020408]">
            <div className="w-full max-w-6xl mx-auto p-4 md:p-8 flex flex-col gap-6">

              {/* Video Wrapper */}
              <div className="w-full bg-black rounded-2xl overflow-hidden shadow-2xl relative group aspect-video border border-slate-900/5 dark:border-slate-800">
                {isVideoLoaded ? (
                  <div
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{ __html: currentVideo.embedCode }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Controls & Title */}
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                      {currentVideo.title}
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5"><MonitorPlay className="w-4 h-4" /> الدرس {currentVideoIndex + 1}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {currentVideo.duration}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => handleVideoComplete(currentVideo.id)}
                      size="lg"
                      className={cn(
                        "rounded-full gap-2 transition-all",
                        completedVideos.has(currentVideo.id)
                          ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20"
                          : "bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20"
                      )}
                    >
                      {completedVideos.has(currentVideo.id) ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span>مكتمل</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span>إكمال الدرس</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Description Box */}
                {currentVideo.description && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">ملاحظات الدرس</h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {currentVideo.description}
                    </p>
                  </div>
                )}

                {/* Prev/Next Navigation */}
                <div className="flex items-center justify-between pt-6 mt-4 border-t border-slate-200 dark:border-slate-800/50">
                  <Button
                    variant="outline"
                    onClick={handlePreviousVideo}
                    disabled={currentVideoIndex === 0}
                    className="gap-2 h-11"
                  >
                    <ChevronRight className="w-4 h-4" />
                    الدرس السابق
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleNextVideo}
                    disabled={currentVideoIndex === module1Data.videos.length - 1}
                    className="gap-2 h-11"
                  >
                    الدرس التالي
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Playlist Sidebar */}
          <div className="w-80 md:w-96 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0c10] flex flex-col shrink-0">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <LayoutList className="w-4 h-4 text-orange-500" />
                قائمة الدروس
              </h3>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-3 flex flex-col gap-2">
                {module1Data.videos.map((video, index) => {
                  const isActive = index === currentVideoIndex;
                  const isCompleted = completedVideos.has(video.id);

                  return (
                    <button
                      key={video.id}
                      onClick={() => selectVideo(index)}
                      className={cn(
                        "group flex items-start text-right gap-3 p-3 rounded-lg transition-all duration-200 border border-transparent",
                        isActive
                          ? "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20"
                          : "hover:bg-slate-50 dark:hover:bg-slate-900"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5",
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isActive ? "bg-orange-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      )}>
                        {isCompleted ? <CheckCircle className="w-3.5 h-3.5 fill-current" /> : index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className={cn(
                          "text-sm font-medium leading-snug mb-1 transition-colors",
                          isActive ? "text-slate-900 dark:text-orange-100" : "text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200"
                        )}>
                          {video.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {video.duration}
                        </span>
                      </div>

                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 shrink-0 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </POSPureLayout>
  );
};

export default DigitalMarketingModule1;
