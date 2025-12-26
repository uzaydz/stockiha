import React from 'react';
import { Phone, Mail, Globe } from 'lucide-react';
import { FullBleedPage } from './FullBleedPage';

export function GuideCoverPage() {
  return (
    <FullBleedPage role="front-cover">
      <div className="relative h-full bg-white text-slate-900 overflow-hidden flex flex-col">
        <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
        <div className="absolute bottom-0 left-0 w-[320px] h-[320px] bg-gradient-to-tr from-slate-100 to-transparent rounded-tr-full" />

        <div className="w-full h-3 bg-primary" />

        <div className="flex-1 flex flex-col items-center justify-center text-center px-[12mm]">
          <div className="mb-12 relative">
            <div className="absolute inset-0 bg-primary blur-[80px] opacity-20 rounded-full" />
            <img src="./images/logo-new.webp" alt="Stockiha Logo" className="w-28 h-28 object-contain relative z-10 drop-shadow-2xl" />
          </div>

          <div className="space-y-5 max-w-[120mm]">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-primary" />
              الإصدار 2.0
            </div>

            <h1 className="text-[44px] font-black text-slate-900 font-readex leading-tight" style={{ letterSpacing: 0 }}>
              سطوكيها
            </h1>

            <div className="flex items-center justify-center gap-4">
              <div className="h-px w-14 bg-gradient-to-r from-transparent to-slate-300" />
              <p className="text-[13px] text-slate-500 font-medium">نظام إدارة التجارة الذكي</p>
              <div className="h-px w-14 bg-gradient-to-l from-transparent to-slate-300" />
            </div>
          </div>

          <p className="mt-10 text-slate-500 text-[12px] max-w-[110mm] mx-auto leading-relaxed">
            دليل مختصر وعملي لإدارة المبيعات، المخزون، العملاء، والعمليات اليومية بثبات ووضوح.
          </p>
        </div>

        <div className="pb-14 text-center space-y-3">
          <div className="flex justify-center gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`w-10 h-1.5 rounded-full ${i === 2 ? 'bg-primary' : 'bg-slate-200'}`} />
            ))}
          </div>
          <p className="text-slate-400 text-[10px] font-mono uppercase tracking-[0.2em]">POS • Inventory • E-Commerce</p>
        </div>
      </div>
    </FullBleedPage>
  );
}

export function GuideBackCoverPage() {
  return (
    <FullBleedPage role="back-cover">
      <div className="relative h-full bg-white text-slate-900 overflow-hidden flex flex-col">
        <div className="absolute top-0 left-0 w-[420px] h-[420px] bg-gradient-to-br from-slate-50 to-transparent rounded-br-full" />
        <div className="absolute bottom-0 right-0 w-[320px] h-[320px] bg-gradient-to-tl from-primary/10 to-transparent rounded-tl-full" />
        <div className="absolute top-0 left-0 w-full h-3 bg-primary" />

        <div className="flex-1 z-10 w-full max-w-[120mm] px-[12mm] flex flex-col items-center justify-center text-center">
          <div className="mb-10 relative">
            <div className="absolute inset-0 bg-slate-200 blur-[60px] opacity-40 rounded-full" />
            <img src="./images/logo-new.webp" alt="Stockiha" className="w-28 h-28 object-contain relative z-10 drop-shadow-xl mx-auto" />
          </div>

          <h3 className="text-[32px] font-black font-readex mb-2 text-slate-800" style={{ letterSpacing: 0 }}>
            سطوكيها
          </h3>
          <p className="text-slate-500 mb-10 text-[14px]">شريك نجاحك التجاري</p>

          <div className="text-right bg-slate-50/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="w-4 h-4" />
                <span className="font-bold text-[12px]">الدعم</span>
              </div>
              <span dir="ltr" className="font-mono text-[12px] text-slate-700">
                support@stockiha.com
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-700">
                <Globe className="w-4 h-4" />
                <span className="font-bold text-[12px]">الموقع</span>
              </div>
              <span dir="ltr" className="font-mono text-[12px] text-slate-700">
                www.stockiha.com
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-4 h-4" />
                <span className="font-bold text-[12px]">الهاتف</span>
              </div>
              <span dir="ltr" className="font-mono text-[12px] text-slate-700">
                +213 555 123 456
              </span>
            </div>
          </div>
        </div>

        <div className="pb-14 text-center space-y-3">
          <p className="text-slate-400 text-[10px] font-mono uppercase tracking-widest">Developed in Algeria</p>
          <div className="flex items-center justify-center gap-3 text-slate-400 text-[10px] font-mono uppercase tracking-widest opacity-70">
            <span>Smart POS</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>Inventory</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>E-Commerce</span>
          </div>
        </div>
      </div>
    </FullBleedPage>
  );
}
