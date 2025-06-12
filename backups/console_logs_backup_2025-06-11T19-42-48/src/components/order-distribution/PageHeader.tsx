import React from 'react';
import { Settings2, Info, CheckCircle2, Network, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PageHeaderProps {
  currentStep?: number;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ currentStep = 1 }) => {
  const steps = [
    { id: 1, title: 'اختيار الخطة', icon: <Network className="w-4 h-4" /> },
    { id: 2, title: 'ضبط الإعدادات', icon: <Settings2 className="w-4 h-4" /> },
    { id: 3, title: 'تفعيل الخطة', icon: <CheckCircle2 className="w-4 h-4" /> }
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
          إعدادات تقسيم الطلبيات
        </h1>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="border-dashed border-2 text-xs sm:text-sm">
            <ChevronRight className="w-4 h-4 ml-1" />
            العودة للطلبات
          </Button>
          <Button variant="default" size="sm" className="text-xs sm:text-sm bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
            تفعيل التوزيع التلقائي
            <ChevronLeft className="w-4 h-4 mr-1" />
          </Button>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`flex flex-col items-center ${step.id === currentStep ? 'text-primary' : 'text-muted-foreground'}`}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-1 border-2 ${
                        step.id === currentStep 
                          ? 'border-primary bg-primary/10' 
                          : step.id < currentStep 
                            ? 'border-green-500 bg-green-500/10 text-green-500' 
                            : 'border-muted-foreground/30 bg-muted/30'
                      }`}>
                        {step.id < currentStep ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : step.icon}
                      </div>
                      <span className="text-xs font-medium hidden sm:block">{step.title}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{step.title}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 rounded-full ${
                  index < currentStep - 1 
                    ? 'bg-green-500/50' 
                    : index === currentStep - 1 
                      ? 'bg-gradient-to-r from-green-500/50 to-muted-foreground/20' 
                      : 'bg-muted-foreground/20'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 sm:p-6 border-2 border-blue-200/50 dark:border-blue-800/30 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-full shadow-inner">
            <Settings2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-700 to-indigo-700 dark:from-blue-300 dark:to-indigo-300 bg-clip-text text-transparent mb-2">
              نظام التوزيع الذكي للطلبات
            </h2>
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              حدد نوع الخطة المناسبة لمؤسستك لتوزيع الطلبات الخاصة على الموظفين بطريقة أوتوماتيكية. 
              يتم تطبيق هذه الإعدادات في صفحة الطلبيات.
            </p>
            
            <div className="mt-4 flex items-start sm:items-center gap-2 text-xs sm:text-sm text-blue-700 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-900/20 p-3 rounded-lg">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 sm:mt-0" />
              <span>لا يتم التوزيع اليدوي في هذه الصفحة، جميع التوزيعات تتم بشكل تلقائي حسب الخطة المختارة.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};