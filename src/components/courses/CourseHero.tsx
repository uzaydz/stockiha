import React from 'react';
import { PlayCircle, Clock, Users, Award, Gift, CheckCircle2, ArrowLeft, LayoutGrid, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface HeroFeature {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  color?: string;
  bgColor?: string;
}

interface CourseHeroProps {
  title: string;
  description: string;
  duration: string;
  videosCount: number;
  modulesCount: number;
  level?: string;
  isFree?: boolean;
  targetAudience?: string[];
  features?: HeroFeature[];
  icon?: React.ElementType;
  iconColor?: string;
  gradient?: string;
  image?: string;
  onStartCourse?: () => void;
}

const CourseHero: React.FC<CourseHeroProps> = ({
  title,
  description,
  duration,
  videosCount,
  modulesCount,
  level,
  isFree = false,
  targetAudience = [],
  features = [],
  icon: Icon,
  iconColor = "text-primary",
  gradient = "from-slate-800 to-slate-950",
  image,
  onStartCourse
}) => {
  const handleStart = () => {
    if (onStartCourse) {
      onStartCourse();
    } else {
      const modulesSection = document.getElementById('course-modules');
      if (modulesSection) {
        modulesSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl mb-8 group">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        {image && (
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover opacity-20 group-hover:scale-105 transition-transform duration-1000"
          />
        )}
        <div className={cn("absolute inset-0 opacity-95 bg-gradient-to-br", gradient)} />
        
        {/* Abstract Shapes */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-black/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-8 md:p-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 md:items-start">
            
            {/* Left Content */}
            <div className="flex-1 text-center md:text-right space-y-6">
              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                {isFree && (
                  <Badge variant="secondary" className="bg-green-500/20 text-green-100 hover:bg-green-500/30 border-0 px-3 py-1">
                    <Gift className="w-3.5 h-3.5 mr-1.5" />
                    دورة مجانية
                  </Badge>
                )}
                {level && (
                  <Badge variant="outline" className="border-white/20 text-white/90 px-3 py-1">
                    {level}
                  </Badge>
                )}
              </div>

              {/* Title & Icon */}
              <div className="space-y-4">
                <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight tracking-tight">
                  {title}
                </h1>
                <p className="text-lg text-white/80 leading-relaxed max-w-2xl">
                  {description}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 py-6 border-y border-white/10 w-full max-w-lg mx-auto md:mx-0">
                <div className="text-center p-3 rounded-xl bg-white/5 backdrop-blur-sm">
                  <div className="mb-2 flex justify-center">
                    <Video className="w-6 h-6 text-orange-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{videosCount}</div>
                  <div className="text-xs text-white/60">فيديو</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/5 backdrop-blur-sm">
                  <div className="mb-2 flex justify-center">
                    <Clock className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{duration}</div>
                  <div className="text-xs text-white/60">ساعة</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/5 backdrop-blur-sm">
                  <div className="mb-2 flex justify-center">
                    <LayoutGrid className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{modulesCount}</div>
                  <div className="text-xs text-white/60">محور</div>
                </div>
              </div>

              {/* CTA & Audience */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-center md:justify-start">
                <Button 
                  size="lg" 
                  onClick={handleStart}
                  className="bg-white text-slate-900 hover:bg-slate-100 font-bold text-base px-8 h-12 rounded-xl shadow-xl shadow-black/10 transition-all hover:scale-105 active:scale-95"
                >
                  <PlayCircle className="w-5 h-5 mr-2 fill-slate-900 text-white" />
                  ابدأ الدورة الآن
                </Button>
                
                {targetAudience.length > 0 && (
                  <div className="hidden md:flex items-center gap-2 text-sm text-white/60 px-4 bg-white/5 rounded-xl border border-white/5">
                    <Users className="w-4 h-4" />
                    <span>موجهة لـ: {targetAudience[0]}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Content - Features (Desktop Only) */}
            {features.length > 0 && (
              <div className="hidden lg:block w-80 flex-shrink-0">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-4">
                  <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
                    <Award className="w-5 h-5 text-yellow-400" />
                    مميزات الدورة
                  </h3>
                  <div className="space-y-3">
                    {features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-black/20 hover:bg-black/30 transition-colors">
                        <div className={cn("p-2 rounded-lg bg-white/10", feature.color)}>
                          <feature.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{feature.title}</div>
                          <div className="text-xs text-white/60">{feature.subtitle}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseHero;