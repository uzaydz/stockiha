import React, { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, ShoppingCart, Headphones, Settings, Store, Users } from 'lucide-react';

type DockItem = {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  pinned?: boolean;
};

const DOCK_ITEMS: DockItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, pinned: true },
  { id: 'pos', label: 'POS', path: '/pos', icon: <ShoppingCart className="h-5 w-5" />, pinned: true },
  { id: 'customers', label: 'Customers', path: '/dashboard/customers', icon: <Users className="h-5 w-5" /> },
  { id: 'store', label: 'Store', path: '/dashboard/products', icon: <Store className="h-5 w-5" /> },
  { id: 'callcenter', label: 'Call Center', path: '/call-center', icon: <Headphones className="h-5 w-5" /> },
  { id: 'settings', label: 'Settings', path: '/dashboard/settings', icon: <Settings className="h-5 w-5" /> },
];

const Dock: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [hoverX, setHoverX] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setHoverX(e.clientX - rect.left);
  };

  const handleMouseLeave = () => setHoverX(null);

  const items = useMemo(() => DOCK_ITEMS, []);

  return (
    <div className="apple-dock pointer-events-none fixed inset-x-0 bottom-4 z-[1000] flex justify-center select-none">
      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="pointer-events-auto flex items-end gap-2 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-2xl px-3 py-2 shadow-[0_10px_35px_rgba(0,0,0,0.35)]"
      >
        {items.map((item, index) => {
          // Magnify effect based on distance from cursor
          let scale = 1;
          if (hoverX !== null && ref.current) {
            const el = ref.current.children[index] as HTMLElement;
            const { left, width } = el.getBoundingClientRect();
            const center = left + width / 2 - ref.current.getBoundingClientRect().left;
            const distance = Math.abs(hoverX - center);
            const influence = Math.max(0, 1 - distance / 120);
            scale = 1 + influence * 0.8; // up to 1.8x
          }

          const active = location.pathname.startsWith(item.path);

          return (
            <motion.button
              key={item.id}
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.95 }}
              style={{ scale }}
              className="group relative grid place-items-center h-12 w-12 rounded-xl bg-slate-900/60 text-white/90 hover:text-white border border-white/10 backdrop-blur-md shadow-lg transition-colors"
              title={item.label}
            >
              {item.icon}
              {/* active/open indicator */}
              <div className={`absolute -bottom-1.5 h-1 w-1 rounded-full ${active ? 'bg-white/90' : 'bg-white/40'}`} />
              {/* tooltip */}
              <div className="pointer-events-none absolute bottom-16 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all bg-slate-900/90 text-white text-xs px-2 py-1 rounded-md border border-white/10 whitespace-nowrap">
                {item.label}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default Dock;

