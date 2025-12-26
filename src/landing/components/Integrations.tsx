import React from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Zap, Printer, Box, RefreshCw, CheckCircle2, Truck, ArrowRight } from 'lucide-react';

// --- SHARED COMPONENTS ---

const CourierLogo: React.FC<{ letter: string, color: string }> = ({ letter, color }) => (
    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white font-bold text-base shadow-lg transform-gpu`}>
        {letter}
    </div>
);

const CompanyLogo: React.FC<{ name: string, color: string, logo: React.ReactNode }> = ({ name, color, logo }) => (
    <div className="flex items-center gap-3 px-6 py-4 bg-[#141414] border border-white/5 rounded-2xl hover:border-brand/30 transition-all duration-300 group min-w-[180px] cursor-default hover:bg-[#1A1A1A] transform-gpu">
        <div className="grayscale group-hover:grayscale-0 transition-all duration-300 scale-90 group-hover:scale-100">
            {logo}
        </div>
        <span className="text-base font-bold text-gray-500 group-hover:text-white transition-colors">{name}</span>
    </div>
);

// --- VISUAL: CLEAR FLOW MOCKUP ---

const ClearFlowVisual = () => {
    const ref = React.useRef(null);
    const isInView = useInView(ref, { margin: "-50px" });

    return (
        <div ref={ref} className="w-full max-w-4xl mx-auto h-[400px] md:h-[350px] bg-[#0A0A0A] rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 p-6 md:p-10 group">

            {/* 1. STOUKIHA ORDER (Source) */}
            <div className="relative z-10 w-64 bg-[#141414] rounded-2xl border border-white/10 shadow-xl flex flex-col">
                <div className="h-10 border-b border-white/5 bg-[#1A1A1A] rounded-t-2xl flex items-center px-4 justify-between">
                    <span className="text-[10px] font-bold text-gray-400">STOUKIHA PANEL</span>
                    <div className="w-2 h-2 rounded-full bg-brand"></div>
                </div>
                <div className="p-5 space-y-4">
                    <div className="flex gap-3 items-center">
                        <div className="w-10 h-10 bg-white/5 rounded-lg border border-white/5"></div>
                        <div>
                            <div className="h-2 w-24 bg-white/20 rounded mb-1.5"></div>
                            <div className="h-2 w-16 bg-white/10 rounded"></div>
                        </div>
                    </div>
                    <div className="h-8 w-full bg-brand rounded-lg flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-lg shadow-brand/20">
                        <span className="text-xs font-bold text-white">تأكيد الطلب</span>
                    </div>
                </div>
            </div>

            {/* ARROW & SYNC ANIMATION */}
            <div className="relative flex flex-col items-center justify-center gap-2 z-10 transform-gpu rotate-90 md:rotate-0 will-change-transform opacity-90 md:opacity-100">
                <div className="text-[10px] font-bold text-brand uppercase tracking-widest bg-brand/10 px-2 py-1 rounded border border-brand/20">Auto API</div>
                <div className="flex gap-1">
                    {isInView && (
                        <>
                            <motion.div
                                initial={{ opacity: 0.2 }}
                                animate={{ opacity: [0.2, 1, 0.2] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                                className="w-2 h-2 rounded-full bg-white"
                            />
                            <motion.div
                                initial={{ opacity: 0.2 }}
                                animate={{ opacity: [0.2, 1, 0.2] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                                className="w-2 h-2 rounded-full bg-white"
                            />
                            <motion.div
                                initial={{ opacity: 0.2 }}
                                animate={{ opacity: [0.2, 1, 0.2] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                                className="w-2 h-2 rounded-full bg-white"
                            />
                        </>
                    )}
                </div>
                <ArrowRight className="w-6 h-6 text-gray-600 hidden md:block" />
            </div>

            {/* 2. COURIER TICKET (Result) */}
            <div className="relative z-10 w-64 bg-white text-black rounded-2xl shadow-xl flex flex-col font-mono overflow-hidden transform group-hover:scale-105 transition-transform duration-500">
                <div className="bg-red-600 h-10 flex items-center justify-between px-4 text-white">
                    <span className="font-bold text-xs italic">Yalidine</span>
                    <Truck className="w-4 h-4" />
                </div>
                <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">Tracking No.</p>
                            <p className="text-sm font-bold">YAL-202938</p>
                        </div>
                        <Printer className="w-5 h-5 text-gray-300" />
                    </div>

                    <div className="mt-auto space-y-2">
                        <div className="h-8 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAABCAYAAAD5PA/NAAAAFklEQVR42mN88f79f0DEhDEwMJA4AAB/9gXuvlvQJAAAAABJRU5ErkJggg==')] bg-repeat-x opacity-70"></div>
                        <div className="flex items-center gap-2 bg-green-50 p-2 rounded">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            <span className="text-[10px] font-bold text-green-700">تم إنشاء البوصلة</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[80%] bg-gradient-to-r from-brand/5 to-purple-500/5 blur-3xl -z-10 rounded-full"></div>

        </div>
    );
};

// --- MARQUEE ROW ---

const MarqueeRow = ({ items, speed, direction = 'left' }: { items: any[], speed: number, direction?: 'left' | 'right' }) => {
    // Duplicate enough times to fill screen seamlessly
    const content = [...items, ...items, ...items, ...items];

    // Inline keyframes calculation
    const animationName = direction === 'left' ? 'scrollLeft' : 'scrollRight';

    return (
        <div className="overflow-hidden relative w-full flex">
            <div
                className="flex gap-4 px-2 w-max hover:[animation-play-state:paused] transform-gpu will-change-transform"
                style={{
                    animation: `${animationName} ${speed}s linear infinite`
                }}
            >
                {content.map((co, i) => (
                    <CompanyLogo key={i} name={co.name} color={co.color} logo={<CourierLogo letter={co.letter} color={co.color} />} />
                ))}
            </div>
        </div>
    );
}

export const Integrations: React.FC = () => {
    const ROW_1 = [
        { name: "Yalidine", color: "bg-red-600", letter: "Y" },
        { name: "ZR Express", color: "bg-orange-500", letter: "Z" },
        { name: "Maystro", color: "bg-blue-600", letter: "M" },
        { name: "Gauden", color: "bg-yellow-500", letter: "G" },
        { name: "Echost", color: "bg-purple-600", letter: "E" },
    ];
    const ROW_2 = [
        { name: "Nord Ouest", color: "bg-cyan-600", letter: "N" },
        { name: "ProColis", color: "bg-green-600", letter: "P" },
        { name: "Wilaya 58", color: "bg-indigo-600", letter: "W" },
        { name: "Flash", color: "bg-pink-600", letter: "F" },
        { name: "Vip 58", color: "bg-rose-500", letter: "V" },
    ];

    return (
        <section id="integrations" className="py-24 bg-white dark:bg-[#050505] overflow-hidden relative">

            {/* Inject Keyframes Locally to guarantee movement */}
            <style >{`
        @keyframes scrollLeft {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        @keyframes scrollRight {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0); }
        }
      `}</style>

            <div className="max-w-7xl mx-auto px-6 mb-20 relative z-10">
                <div className="flex flex-col md:flex-row items-end justify-between gap-10 mb-16">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/5 border border-brand/10 text-brand text-[10px] font-bold mb-4 uppercase tracking-widest">
                            <Zap className="w-3 h-3" />
                            Logistics & API
                        </div>
                        {/* REDUCED FONT SIZE HERE */}
                        <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-6 leading-[1.4]">
                            وداعاً لكتابة الطرود يدوياً. <br />
                            <span className="inline-block mt-4 text-brand">30+ شركة توصيل مربوطة.</span>
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed max-w-xl">
                            كي تجيك طلبية، ما تشقيش روحك تعاود تكتب المعلومات في السيت تاع yalidine ولا zr express.
                            سطوكيها يبعث كلش أوتوماتيك ويخرجلك البوصلة (Bordereau) واجدة Imprimi برك.
                        </p>
                    </div>
                </div>

                <ClearFlowVisual />

            </div>

            <div className="relative w-full overflow-hidden flex flex-col gap-6" dir="ltr">
                {/* Gradient Overlays */}
                <div className="absolute top-0 left-0 h-full w-24 bg-gradient-to-r from-white dark:from-[#050505] to-transparent z-10 pointer-events-none"></div>
                <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-white dark:from-[#050505] to-transparent z-10 pointer-events-none"></div>

                <MarqueeRow items={ROW_1} speed={40} direction="left" />
                <MarqueeRow items={ROW_2} speed={50} direction="right" />
            </div>

        </section>
    );
};
