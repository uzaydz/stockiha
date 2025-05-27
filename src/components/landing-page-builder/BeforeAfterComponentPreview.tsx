import React, { useState, useRef, useEffect } from 'react';
import { LandingPageComponent } from './types';

interface BeforeAfterComponentPreviewProps {
  component: LandingPageComponent;
}

const BeforeAfterComponentPreview: React.FC<BeforeAfterComponentPreviewProps> = ({ component }) => {
  const { 
    title, 
    description, 
    items = [], 
    backgroundColor = '#ffffff', 
    textColor = '#333333', 
    layout = 'horizontal',
    showLabels = true,
    slidersCount = 1
  } = component.settings;

  // تخزين حالة موضع شريط التمرير لكل عنصر
  const [sliderPositions, setSliderPositions] = useState<Record<string, number>>({});
  const isDragging = useRef<Record<string, boolean>>({});
  
  // تهيئة المواضع الافتراضية
  useEffect(() => {
    const initialPositions: Record<string, number> = {};
    items.forEach(item => {
      const id = item.id || String(Math.random());
      initialPositions[id] = 50; // البداية في الوسط
    });
    setSliderPositions(initialPositions);
  }, [items]);

  // معالجة بدء السحب
  const handleMouseDown = (itemId: string) => {
    isDragging.current = { ...isDragging.current, [itemId]: true };
  };

  // معالجة إنهاء السحب
  const handleMouseUp = (itemId: string) => {
    isDragging.current = { ...isDragging.current, [itemId]: false };
  };

  // معالجة حركة مؤشر الفأرة أو اللمس
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent, itemId: string) => {
    if (!isDragging.current[itemId]) return;
    
    const slider = e.currentTarget as HTMLDivElement;
    const rect = slider.getBoundingClientRect();
    
    // الحصول على موضع مؤشر الفأرة أو اللمس
    const clientX = 'touches' in e 
      ? e.touches[0].clientX 
      : (e as React.MouseEvent).clientX;
    
    // حساب النسبة المئوية
    const position = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    
    setSliderPositions(prev => ({
      ...prev,
      [itemId]: position
    }));
  };

  return (
    <div 
      className="w-full py-10 px-4 relative"
      style={{ 
        backgroundColor, 
        color: textColor,
        borderRadius: '8px',
        boxShadow: 'rgba(50, 50, 93, 0.03) 0px 50px 100px -20px, rgba(0, 0, 0, 0.04) 0px 30px 60px -30px'
      }}
    >
      <div className="container mx-auto">
        {title && (
          <h2 
            className="text-3xl font-bold text-center mb-4" 
            style={{ color: textColor }}
          >
            {title}
          </h2>
        )}
        
        {description && (
          <p 
            className="text-lg text-center mb-10 max-w-2xl mx-auto"
            style={{ color: textColor, opacity: 0.9 }}
          >
            {description}
          </p>
        )}

        <div 
          className={`grid grid-cols-1 ${
            slidersCount > 1 
              ? `md:grid-cols-${Math.min(slidersCount, 3)}` 
              : 'max-w-3xl mx-auto'
          } gap-10`}
        >
          {items.map((item, index) => {
            const itemId = item.id || String(index);
            const position = sliderPositions[itemId] || 50;
            
            return (
              <div key={itemId} className="flex flex-col items-center">
                {item.title && (
                  <h3 
                    className="text-xl font-semibold mb-5" 
                    style={{ color: textColor }}
                  >
                    {item.title}
                  </h3>
                )}
                
                <div className={`relative w-full ${layout === 'vertical' ? 'flex flex-col' : 'max-w-xl mx-auto'}`}>
                  {layout === 'horizontal' ? (
                    <div 
                      className="relative w-full overflow-hidden rounded-xl shadow-lg"
                      style={{ height: '350px' }}
                      onMouseDown={() => handleMouseDown(itemId)}
                      onMouseUp={() => handleMouseUp(itemId)}
                      onMouseLeave={() => handleMouseUp(itemId)}
                      onMouseMove={(e) => handleMouseMove(e, itemId)}
                      onTouchStart={() => handleMouseDown(itemId)}
                      onTouchEnd={() => handleMouseUp(itemId)}
                      onTouchCancel={() => handleMouseUp(itemId)}
                      onTouchMove={(e) => handleMouseMove(e, itemId)}
                    >
                      {/* صورة "قبل" (الطبقة السفلية) */}
                      <div 
                        className="absolute inset-0 bg-cover bg-center transition-all"
                        style={{ 
                          backgroundImage: `url(${item.beforeImage})`,
                          backgroundSize: 'cover',
                          filter: 'contrast(1.05)'
                        }}
                      />
                      
                      {/* صورة "بعد" (الطبقة العلوية) */}
                      <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform"
                        style={{ 
                          backgroundImage: `url(${item.afterImage})`,
                          backgroundSize: 'cover',
                          clipPath: `polygon(0 0, ${position}% 0, ${position}% 100%, 0 100%)`,
                          filter: 'contrast(1.05)'
                        }}
                      />
                      
                      {/* خط الفاصل والمقبض */}
                      <div 
                        className="absolute top-0 bottom-0 cursor-ew-resize z-10"
                        style={{ 
                          left: `${position}%`,
                          transform: 'translateX(-50%)',
                          width: '40px',
                          touchAction: 'none' 
                        }}
                      >
                        <div 
                          className="absolute top-0 bottom-0 left-1/2 w-1 bg-white shadow-lg"
                          style={{ transform: 'translateX(-50%)' }}
                        />
                        <div 
                          className="absolute top-1/2 left-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center"
                          style={{ transform: 'translate(-50%, -50%)' }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 5L3 10L8 15" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M16 5L21 10L16 15" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                      
                      {/* التسميات */}
                      {showLabels && (
                        <>
                          <div className="absolute top-5 left-5 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md backdrop-blur-sm">
                            {item.beforeLabel || "قبل"}
                          </div>
                          <div className="absolute top-5 right-5 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md backdrop-blur-sm">
                            {item.afterLabel || "بعد"}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    // التصميم العمودي
                    <div className="w-full space-y-6">
                      <div className="relative rounded-xl overflow-hidden shadow-lg" style={{ height: '300px' }}>
                        <div 
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${item.beforeImage})` }}
                        />
                        {showLabels && (
                          <div className="absolute top-5 right-5 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md backdrop-blur-sm">
                            {item.beforeLabel || "قبل"}
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent h-20"></div>
                      </div>
                      
                      <div className="flex justify-center">
                        <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 5L12 19" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6 11L12 5L18 11" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                      
                      <div className="relative rounded-xl overflow-hidden shadow-lg" style={{ height: '300px' }}>
                        <div 
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${item.afterImage})` }}
                        />
                        {showLabels && (
                          <div className="absolute top-5 right-5 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md backdrop-blur-sm">
                            {item.afterLabel || "بعد"}
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent h-20"></div>
                      </div>
                    </div>
                  )}
                </div>
                
                {item.description && (
                  <p 
                    className="mt-6 text-center max-w-xl mx-auto opacity-80"
                    style={{ color: textColor }}
                  >
                    {item.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BeforeAfterComponentPreview;
