import React, { useEffect, useMemo, useState } from 'react';
import { Wifi, Battery, Search } from 'lucide-react';

const formatTime = (d: Date) => {
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const h12 = hours % 12 || 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  return `${h12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

const MacOSMenuBar: React.FC = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const timeLabel = useMemo(() => formatTime(now), [now]);

  return (
    <div className="macos-menubar fixed top-0 inset-x-0 z-[1200] h-[28px] select-none">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-md border-b border-white/10" />
      <div className="relative h-full w-full flex items-center justify-between px-3 text-[12px] text-white/95">
        {/* Left side: Apple + Finder menu names */}
        <div className="flex items-center gap-4">
          <div className="font-[600] tracking-tight leading-none"></div>
          <div className="font-[600]">Finder</div>
          <div className="opacity-90 hover:opacity-100 transition">File</div>
          <div className="opacity-90 hover:opacity-100 transition">Edit</div>
          <div className="opacity-90 hover:opacity-100 transition">View</div>
          <div className="opacity-90 hover:opacity-100 transition">Go</div>
          <div className="opacity-90 hover:opacity-100 transition">Window</div>
          <div className="opacity-90 hover:opacity-100 transition">Help</div>
        </div>

        {/* Right side: status items (spotlight, wifi, battery, time) */}
        <div className="flex items-center gap-3">
          <Search className="h-[14px] w-[14px] opacity-90" />
          <Wifi className="h-[14px] w-[14px] opacity-90" />
          <div className="flex items-center gap-1">
            <Battery className="h-[14px] w-[14px] opacity-90" />
            <span className="opacity-90">100%</span>
          </div>
          <div className="tabular-nums opacity-95">{timeLabel}</div>
        </div>
      </div>
    </div>
  );
};

export default MacOSMenuBar;

