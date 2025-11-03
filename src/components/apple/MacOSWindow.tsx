import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTitlebar } from '@/context/TitlebarContext';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import POSTitleBarActions from '@/components/pos/POSTitleBarActions';

interface MacOSWindowProps {
  children: React.ReactNode;
}

/**
 * MacOSWindow: Glassmorphic window with traffic lights and optional tabs/actions
 * driven by TitlebarContext from the legacy system.
 */
const MacOSWindow: React.FC<MacOSWindowProps> = ({ children }) => {
  const { tabs, activeTabId, actions } = useTitlebar();
  const location = useLocation();

  const isInPOS = useMemo(() => {
    const p = location.pathname;
    return p.includes('/pos-') || p.includes('/pos/') || p.includes('/pos-advanced') || p.includes('/pos-dashboard');
  }, [location.pathname]);

  return (
    <div className="apple-window rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.35)] overflow-hidden">
      {/* Titlebar */}
      <div className="relative flex items-center justify-between h-11 px-3 sm:px-4 bg-white/[0.06] border-b border-white/10">
        {/* Traffic lights */}
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-3.5 rounded-full bg-[#FF5F57] shadow-inner ring-1 ring-black/20" />
          <div className="h-3.5 w-3.5 rounded-full bg-[#FEBB2E] shadow-inner ring-1 ring-black/20" />
          <div className="h-3.5 w-3.5 rounded-full bg-[#28C840] shadow-inner ring-1 ring-black/20" />
        </div>

        {/* Center: Tabs or POS actions */}
        <div className="absolute left-1/2 -translate-x-1/2 max-w-[70%]">
          {tabs && tabs.length > 0 ? (
            <div className="flex items-center gap-1 bg-white/10 rounded-xl px-1.5 py-1 border border-white/10 backdrop-blur-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={tab.onSelect}
                  className={cn(
                    'px-2.5 h-7 rounded-lg text-xs transition-all',
                    tab.id === activeTabId
                      ? 'bg-white text-slate-900 shadow'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  )}
                  title={tab.title}
                >
                  {tab.title}
                </button>
              ))}
            </div>
          ) : (
            isInPOS && (
              <div className="hidden sm:block">
                <POSTitleBarActions />
              </div>
            )
          )}
        </div>

        {/* Right: Actions (from TitlebarContext) */}
        <div className="flex items-center gap-1">
          {actions && actions.length > 0 && actions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={action.disabled}
              className={cn(
                'h-7 w-7 inline-flex items-center justify-center rounded-md',
                action.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10 active:scale-95 text-white'
              )}
              title={action.label}
              aria-label={action.label}
            >
              {action.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <motion.div
        initial={{ opacity: 0.96 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="apple-window__body bg-slate-950/30 backdrop-blur-xl"
      >
        <div className="min-h-[calc(100dvh-9.5rem)] max-h-[calc(100dvh-9.5rem)] overflow-auto will-change-transform">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export default MacOSWindow;

