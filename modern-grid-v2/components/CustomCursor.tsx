import React, { useEffect, useRef, useState } from 'react';

const CustomCursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // 1. Strict detection for touch/mobile devices
    // If it's a coarse pointer (finger), we DO NOT render this component at all.
    // This saves massive resources on mobile.
    const isTouchDevice = 
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches ||
      window.innerWidth < 1024; // Disable on tablets too for safety

    if (isTouchDevice) {
      return;
    }
    
    setShouldRender(true);

    const onMouseMove = (e: MouseEvent) => {
      // PERFORMANCE OPTIMIZATION: 
      // Directly updating DOM style avoids React Re-renders (Zero-Cost Animation)
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
      
      if (!isVisible) setIsVisible(true);
    };

    const onMouseEnter = () => setIsVisible(true);
    const onMouseLeave = () => setIsVisible(false);

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.closest('button') ||
        target.closest('a') ||
        target.classList.contains('cursor-hover')
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseenter', onMouseEnter);
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseenter', onMouseEnter);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <div 
      ref={cursorRef}
      className={`fixed pointer-events-none z-[9999] transition-opacity duration-300 mix-blend-difference will-change-transform ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ 
        left: 0, 
        top: 0,
        transform: 'translate3d(-100px, -100px, 0)'
      }}
    >
      {/* Main Dot */}
      <div className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white transition-all duration-200 ease-out ${isHovering ? 'w-2 h-2' : 'w-3 h-3'}`}></div>
      
      {/* Outer Ring */}
      <div 
        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white transition-all duration-500 ease-out ${isHovering ? 'w-14 h-14 bg-white/20 border-transparent backdrop-blur-[1px]' : 'w-8 h-8'}`}
      ></div>
    </div>
  );
};

export default CustomCursor;