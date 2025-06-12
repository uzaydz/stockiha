import React, { useState, useEffect } from 'react';

const AnimatedBackground: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden -z-10">
      {/* تدرج خلفية ديناميكي محسن للوضعين */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/40 dark:to-muted/20" />
      
      {/* شبكة نقاط متحركة محسنة للوضع الفاتح */}
      <div className="absolute inset-0 opacity-40 dark:opacity-15 md:opacity-30 dark:md:opacity-12">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1.5px, transparent 0)`,
            backgroundSize: isMobile ? '80px 80px' : '60px 60px',
            animation: 'grid-shift 25s ease-in-out infinite',
          }}
        />
      </div>
      
      {/* طبقة شبكة ثانوية مخفية في الموبايل */}
      <div className="hidden md:block absolute inset-0 opacity-25 dark:opacity-8">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--secondary)) 1px, transparent 0)`,
            backgroundSize: '120px 120px',
            animation: 'grid-shift-reverse 30s ease-in-out infinite',
          }}
        />
      </div>
      
      {/* نجوم متلألئة محسنة للوضع الفاتح والموبايل */}
      {Array.from({ length: isMobile ? 15 : 25 }).map((_, i) => (
        <div
          key={`star-${i}`}
          className="absolute rounded-full animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            background: i % 3 === 0 
              ? `hsl(var(--primary) / 0.9)` 
              : i % 3 === 1 
              ? `hsl(var(--secondary) / 0.8)` 
              : `hsl(var(--accent) / 0.7)`,
            boxShadow: `0 0 ${Math.random() * 8 + 4}px hsl(var(--primary) / 0.6)`,
            animationDelay: `${Math.random() * 4}s`,
            animationDuration: `${3 + Math.random() * 2}s`,
          }}
        />
      ))}
      
      {/* دوائر ضوئية متدرجة محسنة للموبايل */}
      {Array.from({ length: isMobile ? 3 : 5 }).map((_, i) => (
        <div
          key={`glow-${i}`}
          className="absolute rounded-full blur-2xl md:blur-3xl"
          style={{
            width: `${100 + i * 60}px`,
            height: `${100 + i * 60}px`,
            background: `radial-gradient(circle, hsl(var(--primary) / ${0.5 - i * 0.05}), transparent 70%)`,
            left: `${10 + i * 20}%`,
            top: `${10 + i * 15}%`,
            opacity: '0.7',
            animation: `float-${i} ${10 + i * 3}s ease-in-out infinite`,
          }}
        />
      ))}
      
      {/* عناصر هندسية محسنة للموبايل */}
      {Array.from({ length: isMobile ? 6 : 12 }).map((_, i) => (
        <div
          key={`shape-${i}`}
          className="absolute opacity-30 dark:opacity-15 md:opacity-25 dark:md:opacity-12"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `geometric-dance-${i % 4} ${15 + i * 2}s ease-in-out infinite`,
            animationDelay: `${i * 0.8}s`,
          }}
        >
          {i % 4 === 0 && (
            // سداسي محسن للوضع الفاتح
            <svg width={isMobile ? "18" : "24"} height={isMobile ? "18" : "24"} viewBox="0 0 24 24">
              <polygon
                points="12,2 20,7 20,17 12,22 4,17 4,7"
                fill="none"
                stroke={`hsl(var(--primary) / 0.8)`}
                strokeWidth="1.5"
                filter="drop-shadow(0 0 6px hsl(var(--primary) / 0.4))"
              />
            </svg>
          )}
          {i % 4 === 1 && (
            // مربع مدور محسن
            <div
              className={`border border-secondary/80 rounded ${isMobile ? 'w-4 h-4' : 'w-6 h-6'}`}
              style={{
                background: `linear-gradient(45deg, hsl(var(--secondary) / 0.2), transparent)`,
                filter: 'drop-shadow(0 0 6px hsl(var(--secondary) / 0.4))',
              }}
            />
          )}
          {i % 4 === 2 && (
            // دائرة مخططة محسنة
            <div
              className={`rounded-full border-2 border-dashed border-accent/70 ${isMobile ? 'w-5 h-5' : 'w-8 h-8'}`}
              style={{
                filter: 'drop-shadow(0 0 6px hsl(var(--accent) / 0.4))',
              }}
            />
          )}
          {i % 4 === 3 && (
            // مثلث محسن
            <div
              style={{
                width: '0',
                height: '0',
                borderLeft: isMobile ? '6px solid transparent' : '8px solid transparent',
                borderRight: isMobile ? '6px solid transparent' : '8px solid transparent',
                borderBottom: `${isMobile ? '9px' : '12px'} solid hsl(var(--primary) / 0.6)`,
                filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.4))',
              }}
            />
          )}
        </div>
      ))}
      
      {/* خطوط ضوئية محسنة للوضع الفاتح */}
      <div className="absolute top-0 left-0 w-full h-full opacity-25 dark:opacity-8 md:opacity-20 dark:md:opacity-6">
        {/* خطوط أفقية */}
        {Array.from({ length: isMobile ? 2 : 3 }).map((_, i) => (
          <div
            key={`h-line-${i}`}
            className="absolute left-0 w-full h-px"
            style={{
              top: `${30 + i * 30}%`,
              background: `linear-gradient(90deg, transparent, hsl(var(--primary) / 0.8), transparent)`,
              animation: `slide-right ${12 + i * 3}s linear infinite`,
              animationDelay: `${i * 2}s`,
            }}
          />
        ))}
        
        {/* خطوط عمودية مخفية في الموبايل */}
        {!isMobile && Array.from({ length: 2 }).map((_, i) => (
          <div
            key={`v-line-${i}`}
            className="absolute top-0 w-px h-full"
            style={{
              left: `${30 + i * 40}%`,
              background: `linear-gradient(180deg, transparent, hsl(var(--secondary) / 0.7), transparent)`,
              animation: `slide-down ${15 + i * 4}s linear infinite`,
              animationDelay: `${i * 3}s`,
            }}
          />
        ))}
      </div>
      
      {/* موجات ضوئية محسنة للموبايل */}
      {Array.from({ length: isMobile ? 2 : 4 }).map((_, i) => (
        <div
          key={`wave-${i}`}
          className="absolute opacity-30 dark:opacity-15 md:opacity-25 dark:md:opacity-10"
          style={{
            left: `${i * 30}%`,
            top: `${25 + i * 25}%`,
            width: isMobile ? '150px' : '200px',
            height: isMobile ? '75px' : '100px',
            background: `radial-gradient(ellipse, hsl(var(--primary) / 0.4), transparent 70%)`,
            borderRadius: '50%',
            filter: 'blur(15px)',
            animation: `wave-motion-${i} ${20 + i * 5}s ease-in-out infinite`,
            animationDelay: `${i * 2}s`,
          }}
        />
      ))}
      
      {/* تأثيرات مدارية مخفية في الموبايل */}
      {!isMobile && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`orbit-${i}`}
              className="absolute border border-primary/30 dark:border-primary/20 rounded-full"
              style={{
                width: `${(i + 1) * 100}px`,
                height: `${(i + 1) * 100}px`,
                left: `${-(i + 1) * 50}px`,
                top: `${-(i + 1) * 50}px`,
                animation: `orbit-rotation ${30 + i * 10}s linear infinite`,
              }}
            >
              <div
                className="absolute w-1.5 h-1.5 bg-primary/80 dark:bg-primary/60 rounded-full top-0 left-1/2 transform -translate-x-1/2"
                style={{
                  boxShadow: '0 0 6px hsl(var(--primary) / 0.8)',
                  animation: `pulse ${2 + i}s ease-in-out infinite`,
                }}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* تأثير مركزي محسن للوضعين */}
      <div 
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl md:blur-3xl opacity-35 dark:opacity-20"
        style={{
          width: isMobile ? '240px' : '320px',
          height: isMobile ? '240px' : '320px',
          background: `conic-gradient(from 0deg, 
            hsl(var(--primary) / 0.4), 
            hsl(var(--secondary) / 0.3), 
            hsl(var(--accent) / 0.3), 
            hsl(var(--primary) / 0.4))`,
          animation: 'spin-slow 40s linear infinite',
        }}
      />
      
      {/* جسيمات عائمة محسنة للموبايل */}
      {Array.from({ length: isMobile ? 8 : 15 }).map((_, i) => (
        <div
          key={`particle-${i}`}
          className={`absolute rounded-full bg-primary/60 dark:bg-primary/40 ${isMobile ? 'w-0.5 h-0.5' : 'w-1 h-1'}`}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `particle-float-${i % 3} ${8 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
          }}
        />
      ))}
      
      {/* طبقة تراكب محسنة للوضع الفاتح */}
      <div className="absolute inset-0 bg-background/50 dark:bg-background/70 md:bg-background/40 dark:md:bg-background/65" />
      
      <style>{`
        @keyframes grid-shift {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, 20px); }
        }
        
        @keyframes grid-shift-reverse {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-15px, -15px); }
        }
        
        @keyframes float-0 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -25px) scale(1.1); }
          66% { transform: translate(-25px, 20px) scale(0.9); }
        }
        
        @keyframes float-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, -30px) scale(1.2); }
        }
        
        @keyframes float-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(25px, -40px) scale(0.8); }
          75% { transform: translate(-30px, 30px) scale(1.1); }
        }
        
        @keyframes float-3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(20px, -50px) rotate(180deg); }
        }
        
        @keyframes float-4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 35px) scale(1.3); }
          66% { transform: translate(35px, -20px) scale(0.7); }
        }
        
        @keyframes geometric-dance-0 {
          0%, 100% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
        }
        
        @keyframes geometric-dance-1 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(90deg); }
        }
        
        @keyframes geometric-dance-2 {
          0%, 100% { transform: scale(1) rotate(0deg); }
          33% { transform: scale(1.1) rotate(120deg); }
          66% { transform: scale(0.9) rotate(240deg); }
        }
        
        @keyframes geometric-dance-3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(12px, -12px) rotate(360deg); }
        }
        
        @keyframes slide-right {
          0% { transform: translateX(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        
        @keyframes slide-down {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        
        @keyframes wave-motion-0 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(25px, -15px) scale(1.2); }
        }
        
        @keyframes wave-motion-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 25px) scale(0.8); }
        }
        
        @keyframes wave-motion-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, 30px) scale(1.1); }
          66% { transform: translate(-20px, -15px) scale(0.9); }
        }
        
        @keyframes wave-motion-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(15px, -25px) scale(1.1); }
        }
        
        @keyframes orbit-rotation {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes spin-slow {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        
        @keyframes particle-float-0 {
          0%, 100% { transform: translate(0, 0); opacity: 0.4; }
          50% { transform: translate(15px, -25px); opacity: 1; }
        }
        
        @keyframes particle-float-1 {
          0%, 100% { transform: translate(0, 0); opacity: 0.3; }
          50% { transform: translate(-12px, 20px); opacity: 0.9; }
        }
        
        @keyframes particle-float-2 {
          0%, 100% { transform: translate(0, 0); opacity: 0.5; }
          33% { transform: translate(25px, 8px); opacity: 1; }
          66% { transform: translate(-15px, -12px); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default AnimatedBackground;
