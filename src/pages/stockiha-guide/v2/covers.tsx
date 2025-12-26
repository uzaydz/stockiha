import React from 'react';
import { Mail, Globe, Phone, ShieldCheck, Twitter, Facebook, Instagram, Zap, Hexagon } from 'lucide-react';

/* 
  Full Bleed Page Component
  Standard component for full-page designs without margins.
*/
export const FullBleedPage = ({ children, className = '', role }: { children: React.ReactNode; className?: string; role?: string }) => (
    <section className={`guide-page guide-page--full relative overflow-hidden flex flex-col ${className}`} data-guide-role={role}>
        {children}
    </section>
);

export function GuideCoverPageV2() {
    return (
        <FullBleedPage className="bg-slate-950 text-white" role="front-cover">

            {/* Minimalist Grid Pattern Background */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}
            />

            {/* Top Bar */}
            <div className="p-12 flex justify-between items-start z-10">
                <div className="flex items-center gap-2 text-orange-500">
                    <Hexagon className="w-6 h-6 fill-orange-500/20 stroke-orange-500" />
                    <span className="font-bold tracking-wider text-sm">STOCKIHA</span>
                </div>
                <div className="px-3 py-1 bg-white/10 rounded-full border border-white/10 text-[10px] font-mono tracking-widest text-slate-300">
                    V2.0 EDITION
                </div>
            </div>

            {/* Central Title Area - Swiss Style Typography */}
            <div className="flex-1 flex flex-col justify-center px-12 z-10">
                <div className="space-y-2 mb-8">
                    <span className="block text-orange-500 font-bold tracking-widest text-sm uppercase">User Manual & Documentation</span>
                    <h1 className="text-7xl font-black tracking-tighter text-white leading-[0.9]">
                        دليل<br />
                        المستخدم
                    </h1>
                </div>

                <p className="text-xl text-slate-400 font-light max-w-md leading-relaxed">
                    النظام الشامل لإدارة نقاط البيع، المخزون، والعملاء بذكاء وكفاءة عالية.
                </p>

                <div className="mt-12 flex items-center gap-6">
                    <div className="h-px w-12 bg-orange-500" />
                    <span className="text-sm font-mono text-slate-500">2024 - 2025</span>
                </div>
            </div>

            {/* Bottom Graphic Element */}
            <div className="h-32 bg-gradient-to-t from-orange-600/10 to-transparent w-full relative">
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-orange-400 to-slate-900" />
            </div>

        </FullBleedPage>
    );
}

export function GuideBackCoverPageV2() {
    return (
        <FullBleedPage className="bg-slate-50 text-slate-900" role="back-cover">
            {/* Subtle Texture */}
            <div className="absolute inset-0 opacity-[0.4] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />

            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 z-10">

                {/* Clean Icon */}
                <div className="mb-8 p-6 bg-white rounded-3xl shadow-xl shadow-slate-200/50 text-orange-600">
                    <Zap className="w-12 h-12 fill-orange-500" />
                </div>

                <h2 className="text-2xl font-black text-slate-900 mb-2">شريكك في النجاح</h2>
                <p className="text-slate-500 text-sm max-w-xs leading-relaxed mb-12">
                    نحن هنا لدعم نمو تجارتك. لا تتردد في التواصل مع فريقنا للحصول على المساعدة.
                </p>

                {/* Contact List - Clean & Minimal */}
                <div className="w-full max-w-xs bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-bold text-slate-700">خدمة العملاء</span>
                        </div>
                        <span className="text-xs font-mono text-slate-500" dir="ltr">+213 555 123 456</span>
                    </div>

                    <div className="p-4 border-b border-slate-100 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <Globe className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-bold text-slate-700">الموقع</span>
                        </div>
                        <span className="text-xs font-mono text-slate-500" dir="ltr">stockiha.com</span>
                    </div>

                    <div className="p-4 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-bold text-slate-700">الدعم</span>
                        </div>
                        <span className="text-xs font-mono text-slate-500" dir="ltr">help@stockiha.com</span>
                    </div>
                </div>

            </div>

            {/* Footer Area */}
            <div className="p-12 text-center z-10">
                <div className="flex justify-center gap-4 mb-6">
                    <a href="#" className="p-2 text-slate-400 hover:text-orange-500 transition-colors"><Twitter className="w-4 h-4" /></a>
                    <a href="#" className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Facebook className="w-4 h-4" /></a>
                    <a href="#" className="p-2 text-slate-400 hover:text-pink-600 transition-colors"><Instagram className="w-4 h-4" /></a>
                </div>
                <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase opacity-60">
                    Designed & Developed by Sira AI
                </p>
            </div>
        </FullBleedPage>
    );
}
