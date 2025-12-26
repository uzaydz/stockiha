import React from 'react';

export function GuidePage({
  chapter,
  title,
  pageNumber,
  children,
}: {
  chapter: string;
  title: string;
  pageNumber: number;
  children: React.ReactNode;
}) {
  return (
    <section className="guide-page" dir="rtl">
      <header className="guide-page__header">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-400 font-semibold">دليل الاستخدام</span>
          <h2 className="text-[15px] font-bold text-slate-800 font-readex leading-tight">{chapter}</h2>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[22px] font-black text-slate-200 leading-none">{String(pageNumber).padStart(2, '0')}</span>
        </div>
      </header>

      <main className="guide-page__content">
        <div className="print-avoid-break">
          <h1 className="guide-title font-readex">{title}</h1>
          <div className="guide-title__bar" />
        </div>
        <div className="guide-body">{children}</div>
      </main>

      <footer className="guide-page__footer">
        <span className="text-[9px] text-slate-400 font-mono">STOCKIHA POS SYSTEM v2.0</span>
        <span className="text-[9px] text-slate-400">© 2025 جميع الحقوق محفوظة</span>
      </footer>
    </section>
  );
}
