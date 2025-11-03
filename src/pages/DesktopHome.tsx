import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Users, Headphones, Settings, BarChart3, Folder, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

type DesktopApp = {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
};

const APPS: DesktopApp[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { id: 'pos', label: 'POS', path: '/pos', icon: ShoppingCart },
  { id: 'orders', label: 'Orders', path: '/dashboard/orders', icon: Folder },
  { id: 'products', label: 'Products', path: '/dashboard/products', icon: Package },
  { id: 'customers', label: 'Customers', path: '/dashboard/customers', icon: Users },
  { id: 'callcenter', label: 'Call Center', path: '/call-center', icon: Headphones },
  { id: 'analytics', label: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', path: '/dashboard/settings', icon: Settings },
];

const DesktopHome: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selected, setSelected] = useState<string | null>(null);

  // Enable desktop mode in AppleShell (hide central window)
  useEffect(() => {
    document.body.classList.add('appleshell-desktop-mode');
    return () => document.body.classList.remove('appleshell-desktop-mode');
  }, []);

  // Deselect icon on route change
  useEffect(() => { setSelected(null); }, [location.pathname]);

  const onOpen = (path: string) => navigate(path);

  const items = useMemo(() => APPS, []);

  return (
    <div className="macos-desktop relative min-h-[calc(100dvh-6.5rem)] select-none">
      {/* Top spacer (simulates menu bar offset) */}
      <div className="h-4" />

      {/* Desktop icons grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 2xl:grid-cols-12 gap-x-8 gap-y-10 px-6">
        {items.map((app, idx) => {
          const Icon = app.icon;
          const isSelected = selected === app.id;
          return (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.03, 0.3) }}
              className="flex flex-col items-center"
            >
              <button
                onClick={() => setSelected(app.id)}
                onDoubleClick={() => onOpen(app.path)}
                className={[
                  'group grid place-items-center h-20 w-20 rounded-2xl transition-all',
                  'bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-lg',
                  'shadow-[0_10px_30px_rgba(0,0,0,0.35)]',
                  isSelected ? 'ring-2 ring-white/70' : 'ring-0'
                ].join(' ')}
                title={app.label}
              >
                <Icon className="h-8 w-8 text-white/95 drop-shadow" />
              </button>
              <div className="mt-2 max-w-[84px] text-center">
                <span className={`text-[11px] ${isSelected ? 'text-white' : 'text-white/90'} drop-shadow`}>
                  {app.label}
                </span>
              </div>
            </motion.div>
          );
        })}

        {/* Trash */}
        <div className="flex flex-col items-center justify-end col-span-1 md:col-span-1 lg:col-span-1">
          <button
            className="grid place-items-center h-20 w-20 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-lg shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
            title="Trash"
          >
            <Trash2 className="h-8 w-8 text-white/90" />
          </button>
          <div className="mt-2 text-center">
            <span className="text-[11px] text-white/80">Trash</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopHome;

