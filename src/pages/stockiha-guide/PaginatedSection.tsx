import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GuidePage } from './Page';

type Block = {
  key: string;
  node: React.ReactNode;
};

export function PaginatedSection({
  chapter,
  title,
  startPageNumber,
  blocks,
  onPageCount,
}: {
  chapter: string;
  title: string;
  startPageNumber: number;
  blocks: Block[];
  onPageCount?: (count: number) => void;
}) {
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<string[][]>(() => [blocks.map(b => b.key)]);
  const [measureTick, setMeasureTick] = useState(0);

  const blockMap = useMemo(() => new Map(blocks.map(b => [b.key, b.node])), [blocks]);

  useLayoutEffect(() => {
    const onResize = () => setMeasureTick(t => t + 1);
    window.addEventListener('resize', onResize);

    const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;
    fonts?.ready?.then(() => setMeasureTick(t => t + 1)).catch(() => {});

    return () => window.removeEventListener('resize', onResize);
  }, []);

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;

    const pageEl = root.querySelector<HTMLElement>('[data-measure-page]');
    const contentEl = root.querySelector<HTMLElement>('[data-measure-content]');
    const titleEl = root.querySelector<HTMLElement>('[data-measure-title]');
    if (!pageEl || !contentEl || !titleEl) return;

    // Available space for blocks = content height - title height.
    const available = contentEl.clientHeight - titleEl.getBoundingClientRect().height;
    if (available <= 0) return;

    const keys = blocks.map(b => b.key);
    const wrappers = keys
      .map(k => root.querySelector<HTMLElement>(`[data-block-key="${CSS.escape(k)}"]`))
      .filter(Boolean) as HTMLElement[];

    const heights = wrappers.map(w => w.getBoundingClientRect().height);
    const nextPages: string[][] = [];
    let current: string[] = [];
    let used = 0;
    const gap = 10; // matches `.guide-body > * + * { margin-top: 10px; }`

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const base = heights[i] ?? 0;
      const h = base + (current.length === 0 ? 0 : gap);
      if (current.length === 0) {
        current.push(key);
        used = h;
        continue;
      }

      if (used + h <= available) {
        current.push(key);
        used += h;
      } else {
        nextPages.push(current);
        current = [key];
        used = base;
      }
    }

    if (current.length > 0) nextPages.push(current);
    setPages(nextPages);
    onPageCount?.(nextPages.length);
  }, [blocks, onPageCount, measureTick]);

  return (
    <>
      {/* Hidden measurer */}
      <div
        ref={measureRef}
        style={{
          position: 'absolute',
          left: -100000,
          top: 0,
          width: '148mm',
          height: '210mm',
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <div data-measure-page data-export-ignore="true" className="guide-page">
          <div className="guide-page__header" />
          <div data-measure-content className="guide-page__content">
            <div data-measure-title className="print-avoid-break">
              <h1 className="guide-title font-readex">{title}</h1>
              <div className="guide-title__bar" />
            </div>
            <div className="guide-body">
              {blocks.map((b, idx) => (
                <div
                  key={b.key}
                  data-block-key={b.key}
                  className="print-avoid-break"
                >
                  {b.node}
                </div>
              ))}
            </div>
          </div>
          <div className="guide-page__footer" />
        </div>
      </div>

      {/* Render pages */}
      {pages.map((keys, pageIdx) => (
        <GuidePage
          key={`${chapter}-${title}-${pageIdx}`}
          chapter={chapter}
          title={title}
          pageNumber={startPageNumber + pageIdx}
        >
          {keys.map((k) => (
            <div key={k} className="print-avoid-break">
              {blockMap.get(k)}
            </div>
          ))}
        </GuidePage>
      ))}
    </>
  );
}
