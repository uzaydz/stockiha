import React from 'react';
import { Wrench, QrCode, MessageSquare, Clock, Gift, PlayCircle, GraduationCap, Users, Smartphone, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { serviceProvidersCourseData } from '@/data/serviceProvidersCourseData';

const ServiceProvidersHero: React.FC = () => {
  const handleStartCourse = () => {
    const modulesSection = document.getElementById('course-modules');
    if (modulesSection) {
      modulesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <div className="text-center max-w-4xl mx-auto">
        {/* Free Badge */}
        <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-md px-3 py-1.5 mb-4">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
          <span className="text-xs text-green-700 font-medium">دورة مجانية تماماً</span>
          <Gift className="w-3.5 h-3.5 text-green-600" />
        </div>

        {/* Logo */}
        <div className="flex justify-center items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Wrench className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-blue-600">
            سطوكيها
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl md:text-2xl font-bold text-foreground mb-3 leading-tight">
          {serviceProvidersCourseData.title}
        </h1>

        {/* Subtitle */}
        <p className="text-sm text-muted-foreground mb-6 max-w-2xl mx-auto">
          نظام متطور لإدارة مقدمي الخدمات
        </p>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-2xl mx-auto">
          {serviceProvidersCourseData.description}
        </p>

        {/* Target Audience */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {serviceProvidersCourseData.targetAudience.map((audience, index) => (
            <div key={index} className="inline-flex items-center gap-1.5 bg-muted text-muted-foreground px-3 py-1.5 rounded-md text-xs font-medium">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              {audience}
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 max-w-lg mx-auto">
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-50 rounded-md flex items-center justify-center mx-auto mb-1.5">
              <PlayCircle className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-lg font-bold text-foreground">{serviceProvidersCourseData.totalVideos}</div>
            <div className="text-xs text-muted-foreground">فيديو</div>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 bg-purple-50 rounded-md flex items-center justify-center mx-auto mb-1.5">
              <Clock className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-lg font-bold text-foreground">{serviceProvidersCourseData.totalDuration}</div>
            <div className="text-xs text-muted-foreground">محتوى</div>
          </div>
          <div className="text-center md:col-span-1 col-span-2">
            <div className="w-8 h-8 bg-green-50 rounded-md flex items-center justify-center mx-auto mb-1.5">
              <BarChart2 className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-lg font-bold text-foreground">{serviceProvidersCourseData.modules.length}</div>
            <div className="text-xs text-muted-foreground">محور</div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Button
            onClick={handleStartCourse}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 text-sm font-semibold rounded-md"
          >
            <PlayCircle className="w-4 h-4 mr-1.5" />
            ابدأ الدورة الآن
          </Button>

          <Button
            variant="outline"
            className="border-border text-foreground hover:bg-muted px-5 py-2.5 text-sm font-semibold rounded-md"
          >
            <GraduationCap className="w-4 h-4 mr-1.5" />
            مخصصة لمقدمي الخدمات
          </Button>
        </div>

        {/* Key Features */}
        <div className="mt-6 bg-muted rounded-md p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center justify-center gap-2">
            <Wrench className="w-4 h-4 text-blue-500" />
            مميزات النظام المتطور
          </h3>
          <div className="grid md:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-50 rounded-md flex items-center justify-center flex-shrink-0">
                <QrCode className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-foreground">تتبع ذكي</div>
                <div className="text-muted-foreground">باركود + رقم</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-purple-50 rounded-md flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <div>
                <div className="font-medium text-foreground">SMS تلقائي</div>
                <div className="text-muted-foreground">إشعارات فورية</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-50 rounded-md flex items-center justify-center flex-shrink-0">
                <BarChart2 className="w-3.5 h-3.5 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-foreground">طابور ذكي</div>
                <div className="text-muted-foreground">مراقبة الانتظار</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceProvidersHero;



