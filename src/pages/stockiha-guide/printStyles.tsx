import React from 'react';

export function StockihaGuidePrintStyles({ layout = 'a5' }: { layout?: 'a5' | 'booklet' }) {
  return (
    <style>{`
      :root {
        --a5-w: 148mm;
        --a5-h: 210mm;
        --pad-x: 10mm;
        --pad-y: 8mm;
        --header-h: 16mm;
        --footer-h: 12mm;
        /* Guide theme (override to match Stockiha brand print tone) */
        --guide-primary: 15 96% 62%; /* #FC5D41 (اللون الأساسي للمشروع) */
        --guide-accent: hsl(var(--primary));
        --guide-accent-soft: hsl(var(--primary) / 0.12);
      }

      *, *::before, *::after { box-sizing: border-box; }

      /* Screen layout (preview) */
      .guide-page {
        width: var(--a5-w);
        height: var(--a5-h);
        margin: 0 auto 24px;
        background: #fff;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        font-family: Tajawal, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      }

      /* Ensure guide uses consistent brand color without changing app theme globally */
      .guide-booklet {
        --primary: var(--guide-primary);
      }

      .guide-page--full {
        display: block;
      }

      .guide-page__header {
        height: var(--header-h);
        padding: 0 var(--pad-x);
        padding-bottom: 3mm;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        border-bottom: 1px solid rgb(241 245 249);
      }

      .guide-page__content {
        flex: 1;
        min-height: 0;
        padding: var(--pad-y) var(--pad-x);
        overflow: hidden;
      }

      .guide-page__footer {
        height: var(--footer-h);
        padding: 0 var(--pad-x);
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1px solid rgb(241 245 249);
        background: rgba(248, 250, 252, 0.6);
      }

      .guide-title {
        font-size: 18px;
        font-weight: 800;
        color: rgb(15 23 42);
        margin: 0;
        display: inline-block;
        line-height: 1.15;
      }

      .guide-title__bar {
        width: 33%;
        height: 1.5mm;
        background: var(--guide-accent);
        border-radius: 9999px;
        margin-top: 2mm;
        margin-bottom: 4mm;
      }

      .guide-body {
        font-size: 11.5px;
        line-height: 1.45;
        color: rgb(51 65 85);
      }
      .guide-body > * + * { margin-top: 10px; }

      .print-avoid-break {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .font-readex {
        font-family: Tajawal, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      }

      /* Screen layout: Show imposed pages when booklet mode is active */
      .guide-booklet[data-print-layout="booklet"] .guide-source-container {
        display: none !important;
      }

      .guide-booklet[data-print-layout="booklet"] .guide-imposed {
        display: flex !important;
        flex-direction: column;
        gap: 24px;
        align-items: center;
      }

      .guide-imposed {
        display: none;
      }

      .guide-a4-page {
        width: 297mm;
        height: 210mm;
        display: flex;
        align-items: stretch;
        justify-content: space-between;
        gap: 1mm;
        background: #fff;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
        overflow: hidden;
        margin-bottom: 24px;
      }

      .guide-a4-slot {
        width: 148mm;
        height: 210mm;
        overflow: hidden;
      }

      .guide-a4-slot > .guide-page {
        margin: 0 !important;
        box-shadow: none !important;
      }

      @media print {
        @page {
          ${layout === 'booklet' ? 'size: A4 landscape;' : 'size: A5; size: 148mm 210mm;'}
          margin: 0;
        }

        html, body {
          margin: 0;
          padding: 0;
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .guide-page {
          box-shadow: none;
          margin: 0;
          width: var(--a5-w);
          height: var(--a5-h);
        }

        .print\\:hidden { display: none !important; }
      }

      /* Print layout rules */
      @media print {
        .guide-booklet[data-print-layout="a5"] > section.guide-page {
          page-break-after: always;
          break-after: page;
        }

        /* In booklet mode we print imposed A4 spreads (2x A5 per sheet side) */
        .guide-booklet[data-print-layout="booklet"] .guide-source-container {
          display: none !important;
        }

        .guide-booklet[data-print-layout="booklet"] .guide-imposed {
          display: block !important;
        }

        .guide-a4-page {
          box-shadow: none !important;
          margin: 0 !important;
          page-break-after: always;
          break-after: page;
        }
      }
    `}</style>
  );
}
