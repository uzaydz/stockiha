import React, { useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import MacOSWindow from './MacOSWindow';
import DockAdvanced from './dock/DockAdvanced';
import DesktopTitlebar from '@/components/desktop/DesktopTitlebar';
import MacDesktopShell from './desktop/MacDesktopShell';

interface MacOSShellProps {
  children: React.ReactNode;
}

/**
 * MacOSShell: Provides translucent wallpaper, a central macOS-like window,
 * and a bottom dock with magnify effect. Existing app content is embedded
 * inside the window without modifying the pages.
 */
const MacOSShell: React.FC<MacOSShellProps> = ({ children }) => {
  const location = useLocation();
  const [wallpaperTilt, setWallpaperTilt] = useState({ x: 0, y: 0 });
  const wallpaperRef = useRef<HTMLDivElement>(null);

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!wallpaperRef.current) return;
    const rect = wallpaperRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 4;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 4;
    setWallpaperTilt({ x, y });
  };

  const key = useMemo(() => location.pathname, [location.pathname]);

  const isDesktopRoute = useMemo(() => {
    const p = location.pathname;
    return p === '/' || p === '/desktop';
  }, [location.pathname]);
  const desktopMode = isDesktopRoute || (typeof document !== 'undefined' && document.body.classList.contains('appleshell-desktop-mode'));

  return (
    <div className="apple-macos-shell macos-new-wallpaper relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
      <DesktopTitlebar />
      
      {/* MacOS Sonoma Dynamic Wallpaper - خلفية ماك الديناميكية */}
      <motion.div
        ref={wallpaperRef}
        onMouseMove={handleMouseMove}
        className="pointer-events-none absolute inset-0"
        animate={{ rotateX: wallpaperTilt.y, rotateY: -wallpaperTilt.x }}
        style={{ transformStyle: 'preserve-3d' as any }}
        transition={{ type: 'spring', stiffness: 50, damping: 20 }}
      >
        {/* الطبقة الأساسية - تدرج أزرق وبنفسجي مثل Sonoma */}
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(circle at 15% 20%, rgba(59, 130, 246, 0.4), transparent 45%),
            radial-gradient(circle at 85% 25%, rgba(139, 92, 246, 0.35), transparent 50%),
            radial-gradient(circle at 50% 80%, rgba(236, 72, 153, 0.3), transparent 55%),
            radial-gradient(ellipse at 50% 50%, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)
          `
        }} />
        
        {/* طبقة الموجات المتحركة - تأثير Sonoma المميز */}
        <div className="absolute inset-0 opacity-40">
          <motion.div
            className="absolute inset-0"
            animate={{
              background: [
                'radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.3), transparent 50%)',
                'radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.3), transparent 50%)',
                'radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.3), transparent 50%)',
              ],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>

        {/* تأثير النجوم الصغيرة */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 20%, white 1px, transparent 1px),
            radial-gradient(circle at 80% 40%, white 0.5px, transparent 0.5px),
            radial-gradient(circle at 40% 60%, white 1px, transparent 1px),
            radial-gradient(circle at 90% 80%, white 0.5px, transparent 0.5px),
            radial-gradient(circle at 10% 90%, white 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 80% 80%, 90% 90%, 70% 70%, 95% 95%',
          backgroundPosition: '0% 0%, 20% 20%, 40% 40%, 60% 60%, 80% 80%',
        }} />

        {/* طبقة التوهج الناعم */}
        <div className="absolute inset-0 opacity-30" style={{
          background: `
            radial-gradient(ellipse at 30% 40%, rgba(96, 165, 250, 0.2), transparent 60%),
            radial-gradient(ellipse at 70% 60%, rgba(167, 139, 250, 0.2), transparent 60%)
          `,
          filter: 'blur(80px)',
        }} />
      </motion.div>

      {/* Window or Desktop canvas */}
      {desktopMode ? (
        <MacDesktopShell>
          <div className="relative z-10 pt-12 pb-28 px-4 sm:px-6">
            {children}
          </div>
        </MacDesktopShell>
      ) : (
        <div className="relative z-10 mx-auto px-3 sm:px-6 pt-12 pb-28 max-w-[1600px]">
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 12, scale: 0.992 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <MacOSWindow>
              {children}
            </MacOSWindow>
          </motion.div>
        </div>
      )}

      {/* Dock */}
      <DockAdvanced />
    </div>
  );
};

export default MacOSShell;
