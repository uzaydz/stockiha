import React from 'react';

interface ImageComponentProps {
  settings: {
    imageUrl?: string;
    altText?: string;
    caption?: string;
    maxWidth?: string;
    alignment?: string;
    border?: boolean;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    shadow?: boolean;
    shadowIntensity?: string;
    overlay?: boolean;
    overlayColor?: string;
    overlayOpacity?: number;
    onClick?: string;
    linkUrl?: string;
    [key: string]: any;
  };
  className?: string;
}

/**
 * مكون لعرض الصورة في صفحات الهبوط
 */
const ImageComponent: React.FC<ImageComponentProps> = ({ settings, className = '' }) => {
  // حساب نمط الظل بناءً على الشدة
  const getShadowStyle = () => {
    if (!settings.shadow) return '';
    
    switch (settings.shadowIntensity) {
      case 'light':
        return 'shadow-md';
      case 'medium':
        return 'shadow-lg';
      case 'strong':
        return 'shadow-xl';
      default:
        return 'shadow-md';
    }
  };

  // حساب أنماط المحاذاة
  const getAlignmentClass = () => {
    switch (settings.alignment) {
      case 'left':
        return 'mr-auto';
      case 'right':
        return 'ml-auto';
      case 'center':
      default:
        return 'mx-auto';
    }
  };

  // إنشاء أنماط الصورة
  const imageStyles: React.CSSProperties = {
    maxWidth: settings.maxWidth || '100%',
    position: 'relative',
    ...(settings.border && {
      border: `${settings.borderWidth || 1}px solid ${settings.borderColor || '#000000'}`,
      borderRadius: `${settings.borderRadius || 0}px`,
    }),
  };

  // إنشاء أنماط الحاوية للمحاذاة
  const containerStyles: React.CSSProperties = {
    textAlign: settings.alignment === 'left' ? 'left' : settings.alignment === 'right' ? 'right' : 'center',
    width: '100%',
  };

  // إنشاء أنماط الطبقة الشفافة إذا تم تمكينها
  const overlayStyles: React.CSSProperties = settings.overlay ? {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: settings.overlayColor || '#000000',
    opacity: (settings.overlayOpacity || 50) / 100,
    borderRadius: settings.border ? `${settings.borderRadius || 0}px` : 0,
  } : {};

  // التعامل مع خطأ تحميل الصورة
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // محاولة استخدام أصل محلي أولاً
    const newSrc = '/assets/placeholder-image.png';
    // تعيين بيانات URL كملاذ أخير إذا لم يكن الأصل موجودًا
    (e.target as HTMLImageElement).onerror = () => {
      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2VlZWVlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmaWxsPSIjOTk5OTk5Ij5JbWFnZTwvdGV4dD48L3N2Zz4=';
      // إزالة معالج الخطأ لمنع الحلقات اللانهائية
      (e.target as HTMLImageElement).onerror = null;
    };
    (e.target as HTMLImageElement).src = newSrc;
  };

  // عرض مكون الصورة
  return (
    <div 
      className={`landing-page-image-component ${className}`} 
      style={containerStyles}
      data-component-type="image"
    >
      <div className={`relative inline-block ${getAlignmentClass()} ${getShadowStyle()}`} style={{ maxWidth: settings.maxWidth || '100%' }}>
        {settings.onClick === 'link' && settings.linkUrl ? (
          <a href={settings.linkUrl} target="_blank" rel="noopener noreferrer">
            <img 
              src={settings.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2VlZWVlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmaWxsPSIjOTk5OTk5Ij5JbWFnZTwvdGV4dD48L3N2Zz4='} 
              alt={settings.altText || 'صورة'} 
              style={imageStyles}
              className="block w-full"
              onError={handleImageError}
            />
            {settings.overlay && <div style={overlayStyles}></div>}
          </a>
        ) : (
          <>
            <img 
              src={settings.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2VlZWVlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmaWxsPSIjOTk5OTk5Ij5JbWFnZTwvdGV4dD48L3N2Zz4='} 
              alt={settings.altText || 'صورة'} 
              style={imageStyles}
              className={`block w-full ${settings.onClick === 'enlarge' ? 'cursor-pointer' : ''}`}
              onClick={settings.onClick === 'enlarge' ? () => {
                // فتح الصورة في علامة تبويب جديدة أو نافذة منبثقة للتكبير
                window.open(settings.imageUrl, '_blank');
              } : undefined}
              onError={handleImageError}
            />
            {settings.overlay && <div style={overlayStyles}></div>}
          </>
        )}
        
        {settings.caption && (
          <div className="text-center text-sm text-gray-600 mt-2 px-2">
            {settings.caption}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageComponent;
