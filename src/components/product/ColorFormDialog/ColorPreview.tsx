import React from 'react';
import { Eye, Palette } from 'lucide-react';

interface ColorPreviewProps {
  name: string;
  colorCode: string;
  imageUrl?: string;
  price?: number;
  quantity?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

const ColorPreview: React.FC<ColorPreviewProps> = ({
  name,
  colorCode,
  imageUrl,
  price,
  quantity,
  className = '',
  size = 'md',
  showDetails = true,
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  const containerClasses = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
  };

  return (
    <div className={`flex items-center ${containerClasses[size]} ${className}`}>
      {/* معاينة اللون */}
      <div className="relative group">
        <div 
          className={`${sizeClasses[size]} rounded-xl shadow-sm border-2 border-white dark:border-slate-800 transition-all duration-300 group-hover:scale-105 group-hover:shadow-md overflow-hidden`}
          style={{ backgroundColor: colorCode }}
        >
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt={`صورة اللون ${name}`}
              className="w-full h-full object-cover"
            />
          )}
          
          {/* تأثير الإضاءة */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10 pointer-events-none" />
          
          {/* أيقونة المعاينة */}
          {size !== 'sm' && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>
        
        {/* حلقة اللون المتحركة */}
        <div 
          className={`absolute inset-0 rounded-xl border-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse`}
          style={{ borderColor: colorCode }}
        />
      </div>

      {/* تفاصيل اللون */}
      {showDetails && (
        <div className="flex-1 min-w-0">
          <div className="space-y-1">
            <h3 className={`font-semibold text-slate-900 dark:text-slate-100 truncate ${
              size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'
            }`}>
              {name || 'اسم اللون'}
            </h3>
            
            <p className={`font-mono text-slate-500 dark:text-slate-400 ${
              size === 'sm' ? 'text-xs' : 'text-sm'
            }`}>
              {colorCode}
            </p>
            
            {(price !== undefined || quantity !== undefined) && (
              <div className={`flex items-center gap-3 ${
                size === 'sm' ? 'text-xs' : 'text-sm'
              }`}>
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
      )}
    </div>
  );
};

export default ColorPreview;
