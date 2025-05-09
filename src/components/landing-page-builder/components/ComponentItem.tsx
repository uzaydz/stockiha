import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Image, FileText, LayoutGrid, MessageSquare, Heart, Plus, CheckCircle2 } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

interface ComponentItemProps {
  type: string;
  onClick: () => void;
  isPopular?: boolean;
  isRecent?: boolean;
  isSelected?: boolean;
}

const getComponentIcon = (type: string) => {
  switch (type) {
    case 'hero':
      return <Layers className="h-5 w-5" />;
    case 'form':
      return <FileText className="h-5 w-5" />;
    case 'text':
      return <FileText className="h-5 w-5" />;
    case 'image':
      return <Image className="h-5 w-5" />;
    case 'features':
      return <LayoutGrid className="h-5 w-5" />;
    case 'testimonial':
      return <MessageSquare className="h-5 w-5" />;
    default:
      return <Layers className="h-5 w-5" />;
  }
};

const getComponentColor = (type: string) => {
  switch (type) {
    case 'hero':
      return {
        bg: "bg-blue-100",
        text: "text-blue-600",
        border: "border-blue-200",
        hoverBorder: "hover:border-blue-300",
        gradient: "from-blue-50 to-blue-100",
        hoverGradient: "hover:from-blue-100 hover:to-blue-50",
      };
    case 'form':
      return {
        bg: "bg-amber-100",
        text: "text-amber-600",
        border: "border-amber-200",
        hoverBorder: "hover:border-amber-300",
        gradient: "from-amber-50 to-amber-100",
        hoverGradient: "hover:from-amber-100 hover:to-amber-50",
      };
    case 'text':
      return {
        bg: "bg-green-100",
        text: "text-green-600",
        border: "border-green-200",
        hoverBorder: "hover:border-green-300",
        gradient: "from-green-50 to-green-100",
        hoverGradient: "hover:from-green-100 hover:to-green-50",
      };
    case 'image':
      return {
        bg: "bg-violet-100",
        text: "text-violet-600",
        border: "border-violet-200",
        hoverBorder: "hover:border-violet-300",
        gradient: "from-violet-50 to-violet-100",
        hoverGradient: "hover:from-violet-100 hover:to-violet-50",
      };
    case 'features':
      return {
        bg: "bg-pink-100",
        text: "text-pink-600",
        border: "border-pink-200",
        hoverBorder: "hover:border-pink-300",
        gradient: "from-pink-50 to-pink-100",
        hoverGradient: "hover:from-pink-100 hover:to-pink-50",
      };
    case 'testimonial':
      return {
        bg: "bg-orange-100",
        text: "text-orange-600",
        border: "border-orange-200",
        hoverBorder: "hover:border-orange-300",
        gradient: "from-orange-50 to-orange-100",
        hoverGradient: "hover:from-orange-100 hover:to-orange-50",
      };
    default:
      return {
        bg: "bg-primary/10",
        text: "text-primary",
        border: "border-primary/20",
        hoverBorder: "hover:border-primary/40",
        gradient: "from-primary/5 to-primary/10",
        hoverGradient: "hover:from-primary/10 hover:to-primary/5",
      };
  }
};

const getComponentPreview = (type: string) => {
  const colors = getComponentColor(type);
  
  switch (type) {
    case 'hero':
      return (
        <div className={cn("bg-gradient-to-r rounded-md w-full h-20 md:h-24 flex items-center justify-center p-2 overflow-hidden", colors.gradient)}>
          <div className="w-1/2 flex flex-col items-start gap-1 px-2">
            <motion.div 
              initial={{ width: "80%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              className="h-2.5 bg-foreground/50 rounded-sm"
            />
            <motion.div 
              initial={{ width: "60%" }}
              animate={{ width: "85%" }}
              transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.1 }}
              className="h-2 bg-foreground/40 rounded-sm"
            />
            <div className={cn("h-5 w-12 rounded-sm mt-1 flex items-center justify-center", colors.bg)}>
              <div className="h-2 w-6 bg-background/80 rounded-sm"></div>
            </div>
          </div>
          <div className="w-1/3 h-14 md:h-16 bg-background/80 rounded-sm ml-2 flex items-center justify-center">
            <Image className={cn("h-6 w-6", colors.text, "opacity-30")} strokeWidth={1.5} />
          </div>
        </div>
      );
    case 'form':
      return (
        <div className="bg-muted/50 rounded-md w-full h-20 md:h-24 flex flex-col items-center justify-center p-2">
          <div className="h-2.5 w-24 bg-foreground/50 rounded-sm mb-2"></div>
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [-1, 1, -1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="h-6 w-full bg-background rounded-sm mb-2 flex items-center px-2 border-2 border-transparent focus-within:border-amber-200"
          >
            <div className="h-2 w-1/3 bg-foreground/20 rounded-sm"></div>
          </motion.div>
          <div className="h-6 w-full bg-background rounded-sm mb-2"></div>
          <div className={cn("h-4 w-16 rounded-sm self-end flex items-center justify-center", colors.bg)}>
            <div className="h-1.5 w-8 bg-background/80 rounded-sm"></div>
          </div>
        </div>
      );
    case 'text':
      return (
        <div className="bg-muted/30 rounded-md w-full h-20 md:h-24 flex flex-col items-center justify-center p-2">
          <motion.div 
            initial={{ width: "90%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            className="h-2 w-full bg-foreground/40 rounded-sm mb-1.5"
          />
          <motion.div 
            initial={{ width: "80%" }}
            animate={{ width: "95%" }}
            transition={{ duration: 2.3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.1 }}
            className="h-2 w-full bg-foreground/40 rounded-sm mb-1.5"
          />
          <motion.div 
            initial={{ width: "70%" }}
            animate={{ width: "90%" }}
            transition={{ duration: 2.7, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.2 }}
            className="h-2 w-4/5 bg-foreground/40 rounded-sm mb-1.5"
          />
          <motion.div 
            initial={{ width: "60%" }}
            animate={{ width: "85%" }}
            transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.3 }}
            className="h-2 w-3/4 bg-foreground/40 rounded-sm"
          />
        </div>
      );
    case 'image':
      return (
        <div className="bg-muted/30 rounded-md w-full h-20 md:h-24 flex items-center justify-center overflow-hidden">
          <div className={cn("h-16 md:h-20 w-full rounded-sm flex items-center justify-center relative", colors.gradient)}>
            <Image className={cn("h-8 w-8", colors.text, "opacity-70")} strokeWidth={1.5} />
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 200, opacity: 0.5 }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
      );
    case 'features':
      return (
        <div className="bg-muted/30 rounded-md w-full h-20 md:h-24 flex flex-col p-2">
          <div className="h-2.5 w-24 bg-foreground/50 rounded-sm mx-auto mb-2"></div>
          <div className="flex gap-2 justify-between mt-1 flex-1">
            <motion.div 
              className={cn("h-full flex-1 rounded-sm flex flex-col items-center justify-center gap-1", colors.bg, "opacity-80")}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <div className={cn("h-5 w-5 rounded-full flex items-center justify-center", colors.bg)}>
                <div className="h-2 w-2 bg-background/80 rounded-full"></div>
              </div>
              <div className="h-1.5 w-10 bg-foreground/40 rounded-sm"></div>
              <div className="h-1.5 w-8 bg-foreground/30 rounded-sm"></div>
            </motion.div>
            <motion.div 
              className={cn("h-full flex-1 rounded-sm flex flex-col items-center justify-center gap-1", colors.bg, "opacity-60")}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <div className={cn("h-5 w-5 rounded-full flex items-center justify-center", colors.bg)}>
                <div className="h-2 w-2 bg-background/80 rounded-full"></div>
              </div>
              <div className="h-1.5 w-10 bg-foreground/40 rounded-sm"></div>
              <div className="h-1.5 w-8 bg-foreground/30 rounded-sm"></div>
            </motion.div>
            <motion.div 
              className={cn("h-full flex-1 rounded-sm flex flex-col items-center justify-center gap-1", colors.bg, "opacity-40")}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <div className={cn("h-5 w-5 rounded-full flex items-center justify-center", colors.bg)}>
                <div className="h-2 w-2 bg-background/80 rounded-full"></div>
              </div>
              <div className="h-1.5 w-10 bg-foreground/40 rounded-sm"></div>
              <div className="h-1.5 w-8 bg-foreground/30 rounded-sm"></div>
            </motion.div>
          </div>
        </div>
      );
    case 'testimonial':
      return (
        <div className="bg-muted/30 rounded-md w-full h-20 md:h-24 flex items-center justify-center p-2 overflow-hidden">
          <div className="h-full flex-grow flex items-center">
            <div className="h-full w-14 flex flex-col items-center mr-3">
              <motion.div 
                initial={{ scale: 1 }}
                animate={{ scale: 1.1 }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                className={cn("h-8 w-8 rounded-full mb-1 flex items-center justify-center", colors.bg)}
              >
                <Heart className={cn("h-4 w-4", colors.text)} />
              </motion.div>
              <div className="h-1.5 w-10 bg-foreground/40 rounded-sm"></div>
            </div>
            <div className="h-full flex-1 flex flex-col justify-center">
              <div className="h-1.5 w-full bg-foreground/40 rounded-sm mb-1.5"></div>
              <div className="h-1.5 w-full bg-foreground/40 rounded-sm mb-1.5"></div>
              <div className="h-1.5 w-2/3 bg-foreground/40 rounded-sm"></div>
            </div>
          </div>
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 200, opacity: 0.3 }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      );
    default:
      return <div className="bg-muted rounded-md w-full h-20 md:h-24"></div>;
  }
};

const getComponentDescription = (type: string, t: any) => {
  switch (type) {
    case 'hero':
      return t('مكون ترويجي كبير يظهر في أعلى الصفحة مع صورة ونص وزر دعوة للعمل');
    case 'form':
      return t('نموذج للتواصل أو الحصول على معلومات من الزائر');
    case 'text':
      return t('مكون نصي قابل للتحرير لعرض محتوى مختلف');
    case 'image':
      return t('مكون لعرض صورة مع خيارات متعددة للتنسيق');
    case 'features':
      return t('مكون لعرض ميزات المنتج أو الخدمة على شكل شبكة');
    case 'testimonial':
      return t('مكون لعرض آراء العملاء وتقييماتهم');
    default:
      return t('مكون عام');
  }
};

const ComponentItem: React.FC<ComponentItemProps> = ({ 
  type, 
  onClick, 
  isPopular, 
  isRecent = false,
  isSelected = false
}) => {
  const { t } = useTranslation();
  const colors = getComponentColor(type);
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <motion.div 
            className={cn(
              "relative overflow-hidden border rounded-xl shadow-sm transition-all",
              "hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5",
              "active:translate-y-0 active:shadow-sm cursor-pointer",
              "flex flex-col h-full",
              isSelected && "ring-2 ring-primary/60 border-primary/40",
              colors.border,
              colors.hoverBorder
            )}
            onClick={onClick}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            layout
          >
            <AnimatePresence>
              {isPopular && (
                <Badge 
                  variant="default" 
                  className="absolute top-2 right-2 z-10 bg-primary/80 hover:bg-primary/70"
                >
                  {t('شائع')}
                </Badge>
              )}
              
              {isRecent && !isPopular && (
                <Badge 
                  variant="outline" 
                  className="absolute top-2 right-2 z-10 border-primary/30 text-primary/90"
                >
                  {t('حديث')}
                </Badge>
              )}
              
              {isSelected && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-2 left-2 z-10 text-primary"
                >
                  <CheckCircle2 size={18} className="fill-primary/20" />
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Header */}
            <div className={cn(
              "border-b p-3 flex justify-between items-center",
              "bg-gradient-to-r",
              colors.gradient
            )}>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-md flex items-center justify-center",
                  colors.bg,
                  colors.text
                )}>
                  {getComponentIcon(type)}
                </div>
                <span className="font-medium">{t(type)}</span>
              </div>
              
              <motion.div
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center cursor-pointer",
                  colors.bg,
                  colors.text
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                <Plus size={16} />
              </motion.div>
            </div>
            
            {/* Preview */}
            <div className="p-3 flex-grow flex items-center justify-center relative overflow-hidden">
              {getComponentPreview(type)}
              
              {/* Hover overlay with animated gradient */}
              <motion.div 
                className={cn(
                  "absolute inset-0 flex items-center justify-center opacity-0",
                  "bg-gradient-to-t from-background/70 to-transparent"
                )}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div 
                  className={cn(
                    "rounded-full px-3 py-1 text-sm font-medium flex items-center gap-1.5",
                    colors.bg,
                    colors.text
                  )}
                  initial={{ scale: 0.9, opacity: 0 }}
                  whileHover={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.1 }}
                >
                  <Plus size={14} />
                  {t('إضافة')}
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="right" align="center" className="max-w-xs p-3">
          <div className="space-y-1">
            <p className="font-medium text-sm">{t(type)}</p>
            <p className="text-xs text-muted-foreground">{getComponentDescription(type, t)}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ComponentItem; 