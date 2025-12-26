import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Play, Lock, CheckCircle, Clock, ChevronRight, ChevronLeft,
    Menu, X, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { TikTokModule, TikTokLesson } from '@/data/tiktok-ads';
import { getCourseEntryPath } from '@/lib/courseRoutes';

interface TikTokAdsPlayerProps {
    module: TikTokModule;
    currentLessonIndex: number;
    onLessonChange: (index: number) => void;
    onNextModule?: () => void;
    onPrevModule?: () => void;
    hasNextModule?: boolean;
    hasPrevModule?: boolean;
}

const TikTokAdsPlayer: React.FC<TikTokAdsPlayerProps> = ({
    module,
    currentLessonIndex,
    onLessonChange,
    onNextModule,
    onPrevModule,
    hasNextModule,
    hasPrevModule
}) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const currentLesson = module.lessons[currentLessonIndex];
    const navigate = useNavigate();

    // Toggle sidebar on mobile
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    // Styling constants - TikTok branding with pink/red theme
    const theme = {
        primary: 'text-pink-600 dark:text-pink-500',
        primaryBg: 'bg-pink-600 dark:bg-pink-500',
        primaryBorder: 'border-pink-600 dark:border-pink-500',
        // Backgrounds
        mainBg: 'bg-background',
        cardBg: 'bg-card',
        sidebarBg: 'bg-muted/30 dark:bg-card',
        // Borders
        borderColor: 'border-border',
        // Text
        textPrimary: 'text-foreground',
        textSecondary: 'text-muted-foreground',
        headingColor: 'text-foreground',
    };

    return (
        <div className={`flex flex-col h-full ${theme.mainBg} ${theme.textPrimary} overflow-hidden font-sans`}>

            {/* Top Navigation Bar / Sub-Header */}
	            <header className={`h-16 border-b ${theme.borderColor} bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 z-20 shrink-0`}>
	                <div className="flex items-center gap-4">
	                    <Button variant="ghost" size="icon" onClick={() => navigate(getCourseEntryPath('tiktok-ads'))} title="العودة للدورة">
	                        <ChevronRight className="w-5 h-5 rtl:rotate-180 text-muted-foreground hover:text-pink-500 transition-colors" />
	                    </Button>

                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-pink-500 uppercase tracking-wider">تيك توك أدس</span>
                        <h1 className={`text-sm md:text-base font-bold ${theme.headingColor} truncate max-w-[200px] md:max-w-md`}>
                            {module.title}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="hidden md:flex gap-2 text-muted-foreground hover:text-pink-500"
                        onClick={toggleSidebar}
                    >
                        <Menu className="w-4 h-4" />
                        <span>قائمة الدروس</span>
                    </Button>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* Helper for Sidebar overlapping on mobile */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Video Player Section */}
                <main className="flex-1 flex flex-col relative overflow-y-auto w-full bg-black/5 dark:bg-background">
                    <div className="flex-1 bg-black flex items-center justify-center relative group min-h-[300px] md:min-h-0 shadow-lg">

                        {currentLesson.status === 'ready' && currentLesson.videoUrl ? (
                            /* Video Player Placeholder */
                            <div className="w-full h-full relative">
                                {/* Using dangerouslySetInnerHTML for embed code compatibility */}
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                                    <div
                                        dangerouslySetInnerHTML={{ __html: currentLesson.videoUrl }}
                                        className="w-full h-full"
                                    />
                                </div>
                            </div>
                        ) : (
                            /* Coming Soon Teaser Card */
                            <div className="flex flex-col items-center justify-center text-center p-8 max-w-md animate-in fade-in zoom-in duration-500">
                                <div className="w-20 h-20 rounded-full bg-slate-800/50 border border-slate-700 flex items-center justify-center mb-6 relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/20 to-transparent" />
                                    <Clock className="w-8 h-8 text-pink-500 animate-pulse" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">الدرس قادم قريباً</h3>
                                <p className="text-slate-400 mb-6 leading-relaxed">
                                    نعمل حالياً على إعداد هذا الدرس بجودة سينمائية تليق بك.
                                    <br />
                                    سيتم إتاحته للمشاهدة في أقرب وقت.
                                </p>
                                <Button variant="outline" className="border-pink-500/30 text-pink-400 hover:bg-pink-500/10 hover:text-pink-300 gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    تفعيل التنبيهات لهذا الدرس
                                </Button>
                            </div>
                        )}

                    </div>

                    {/* Lesson Info & Controls */}
                    <div className={`p-6 ${theme.mainBg} border-t ${theme.borderColor} shrink-0`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <div>
                                <h2 className={`text-xl md:text-2xl font-bold ${theme.headingColor} mb-2`}>{currentLesson.title}</h2>
                                <p className={`${theme.textSecondary} text-sm max-w-2xl`}>{currentLesson.description}</p>
                            </div>

                            <div className="flex gap-2 shrink-0">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        if (currentLessonIndex === 0 && hasPrevModule && onPrevModule) {
                                            onPrevModule();
                                        } else {
                                            onLessonChange(Math.max(0, currentLessonIndex - 1));
                                        }
                                    }}
                                    disabled={currentLessonIndex === 0 && !hasPrevModule}
                                    className="gap-2"
                                >
                                    <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                                    السابق
                                </Button>
                                <Button
                                    onClick={() => {
                                        // Mark as complete logic would go here
                                        if (currentLessonIndex < module.lessons.length - 1) {
                                            onLessonChange(currentLessonIndex + 1);
                                        } else if (hasNextModule && onNextModule) {
                                            onNextModule();
                                        }
                                    }}
                                    disabled={currentLessonIndex === module.lessons.length - 1 && !hasNextModule}
                                    className={`${theme.primaryBg} hover:opacity-90 text-white min-w-[120px] gap-2`}
                                >
                                    {currentLessonIndex === module.lessons.length - 1 ? 'إنهاء الوحدة' : 'الدرس التالي'}
                                    <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Sidebar Playlist */}
                <aside
                    className={cn(
                        `fixed md:static inset-y-0 left-0 w-80 z-40 transform transition-transform duration-300 ease-in-out border-l ${theme.borderColor} flex flex-col`,
                        theme.sidebarBg,
                        isSidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0 md:w-0 md:border-none md:overflow-hidden"
                    )}
                >
                    <div className={`p-4 border-b ${theme.borderColor} flex items-center justify-between shrink-0`}>
                        <h3 className={`font-bold ${theme.headingColor}`}>محتويات الوحدة</h3>
                        <span className="text-xs text-muted-foreground bg-accent px-2 py-1 rounded-full">{currentLessonIndex + 1} / {module.lessons.length}</span>
                        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-1">
                            {module.lessons.map((lesson, idx) => {
                                const isActive = idx === currentLessonIndex;
                                const isLocked = false; // logic for locking if needed

                                return (
                                    <div
                                        key={lesson.id}
                                        onClick={() => {
                                            if (isSidebarOpen && window.innerWidth < 768) setIsSidebarOpen(false);
                                            onLessonChange(idx);
                                        }}
                                        className={cn(
                                            "group relative flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border border-transparent",
                                            isActive
                                                ? "bg-pink-500/10 border-pink-500/20"
                                                : "hover:bg-accent hover:text-accent-foreground border-transparent",
                                        )}
                                    >
                                        {/* Status Icon */}
                                        <div className="shrink-0 mt-1">
                                            {isActive ? (
                                                <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center shadow-lg shadow-pink-500/40">
                                                    <Play className="w-2.5 h-2.5 text-white fill-current" />
                                                </div>
                                            ) : lesson.status === 'ready' ? (
                                                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center group-hover:border-primary">
                                                    <span className="text-[10px] text-muted-foreground font-bold group-hover:text-primary">{idx + 1}</span>
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 rounded-full border border-dashed border-muted-foreground/40 flex items-center justify-center">
                                                    <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className={cn(
                                                "text-sm font-medium mb-1 line-clamp-2 transition-colors",
                                                isActive ? "text-pink-500 dark:text-pink-400" : "text-foreground/80 group-hover:text-foreground"
                                            )}>
                                                {lesson.title}
                                            </h4>

                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                {lesson.status === 'coming-soon' ? (
                                                    <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 border-muted text-muted-foreground">قريباً</Badge>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{lesson.duration}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Active Indicator Bar */}
                                        {isActive && (
                                            <div className="absolute right-0 top-2 bottom-2 w-1 bg-pink-500 rounded-l-full shadow-[0_0_10px_rgba(236,72,153,0.5)]" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </aside>

            </div>
        </div>
    );
};

export default TikTokAdsPlayer;
