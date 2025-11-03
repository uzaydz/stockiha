import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import Dock from './dock/Dock';
import { LayoutDashboard, ShoppingCart, Headphones, Settings, Store, Users } from 'lucide-react';

interface IOSShellProps {
  children: React.ReactNode;
  homeVisible: boolean;
  onRequestOpenApp: () => void;
  onRequestShowHome: () => void;
}

const APPS = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { id: 'pos', label: 'POS', path: '/pos', icon: ShoppingCart },
  { id: 'customers', label: 'Customers', path: '/dashboard/customers', icon: Users },
  { id: 'store', label: 'Store', path: '/dashboard/products', icon: Store },
  { id: 'callcenter', label: 'Call Center', path: '/call-center', icon: Headphones },
  { id: 'settings', label: 'Settings', path: '/dashboard/settings', icon: Settings },
];

const IOSShell: React.FC<IOSShellProps> = ({ children, homeVisible, onRequestOpenApp, onRequestShowHome }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 250], [1, 0.5]);
  const scale = useTransform(y, [0, 250], [1, 0.92]);

  const key = useMemo(() => location.pathname, [location.pathname]);

  const openApp = (path: string) => {
    navigate(path);
    onRequestOpenApp();
  };

  return (
    <div className="apple-ios-shell relative min-h-screen w-full overflow-hidden bg-[radial-gradient(900px_600px_at_50%_-10%,#111827_20%,#090d1a_80%)]">
      {/* Wallpaper gradients */}
      <div className="absolute inset-0 opacity-[0.35]" style={{
        background:
          'radial-gradient(500px 300px at 15% 20%, rgba(99, 102, 241, 0.35), transparent 60%), ' +
          'radial-gradient(500px 300px at 85% 10%, rgba(236, 72, 153, 0.25), transparent 60%), ' +
          'radial-gradient(900px 700px at 50% 100%, rgba(13, 148, 136, 0.22), transparent 60%)'
      }} />

      {/* Home Screen */}
      {homeVisible && (
        <div className="relative z-10 pt-14 pb-28 px-5">
          {/* Search/Status placeholder */}
          <div className="mx-auto mb-6 h-8 w-28 rounded-full bg-white/10 backdrop-blur-md border border-white/10" />

          {/* App grid */}
          <div className="grid grid-cols-4 gap-4">
            {APPS.map((app) => {
              const Icon = app.icon;
              return (
                <button
                  key={app.id}
                  onClick={() => openApp(app.path)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="grid place-items-center h-14 w-14 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md shadow-[0_8px_25px_rgba(0,0,0,0.35)] text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] text-white/80">{app.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* App Card */}
      {!homeVisible && (
        <motion.div
          key={key}
          drag="y"
          style={{ y, opacity, scale }}
          dragConstraints={{ top: 0, bottom: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120) {
              onRequestShowHome();
              y.set(0);
            } else {
              y.set(0);
            }
          }}
          className="absolute inset-x-2 top-4 bottom-28 z-20 rounded-3xl overflow-hidden border border-white/10 bg-white/10 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
        >
          {/* Grabber */}
          <div className="grid place-items-center h-9 bg-white/5 border-b border-white/10">
            <div className="h-1 w-12 rounded-full bg-white/30" />
          </div>
          <div className="h-[calc(100%-2.25rem)] overflow-auto">
            {children}
          </div>
        </motion.div>
      )}

      {/* iOS Dock */}
      <Dock />

      {/* Home indicator */}
      <button
        aria-label="Home"
        onClick={() => (homeVisible ? onRequestOpenApp() : onRequestShowHome())}
        className="fixed bottom-1.5 left-1/2 -translate-x-1/2 z-[1001] h-1.5 w-24 rounded-full bg-white/70"
        title={homeVisible ? 'Open last app' : 'Go Home'}
      />
    </div>
  );
};

export default IOSShell;

