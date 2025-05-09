import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import ComponentEditor from './ComponentEditor';
import CollapsibleSection from './components/CollapsibleSection';
import { Sliders, Settings, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LandingPageComponent } from './types';

interface ComponentEditorWrapperProps {
  component: LandingPageComponent;
  onUpdateSettings: (settings: Record<string, any>) => void;
}

const ComponentEditorWrapper: React.FC<ComponentEditorWrapperProps> = ({
  component,
  onUpdateSettings
}) => {
  const { t } = useTranslation();

  // Function to get component settings help text
  const getComponentHelpText = (type: string) => {
    switch (type) {
      case 'hero':
        return 'هذا المكون يستخدم لعرض بيانات قسم البداية الرئيسي لصفحتك';
      case 'form':
        return 'استخدم هذا المكون لإضافة نموذج الطلب للمنتج';
      case 'text':
        return 'مكون النص يستخدم لإضافة محتوى نصي قابل للتنسيق';
      case 'image':
        return 'إضافة صورة مع خيارات التنسيق المتقدمة';
      default:
        return 'قم بتعديل إعدادات المكون حسب احتياجاتك';
    }
  };

  return (
    <div className="space-y-6">
      {/* Component Type Header */}
      <div className="pb-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-md font-medium">
              {t(component.type)}
            </span>
            {!component.isActive && (
              <span className="px-3 py-1.5 bg-yellow-500/10 text-yellow-600 text-xs rounded-md font-medium">
                {t('مخفي')}
              </span>
            )}
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help p-1.5 rounded-full hover:bg-muted/50">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" align="center" className="max-w-xs">
                <p className="text-sm">{getComponentHelpText(component.type)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <h3 className="text-sm font-medium">{t('تحرير إعدادات الـ')} {t(component.type)}</h3>
      </div>
      
      {/* Component Settings Help */}
      <div className="bg-muted/20 rounded-lg p-4 text-sm text-muted-foreground border border-muted">
        <div className="flex items-start gap-2">
          <Settings className="h-5 w-5 text-primary/70 mt-0.5" />
          <p>{getComponentHelpText(component.type)}</p>
        </div>
      </div>
      
      {/* Enhanced Component Editor */}
      <div className="rounded-lg border">
        <ScrollArea className="max-h-[calc(100vh-320px)] min-h-[400px] p-2">
          <div className="p-3">
            <ComponentEditor 
              component={component} 
              onUpdateSettings={onUpdateSettings} 
            />
          </div>
        </ScrollArea>
      </div>
      
      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          {t('التغييرات تحفظ تلقائيًا عند إدخالها')}
        </p>
      </div>
    </div>
  );
};

export default ComponentEditorWrapper; 