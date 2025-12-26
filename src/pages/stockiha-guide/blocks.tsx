import React from 'react';
import { cn } from '@/lib/utils';

export function GuideCard({
  title,
  icon,
  tone = 'default',
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'soft' | 'dark' | 'warning';
  children: React.ReactNode;
}) {
  const toneClass =
    tone === 'dark'
      ? 'bg-slate-900 text-white border-slate-800'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-950 border-amber-200'
        : tone === 'soft'
          ? 'bg-slate-50 text-slate-900 border-slate-200'
          : 'bg-white text-slate-900 border-slate-200';

  const iconClass =
    tone === 'dark' ? 'text-white/90' : tone === 'warning' ? 'text-amber-700' : 'text-primary';

  return (
    <section className={cn('rounded-2xl border p-4 print-avoid-break', toneClass)}>
      <div className="flex items-center gap-2">
        {icon ? <span className={cn('shrink-0', iconClass)}>{icon}</span> : null}
        <h3 className={cn('font-bold text-sm', tone === 'dark' ? 'text-white' : 'text-slate-900')}>{title}</h3>
      </div>
      <div className={cn('mt-2', tone === 'dark' ? 'text-slate-200' : 'text-slate-700')}>{children}</div>
    </section>
  );
}

export function GuideBullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-2">
          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
          <span className="text-[11px] leading-5">{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function Kbd({ children }: { children: string }) {
  return (
    <span dir="ltr" className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10px] font-bold text-slate-700">
      {children}
    </span>
  );
}
