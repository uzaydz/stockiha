import React from 'react';
import { Palette, Sparkles } from 'lucide-react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ColorPreview from './ColorPreview';

interface ColorFormHeaderProps {
  isEditing: boolean;
  colorName: string;
  colorCode: string;
  imageUrl?: string;
  price?: number;
  quantity?: number;
}

const ColorFormHeader: React.FC<ColorFormHeaderProps> = ({
  isEditing,
  colorName,
  colorCode,
  imageUrl,
  price,
  quantity,
}) => {
  return (
    <DialogHeader className="relative overflow-hidden border-b bg-gradient-to-br from-slate-50 via-white to-slate-50/80 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900/80">
      {/* خلفية متحركة */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-primary/5 to-primary/3 animate-pulse" />
      
      <div className="relative px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          {/* العنوان والوصف */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* أيقونة متحركة */}
            <div className="relative flex-shrink-0">
              <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl shadow-sm border border-primary/10 backdrop-blur-sm">
                <Palette className="h-6 w-6 text-primary" />
              </div>
              
              {/* نقطة متحركة */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-bounce">
                <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-75" />
              </div>
            </div>
            
            {/* النص */}
            <div className="space-y-2 flex-1 min-w-0">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                {isEditing ? 'تعديل اللون' : 'إضافة لون جديد'}
              </DialogTitle>
              
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {isEditing ? 'قم بتحديث معلومات اللون وخصائصه' : 'أضف لوناً جديداً مع تفاصيله الكاملة'}
              </p>
              
              {/* شريط التقدم للتعديل */}
              {isEditing && (
                <div className="flex items-center gap-2 mt-3">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full flex-1 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full animate-pulse w-3/4" />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">جاري التحديث</span>
                </div>
              )}
            </div>
          </div>
          
          {/* معاينة اللون */}
          <div className="flex-shrink-0">
            <div className="hidden sm:block">
              <ColorPreview
                name={colorName}
                colorCode={colorCode}
                imageUrl={imageUrl}
                price={price}
                quantity={quantity}
                size="md"
                showDetails={true}
                className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50 shadow-sm"
              />
            </div>
            
            {/* معاينة مبسطة للهاتف */}
            <div className="sm:hidden">
              <ColorPreview
                name={colorName}
                colorCode={colorCode}
                imageUrl={imageUrl}
                size="sm"
                showDetails={false}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-2 border border-slate-200/50 dark:border-slate-700/50"
              />
            </div>
          </div>
        </div>
        
        {/* شريط معلومات إضافي للهاتف */}
        <div className="sm:hidden mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-900 dark:text-slate-100 truncate flex-1">
              {colorName || 'اسم اللون'}
            </span>
            <span className="font-mono text-slate-500 dark:text-slate-400 ml-2">
              {colorCode}
            </span>
          </div>
          
          {(price !== undefined || quantity !== undefined) && (
            <div className="flex items-center gap-4 mt-2 text-xs">
              {price !== undefined && (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {price.toLocaleString()} دج
                </span>
              )}
              {quantity !== undefined && (
                <span className="text-slate-600 dark:text-slate-400">
                  الكمية: {quantity}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </DialogHeader>
  );
};

export default ColorFormHeader;
