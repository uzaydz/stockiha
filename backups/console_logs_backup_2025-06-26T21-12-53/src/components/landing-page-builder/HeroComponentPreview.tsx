import React from 'react';

interface HeroComponentPreviewProps {
  settings: {
    title?: string;
    subtitle?: string;
    buttonText?: string;
    buttonLink?: string;
    imageUrl?: string;
    backgroundColor?: string;
    textColor?: string;
    [key: string]: any;
  };
}

/**
 * مكون معاينة للقسم الرئيسي (هيرو)
 */
const HeroComponentPreview: React.FC<HeroComponentPreviewProps> = ({ settings }) => {
  const backgroundStyle = {
    backgroundColor: settings.backgroundColor || '#ffffff',
    color: settings.textColor || '#000000',
  };
  
  // صورة بديلة محلية بدلاً من استخدام خدمة خارجية
  const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iI2YzZjRmNiIvPjxwYXRoIGQ9Ik0zMTAuNSAzMTkuNUwzNjUuNSAyNzVMMzc0LjUgMjgzLjVMNDAwIDMwM0w0NjkgMjQ5LjVMNDk2LjUgMjc1TDUyNS41IDI0Ni41TDUzNC41IDI2My41TDYwMCAzMzAuNUw0MDAgMzgwTDMxMC41IDMxOS41WiIgZmlsbD0iI2UyZThmMCIvPjxjaXJjbGUgY3g9IjM0NyIgY3k9IjI0NiIgcj0iMTgiIGZpbGw9IiNlMmU4ZjAiLz48cGF0aCBkPSJNMjM4LjUgMzQ5LjVDMjM4LjUgMzQ5LjUgMjYwLjUgMzA1IDMwMi41IDI5NC41QzM0NC41IDI4NCA0MDAuNSAzMTMgNDAwLjUgMzEzTDIzOC41IDM1NS41VjM0OS41WiIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmaWxsPSIjOTQ5NDk0Ij7LktmI2LHYqTwvdGV4dD48L3N2Zz4=';
  
  return (
    <section className="py-8" style={backgroundStyle}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 text-center md:text-right">
            <h1 className="text-2xl font-bold mb-3">
              {settings.title || 'عنوان ترويجي'}
            </h1>
            <p className="text-sm mb-4">
              {settings.subtitle || 'النص الثانوي للتوضيح والشرح بمزيد من التفاصيل.'}
            </p>
            {settings.buttonText && (
              <a 
                href={settings.buttonLink || '#'} 
                className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md"
                onClick={(e) => e.preventDefault()}
              >
                {settings.buttonText}
              </a>
            )}
          </div>
          <div className="flex-1">
            <img 
              src={settings.imageUrl || fallbackImage} 
              alt={settings.title || 'صورة ترويجية'} 
              className="max-w-full rounded-lg shadow-md" 
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2VlZWVlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmaWxsPSIjOTk5OTk5Ij5JbWFnZTwvdGV4dD48L3N2Zz4=';
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroComponentPreview;
