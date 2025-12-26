import React from 'react';
import { GuidePage } from './Page';

type TocItem = {
  num: string;
  title: string;
  pageLabel: string;
};

export function TableOfContentsPage({ pageNumber, items }: { pageNumber: number; items: TocItem[] }) {
  return (
    <div data-guide-role="toc">
      <GuidePage chapter="الفهرس" title="فهرس المحتويات" pageNumber={pageNumber}>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.num} className="flex items-baseline gap-3 p-2 rounded-xl border border-slate-200 bg-white print-avoid-break">
            <span className="text-primary font-mono text-[12px] font-bold">{item.num}</span>
            <span className="flex-1 text-[12px] font-semibold text-slate-800 relative mx-1">
              <span className="relative z-10 pl-2">{item.title}</span>
              <span className="absolute bottom-2 left-0 right-0 border-b border-dotted border-slate-300 -z-0" />
            </span>
            <span className="text-slate-500 font-mono text-[11px]">{item.pageLabel}</span>
          </div>
        ))}
      </div>
      </GuidePage>
    </div>
  );
}
