import React, { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import {
    ChevronRight,
    PlayCircle,
    CheckCircle2,
    Star,
    ArrowDown,
    Download,
    WifiOff,
    RefreshCw,
    Smartphone,
    BarChart3,
    Headphones,
    Globe,
    Zap,
    LayoutGrid,
    Store
} from 'lucide-react';
import { getImagePath } from '@/lib/appImages';

// --- ROTATING TEXT COMPONENT ---
const ROTATING_WORDS = [
    "دراهمك 💰",
    "التجارة 🛒",
    "النجاح 📈",
    "الراحة 😌"
];

const HEADLINE_ROTATING_WORDS = [
    "دراهمك",
    "مشروعك",
    "أرباحك"
];

// --- MARQUEE FEATURES ---
const HERO_FEATURES = [
    { label: "يمشي بلا أنترنت (Offline)", icon: WifiOff },
    { label: "يتسجل وحدو (Auto Sync)", icon: RefreshCw },
    { label: "تطبيق في تليفونك (App)", icon: Smartphone },
    { label: "حسابات دقيقة", icon: BarChart3 },
    { label: "دعم فني (معاك ديما)", icon: Headphones },
    { label: "سيت ويب ليك (E-com)", icon: Globe },
    { label: "خفيف ويطير", icon: Zap },
    { label: "ساهل ماهل", icon: LayoutGrid },
    { label: "متجر بتصميم عصري", icon: Store },
];

const TypewriterText = () => {
    const { ref, inView } = useInView({ threshold: 0 });
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (!inView) return;
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [inView]);

    return (
        <span ref={ref} className="inline-block min-w-[120px] text-brand relative">
            <span
                key={index}
                className="block animate-fadeInUp"
            >
                {ROTATING_WORDS[index]}
            </span>
            <span className="absolute -bottom-2 inset-x-0 h-1 bg-brand/30 rounded-full blur-sm"></span>
        </span>
    );
};

// --- FLOATING UI CARDS ---
const SalesFloatingCard = ({ showAnimation }: { showAnimation: boolean }) => (
    <div className="bg-[#0A0A0A]/95 md:bg-[#0A0A0A]/80 md:backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.6)] w-48 flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center">
                <ArrowDown className="w-4 h-4 text-brand rotate-180" />
            </div>
            <div>
                <div className="text-[10px] text-gray-400">المبيعات دقيقة هذي</div>
                <div className="text-white font-bold text-sm">+ 12,500 دج</div>
            </div>
        </div>
        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            {showAnimation && <div className="h-full w-[70%] bg-brand rounded-full animate-pulse"></div>}
        </div>
    </div>
);

const NotificationFloatingCard = () => (
    <div className="bg-[#111]/95 md:bg-[#111]/90 md:backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.6)] flex items-center gap-3 w-56">
        <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <img src={getImagePath("/logo-new.ico")} className="w-5 h-5 opacity-80" alt="logo" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#111]"></div>
        </div>
        <div>
            <div className="text-white font-bold text-xs flex justify-between w-full gap-8">
                <span>كوموند جديدة 📦</span>
                <span className="text-[9px] text-gray-500 font-normal">غير كيما</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">جاتك طلبية من عند محمد</div>
        </div>
    </div>
);

const InventoryFloatingCard = ({ showAnimation }: { showAnimation: boolean }) => (
    <div className="bg-[#0F0F0F] border border-white/10 p-3 rounded-xl shadow-2xl flex flex-col gap-2 w-40">
        <div className="flex justify-between items-center text-[10px] text-gray-400">
            <span>السلعة قريب تخلص</span>
            {showAnimation && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>}
        </div>
        <div className="flex items-center gap-2">
            <div className="w-8 h-10 bg-white/5 rounded border border-white/5"></div>
            <div>
                <div className="text-white text-xs font-bold">Iphone 15</div>
                <div className="text-[9px] text-red-400">باقيين 2 حبات برك</div>
            </div>
        </div>
    </div>
);

export const Hero: React.FC<{ onNavigate: (page: any) => void }> = ({ onNavigate }) => {
    const { ref, inView } = useInView({ threshold: 0 });
    const [headlineIndex, setHeadlineIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        if (!inView) return;
        const interval = setInterval(() => {
            setHeadlineIndex((prev) => (prev + 1) % HEADLINE_ROTATING_WORDS.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [inView]);

    return (
        <section ref={ref} className="relative min-h-screen flex flex-col justify-center pt-32 pb-20 overflow-hidden bg-[#050505]">

            {/* Background Effects */}
            {/* Background Effects - Optimized */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Subtle Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
                {/* Deep Ambient Glow - Reduced blur for mobile */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-brand/5 rounded-full blur-[120px] mix-blend-screen opacity-60"></div>
            </div>

            <div className="max-w-7xl mx-auto px-6 w-full relative z-10">

                <div className="flex flex-col items-center text-center">

                    {/* Top Pill Badge */}
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#111] border border-white/10 mb-8 shadow-xl backdrop-blur-md hover:border-brand/30 transition-colors cursor-default ${isVisible ? 'animate-fadeInDown' : 'opacity-0'}`}>
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs font-bold text-gray-300 tracking-wide">
                            أقوى لوجيسيال جيستيون في الجزائر 🇩🇿
                        </span>
                    </div>

                    {/* Main Headline - Dynamic & Professional */}
                    <div className="mb-6 relative w-full flex flex-col items-center">
                        {/* Brand Name - Standalone & Huge */}
                        <h1 className={`text-6xl md:text-8xl font-black text-brand mb-4 tracking-tighter text-center w-full drop-shadow-2xl ${isVisible ? 'animate-fadeInScale' : 'opacity-0'}`}>
                            سطوكيها
                        </h1>

                        <div className={`text-4xl md:text-5xl font-bold tracking-tight leading-tight text-white max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-center gap-y-0 md:gap-x-3 ${isVisible ? 'animate-fadeInUp animation-delay-100' : 'opacity-0'}`}>
                            <span className="whitespace-nowrap">نظم تجارتك وكبّر</span>

                            {/* Robust Animated Container - Auto Width for True Centering */}
                            <div className="relative h-12 md:h-16 w-auto min-w-[240px] overflow-visible flex items-center justify-center md:justify-start">
                                <span
                                    key={headlineIndex}
                                    className="absolute text-brand w-full text-center md:text-start font-black animate-slideUp"
                                >
                                    {HEADLINE_ROTATING_WORDS[headlineIndex]}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Subheadline */}
                    {/* Subheadline - H2 for SEO */}
                    <h2 className={`text-base md:text-xl text-gray-300 font-medium leading-relaxed max-w-3xl mx-auto mb-10 ${isVisible ? 'animate-fadeInUp animation-delay-200' : 'opacity-0'}`}>
                        المنصة الوحيدة في الجزائر لي تمدلك <span className="text-white font-bold">برنامج تسيير (POS)</span> + <span className="text-white font-bold">متجر إلكتروني (E-com)</span> في اشتراك واحد.
                        <br className="hidden md:block" />
                        نظم سلعتك، أحسب دراهمك، وبيع في 58 ولاية... كلش مريقل وفي بلاصة وحدة.
                    </h2>

                    {/* CTA Buttons */}
                    <div className={`flex flex-col sm:flex-row items-center gap-4 mb-20 w-full justify-center ${isVisible ? 'animate-fadeInUp animation-delay-300' : 'opacity-0'}`}>
                        <button
                            onClick={() => onNavigate('download')}
                            className="h-14 px-8 rounded-full bg-brand text-white text-lg font-bold transition-all hover:bg-brand-hover shadow-[0_0_40px_rgba(255,122,0,0.2)] hover:shadow-[0_0_60px_rgba(255,122,0,0.4)] hover:scale-105 w-full sm:w-auto flex items-center justify-center gap-2 group"
                        >
                            بدا جرب باطل (5 أيام)
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-[-4px] transition-transform rtl:rotate-180" />
                        </button>
                        <button className="h-14 px-8 rounded-full bg-[#1A1A1A] border border-white/10 text-white font-medium hover:bg-white/5 hover:border-white/20 transition-all w-full sm:w-auto flex items-center justify-center gap-2 group">
                            <PlayCircle className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                            تفرج ديمو خفيف
                        </button>
                    </div>

                    {/* GENIUS HERO COMPOSITION */}
                    <div className="relative w-full max-w-7xl mx-auto mt-16 perspective-2000 px-4 md:px-0" style={{ perspective: '2000px' }}>

                        {/* Main Floating Container */}
                        <div className={`relative z-10 group transform-gpu ${isVisible ? 'animate-fadeInUp animation-delay-400' : 'opacity-0'}`}>
                            {/* 1. The Main Dashboard Interface */}
                            <div className="relative z-10 bg-[#0F0F0F] rounded-2xl border border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden w-[94%] md:w-[85%] mx-auto">
                                {/* Screen Image (Full Height, No Header) */}
                                <div className="relative">
                                    <img
                                        src={getImagePath("/hero-dashboard.png")}
                                        alt="واجهة نظام سطوكيها"
                                        className="w-full h-auto opacity-90"
                                        width={1200}
                                        height={675}
                                        loading="eager"
                                        decoding="async"
                                    />
                                    {/* Glossy Reflection */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
                                </div>
                            </div>

                            {/* BEHIND: Seamless Infinite Marquee Tabs */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] md:w-[120%] h-14 md:h-24 bg-[#111]/95 md:bg-[#111]/90 border-y border-white/5 md:backdrop-blur-xl flex items-center -rotate-3 z-0 overflow-hidden shadow-2xl">

                                {/* Fade Gradient */}
                                <div className="absolute left-0 w-16 md:w-32 h-full bg-gradient-to-r from-[#0F0F0F] to-transparent z-10"></div>
                                <div className="absolute right-0 w-16 md:w-32 h-full bg-gradient-to-l from-[#0F0F0F] to-transparent z-10"></div>

                                <div className="flex relative w-full" dir="ltr">
                                    <style>{`
                                        @keyframes scrollInfo {
                                            0% { transform: translateX(0); }
                                            100% { transform: translateX(-100%); }
                                        }
                                        .animate-scroll-info {
                                            animation: scrollInfo 30s linear infinite;
                                        }
                                    `}</style>

                                    {/* Group 1 */}
                                    <div className="flex shrink-0 animate-scroll-info items-center gap-8 md:gap-16 pr-8 md:pr-16 pl-8 md:pl-16">
                                        {HERO_FEATURES.map((item, i) => (
                                            <div key={`g1-${i}`} className="flex items-center gap-2 md:gap-4 opacity-70 cursor-default hover:opacity-100 transition-opacity duration-300">
                                                <item.icon className="w-5 h-5 md:w-8 md:h-8 text-brand shrink-0" />
                                                <span className="text-sm md:text-2xl text-white font-black tracking-tighter whitespace-nowrap">{item.label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Group 2 (Duplicate for Seamless Loop) */}
                                    <div className="flex shrink-0 animate-scroll-info items-center gap-8 md:gap-16 pr-8 md:pr-16 pl-8 md:pl-16">
                                        {HERO_FEATURES.map((item, i) => (
                                            <div key={`g2-${i}`} className="flex items-center gap-2 md:gap-4 opacity-70 cursor-default hover:opacity-100 transition-opacity duration-300">
                                                <item.icon className="w-5 h-5 md:w-8 md:h-8 text-brand shrink-0" />
                                                <span className="text-sm md:text-2xl text-white font-black tracking-tighter whitespace-nowrap">{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 2. Floating Elements (The 'Genius' Part) */}

                            {/* Left Desktop / Top Right Mobile: Mobile Notification */}
                            <div className={`absolute -right-2 top-4 md:right-auto md:-left-2 md:top-1/3 z-20 block scale-[0.7] md:scale-100 origin-top-right md:origin-center ${isVisible ? 'animate-slideInLeft animation-delay-500' : 'opacity-0'}`}
                                style={{ transform: 'translateZ(50px)' }}
                            >
                                <NotificationFloatingCard />
                                {/* Connecting Line (Desktop) */}
                                <div className="hidden md:block absolute top-1/2 -right-12 w-12 h-[1px] bg-gradient-to-r from-transparent to-white/20"></div>
                            </div>

                            {/* Right Desktop / Bottom Left Mobile: Live Sales */}
                            <div className={`absolute -left-2 bottom-20 md:left-auto md:-right-4 md:top-1/4 z-20 block scale-[0.7] md:scale-100 origin-bottom-left md:origin-center ${isVisible ? 'animate-slideInRight animation-delay-600' : 'opacity-0'}`}
                                style={{ transform: 'translateZ(80px)' }}
                            >
                                <SalesFloatingCard showAnimation={isVisible} />
                                {/* Connecting Line (Desktop) */}
                                <div className="hidden md:block absolute top-1/2 -left-12 w-12 h-[1px] bg-gradient-to-l from-transparent to-brand/30"></div>
                            </div>

                            {/* Bottom Right: Inventory Alert (Hidden on Mobile) */}
                            <div className={`absolute -right-8 bottom-10 z-30 hidden md:block ${isVisible ? 'animate-fadeInUp animation-delay-700' : 'opacity-0'}`}
                                style={{ transform: 'translateZ(100px)' }}
                            >
                                <InventoryFloatingCard showAnimation={isVisible} />
                            </div>

                        </div>

                        {/* Glow effect under the whole assembly */}
                        {/* Glow effect under the whole assembly - Hidden on mobile for perf */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[50%] bg-brand/10 blur-[100px] rounded-full pointer-events-none z-0 hidden md:block"></div>

                    </div>

                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 text-gray-500 opacity-50 animate-bounce">
                <span className="text-[10px] uppercase tracking-widest">SCROLL</span>
                <ArrowDown className="w-4 h-4" />
            </div>

        </section>
    );
};
