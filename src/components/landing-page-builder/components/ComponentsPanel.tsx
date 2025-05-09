import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PlusSquare, BookOpen, Sparkles, Settings, Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ComponentSelector from '../ComponentSelector';
import RecentlyUsedComponents from './RecentlyUsedComponents';
import { useRecentComponents } from '../hooks/useRecentComponents';

interface ComponentsPanelProps {
  onAddComponent: (type: string) => void;
}

const ComponentsPanel: React.FC<ComponentsPanelProps> = ({ onAddComponent }) => {
  const { t } = useTranslation();
  const { recentComponents, addToRecent, clearRecentComponents } = useRecentComponents();
  const [showTips, setShowTips] = useState(true);
  
  // مدمج لإضافة المكونات وتسجيلها في المستخدمة مؤخرًا
  const handleAddComponent = (type: string) => {
    onAddComponent(type);
    addToRecent(type);
  };

  // إغلاق نصائح المستخدم
  const handleCloseTips = () => {
    setShowTips(false);
    localStorage.setItem('hide-component-tips', 'true');
  };

  // التحقق من حالة النصائح عند التحميل
  React.useEffect(() => {
    if (localStorage.getItem('hide-component-tips') === 'true') {
      setShowTips(false);
    }
  }, []);

  return (
    <motion.div 
      className="h-full"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b bg-card flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary/10 rounded-md flex items-center justify-center text-primary">
              <PlusSquare size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-lg">{t('المكونات المتاحة')}</h2>
              <p className="text-xs text-muted-foreground">{t('اختر وأضف مكونات لصفحتك')}</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => setShowTips(!showTips)}
              title={t('نصائح الاستخدام')}
            >
              <Bell size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => clearRecentComponents()}
              title={t('مسح العناصر المستخدمة مؤخرًا')}
            >
              <Settings size={16} />
            </Button>
          </div>
        </div>
        
        {/* نصائح مفيدة للمستخدم - قابلة للإغلاق */}
        {showTips && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="relative border-b bg-primary/5 px-4 py-3 flex-shrink-0"
          >
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={handleCloseTips}
            >
              <X size={14} />
            </Button>

            <div className="flex items-start gap-2">
              <BookOpen size={18} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium">{t('تعليمات سريعة')}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {t('اسحب وأفلت المكونات لتغيير ترتيبها. انقر على أي مكون لتعديل محتواه وإعداداته.')}
                </p>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* المحتوى الرئيسي مع القدرة على التمرير */}
        <ScrollArea className="flex-grow">
          <div className="p-4 pt-4 flex flex-col">
            {/* العناصر الموصى بها */}
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles size={16} className="text-amber-500" />
                <h3 className="font-medium text-sm">{t('موصى بها')}</h3>
              </div>
              
              <div className={cn(
                "grid gap-2",
                "grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
              )}>
                {['hero', 'form'].map(type => (
                  <motion.div
                    key={type}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      "rounded-lg p-3 cursor-pointer border flex flex-col items-center justify-center text-center h-[100px]",
                      "bg-gradient-to-br",
                      type === 'hero' && "from-blue-50 to-blue-100 border-blue-200 hover:border-blue-300",
                      type === 'form' && "from-amber-50 to-amber-100 border-amber-200 hover:border-amber-300",
                    )}
                    onClick={() => handleAddComponent(type)}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full mb-2 flex items-center justify-center",
                      type === 'hero' && "bg-blue-100 text-blue-600",
                      type === 'form' && "bg-amber-100 text-amber-600",
                    )}>
                      {type === 'hero' && <PlusSquare size={20} />}
                      {type === 'form' && <BookOpen size={20} />}
                    </div>
                    <span className="font-medium text-sm">{t(type)}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            
            {/* خط فاصل */}
            <Separator className="my-4" />
            
            {/* المكونات المستخدمة مؤخرًا */}
            <RecentlyUsedComponents 
              recentComponents={recentComponents} 
              onAddComponent={handleAddComponent} 
            />
            
            {/* جميع المكونات المتاحة */}
            <ComponentSelector onAddComponent={handleAddComponent} />
          </div>
        </ScrollArea>
      </Card>
    </motion.div>
  );
};

export default ComponentsPanel; 