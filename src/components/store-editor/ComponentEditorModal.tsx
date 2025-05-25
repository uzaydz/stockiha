import React, { useState } from 'react';
import { StoreComponent } from '@/types/store-editor';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Settings, Eye, EyeOff, Monitor, Smartphone, Tablet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ComponentEditor from './ComponentEditor';
import ComponentPreview from './preview/ComponentPreview';

// أيقونات المكونات مع ألوان
const componentIcons: Record<string, { icon: string; color: string; bgColor: string }> = {
  hero: { icon: '🌟', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  category_section: { icon: '📂', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200' },
  product_categories: { icon: '🏷️', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200' },
  featured_products: { icon: '⭐', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200' },
  testimonials: { icon: '💬', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200' },
  about: { icon: '📖', color: 'text-cyan-700', bgColor: 'bg-cyan-50 border-cyan-200' },
  countdownoffers: { icon: '⏰', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
  services: { icon: '🛠️', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
  contact: { icon: '📞', color: 'text-indigo-700', bgColor: 'bg-indigo-50 border-indigo-200' },
  footer: { icon: '🔗', color: 'text-gray-700', bgColor: 'bg-gray-50 border-gray-200' }
};

// أسماء المكونات بالعربية
const componentNames: Record<string, string> = {
  hero: 'القسم الرئيسي',
  category_section: 'قسم الفئات',
  product_categories: 'فئات المنتجات',
  featured_products: 'المنتجات المميزة',
  testimonials: 'آراء العملاء',
  about: 'عن المتجر',
  countdownoffers: 'العروض المحدودة',
  services: 'الخدمات',
  contact: 'اتصل بنا',
  footer: 'التذييل'
};

interface ComponentEditorModalProps {
  component: StoreComponent;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (settings: any) => void;
  onToggleActive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const ComponentEditorModal: React.FC<ComponentEditorModalProps> = ({
  component,
  isOpen,
  onClose,
  onUpdate,
  onToggleActive,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState('settings');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const componentConfig = componentIcons[component.type] || { 
    icon: '📦', 
    color: 'text-gray-700', 
    bgColor: 'bg-gray-50 border-gray-200' 
  };

  const componentName = componentNames[component.type] || component.type;

  const deviceClasses = {
    desktop: 'w-full max-w-none',
    tablet: 'w-[768px] mx-auto',
    mobile: 'w-[375px] mx-auto'
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-muted/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center text-lg border",
                componentConfig.bgColor
              )}>
                {componentConfig.icon}
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  تحرير {componentName}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={cn("text-xs", componentConfig.bgColor)}>
                    {component.type}
                  </Badge>
                  <Badge 
                    variant={component.isActive ? "default" : "secondary"} 
                    className="text-xs"
                  >
                    {component.isActive ? (
                      <>
                        <Eye className="w-3 h-3 mr-1" />
                        ظاهر
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3 mr-1" />
                        مخفي
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {onToggleActive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleActive(component.id)}
                  className="h-8"
                >
                  {component.isActive ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      إخفاء
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      إظهار
                    </>
                  )}
                </Button>
              )}
              
              {onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    onDelete(component.id);
                    onClose();
                  }}
                  className="h-8"
                >
                  حذف
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="flex-1 flex flex-col"
          >
            {/* Tabs Navigation */}
            <div className="px-6 py-3 border-b bg-background/50 flex-shrink-0">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  إعدادات المكون
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  معاينة
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tabs Content */}
            <div className="flex-1 overflow-hidden">
              <TabsContent value="settings" className="m-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-6">
                    <ComponentEditor
                      component={component}
                      onUpdate={onUpdate}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="preview" className="m-0 h-full">
                <div className="h-full flex flex-col">
                  {/* Device Selector */}
                  <div className="px-6 py-3 border-b bg-muted/10 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">معاينة:</span>
                      <div className="flex items-center border rounded-lg p-1 bg-background">
                        <Button
                          variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setPreviewDevice('desktop')}
                          className="h-7 px-2"
                        >
                          <Monitor className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={previewDevice === 'tablet' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setPreviewDevice('tablet')}
                          className="h-7 px-2"
                        >
                          <Tablet className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setPreviewDevice('mobile')}
                          className="h-7 px-2"
                        >
                          <Smartphone className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Preview Area */}
                  <ScrollArea className="flex-1 bg-muted/5">
                    <div className="p-6">
                      <div className={cn(
                        "transition-all duration-300 border rounded-lg bg-background min-h-[400px] overflow-hidden",
                        deviceClasses[previewDevice]
                      )}>
                        <ComponentPreview 
                          type={component.type} 
                          settings={component.settings} 
                        />
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ComponentEditorModal; 