import React from 'react';
import { motion } from 'framer-motion';
import { Download, Monitor, Apple, Smartphone, Zap, ShieldCheck, WifiOff, RefreshCw, Printer, ScanBarcode, Database, Lock, Laptop } from 'lucide-react';

// --- MARQUEE CONSTANTS ---
const SYSTEM_FEATURES = [
    { title: 'يشتغل بلا أنترنت', subtitle: 'Offline Mode', icon: WifiOff, color: 'text-red-500' },
    { title: 'مزامنة تلقائية', subtitle: 'Auto Sync', icon: RefreshCw, color: 'text-blue-500' },
    { title: 'طباعة حرارية', subtitle: 'Thermal Print', icon: Printer, color: 'text-gray-400' },
    { title: 'قارئ الباركود', subtitle: 'Barcode Scanner', icon: ScanBarcode, color: 'text-brand' },
    { title: 'قاعدة بيانات آمنة', subtitle: 'Secure DB', icon: Database, color: 'text-green-500' },
    { title: 'نسخ احتياطي', subtitle: 'Auto Backup', icon: Lock, color: 'text-yellow-500' },
];

const COMPATIBILITY_TAGS = [
    { title: "Windows 10/11", icon: Monitor },
    { title: "macOS Silicon", icon: Apple },
    { title: "يدعم الـ TPV", icon: Monitor },
    { title: "سريع جداً", icon: Zap },
    { title: "حماية 100%", icon: ShieldCheck },
    { title: "بدون إشتراك شهري", icon: Lock }, // Maybe irrelevant for download tech specs, but good for marketing
    { title: "سهل التثبيت", icon: Download },
    { title: "خفيف على الـ PC", icon: Laptop },
];

const OS_CARD_VARIANTS = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const SystemReq = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0">
        <span className="text-gray-500 text-xs font-bold">{label}</span>
        <span className="text-gray-300 text-xs font-mono bg-white/5 px-1.5 py-0.5 rounded">{value}</span>
    </div>
);

// --- SHARED VISUAL UTILS (Consistent with CoursesPage) ---
const HeroBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Deep Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-brand/5 rounded-full blur-[120px] mix-blend-screen opacity-60"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-900/5 rounded-full blur-[150px]"></div>

        {/* Grain Overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150 brightness-100"></div>

        {/* Grid Line Animation */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] opacity-30"></div>
    </div>
);

export const DownloadPage: React.FC = () => {
    return (
        <div className="bg-[#020202] min-h-screen pt-32 pb-20 font-sans selection:bg-brand selection:text-white relative overflow-hidden">

            <HeroBackground />

            {/* 1. HERO SECTION: "The Infinite Flow" (DOWNLOAD VERSION) */}
            <section className="relative z-10 flex flex-col items-center text-center px-6 mb-24 overflow-hidden">

                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#111] border border-white/10 mb-8 shadow-xl backdrop-blur-md"
                >
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
                    </span>
                    <span className="text-xs font-bold text-gray-300 tracking-wide font-mono">
                        V2.4.0 STABLE 🚀
                    </span>
                </motion.div>

                {/* Headline */}
                <motion.h1
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-6 tracking-tighter w-full max-w-5xl mx-auto"
                >
                    حمل نظام
                    <span className="block text-brand drop-shadow-[0_0_30px_rgba(255,122,0,0.3)]">سطوكيها.</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-16 font-light leading-relaxed"
                >
                    البرنامج يخدم <span className="text-white font-bold">بلا أنترنت (Offline)</span>، ويتزامن تلقائياً (Sync) كي تكون متصل. متوافق مع كافة الأجهزة.
                </motion.p>

                {/* MARQUEE SECTION (Integrated into Hero) */}
                <div className="relative w-full max-w-[90vw] overflow-hidden flex flex-col gap-4 mb-16 dir-ltr">
                    <style>{`
                        .dir-ltr { direction: ltr; }
                        @keyframes scrollLeft {
                            0% { transform: translateX(0); }
                            100% { transform: translateX(-50%); }
                        }
                        @keyframes scrollRight {
                            0% { transform: translateX(-50%); }
                            100% { transform: translateX(0); }
                        }
                    `}</style>

                    {/* Gradient Fade Overlays */}
                    <div className="absolute top-0 left-0 h-full w-8 md:w-32 bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none"></div>
                    <div className="absolute top-0 right-0 h-full w-8 md:w-32 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none"></div>

                    {/* Row 1: System Features */}
                    <div className="flex w-max animate-[scrollLeft_40s_linear_infinite] hover:[animation-play-state:paused]">
                        <div className="flex gap-3 px-1.5">
                            {[...SYSTEM_FEATURES, ...SYSTEM_FEATURES, ...SYSTEM_FEATURES].map((feat, idx) => (
                                <div key={`f-${idx}`} className="flex items-center gap-3 px-6 py-3 bg-[#111] border border-white/5 rounded-xl hover:border-brand/30 transition-colors group min-w-[200px]">
                                    <div className={`p-2 rounded-lg bg-white/5 ${feat.color} group-hover:scale-110 transition-transform`}>
                                        <feat.icon className="w-5 h-5" />
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-white whitespace-nowrap">{feat.title}</div>
                                        <div className="text-[10px] text-gray-500 font-mono hidden md:block">{feat.subtitle}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Row 2: Compatibility Tags */}
                    <div className="flex w-max animate-[scrollRight_40s_linear_infinite] hover:[animation-play-state:paused]">
                        <div className="flex gap-3 px-1.5">
                            {[...COMPATIBILITY_TAGS, ...COMPATIBILITY_TAGS, ...COMPATIBILITY_TAGS].map((tag, idx) => (
                                <div key={`t-${idx}`} className="flex items-center gap-2 px-5 py-2 bg-[#0A0A0A] border border-white/5 rounded-lg hover:border-white/20 transition-colors min-w-[160px]">
                                    <tag.icon className="w-4 h-4 text-gray-400" />
                                    <div className="text-xs text-gray-300 font-bold whitespace-nowrap">{tag.title}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </section>

            {/* Download Cards */}
            <section className="max-w-6xl mx-auto px-6 mb-32 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Windows Card - Premium Glass */}
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={OS_CARD_VARIANTS}
                        className="bg-[#0F0F0F]/80 backdrop-blur-xl rounded-[32px] border border-white/10 p-1 relative overflow-hidden group hover:border-blue-500/50 transition-all duration-500"
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="bg-[#050505]/50 rounded-[28px] p-8 h-full relative z-10 flex flex-col">
                            <div className="flex justify-between items-start mb-10">
                                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                                    <Monitor className="w-8 h-8" />
                                </div>
                                <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold">
                                    الأكثر استخداماً
                                </div>
                            </div>

                            <h3 className="text-3xl font-black text-white mb-2">Windows (64-bit)</h3>
                            <p className="text-gray-400 mb-8 leading-relaxed">
                                يمشي في قاع لي بيسي (PC) ولي كاس (Caisse) اللي فيهم ويندوز 10 ولا 11.
                            </p>

                            <div className="mt-auto">
                                <button className="w-full py-4 bg-brand hover:bg-brand-hover text-white font-bold rounded-xl shadow-[0_4px_30px_rgba(255,122,0,0.3)] transition-all flex items-center justify-center gap-3 mb-8 group-hover:scale-[1.02] active:scale-95">
                                    <Download className="w-5 h-5" />
                                    تحميل مجاني (Télécharger)
                                </button>

                                <div className="bg-[#111] rounded-xl p-5 border border-white/5">
                                    <h4 className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">واش لازم يكون عندك (Minimum)</h4>
                                    <SystemReq label="نظام التشغيل" value="Windows 10, 11" />
                                    <SystemReq label="الرام (RAM)" value="4 GB وأكثر" />
                                    <SystemReq label="المعالج (CPU)" value="Intel i3 / AMD Ryzen 3" />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Mac Card - Premium Glass */}
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={OS_CARD_VARIANTS}
                        transition={{ delay: 0.1 }}
                        className="bg-[#0F0F0F]/80 backdrop-blur-xl rounded-[32px] border border-white/10 p-1 relative overflow-hidden group hover:border-gray-500/50 transition-all duration-500"
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="bg-[#050505]/50 rounded-[28px] p-8 h-full relative z-10 flex flex-col">
                            <div className="flex justify-between items-start mb-10">
                                <div className="w-16 h-16 bg-white/10 rounded-2xl border border-white/20 flex items-center justify-center text-white shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                    <Apple className="w-8 h-8 fill-current" />
                                </div>
                            </div>

                            <h3 className="text-3xl font-black text-white mb-2">macOS (Universal)</h3>
                            <p className="text-gray-400 mb-8 leading-relaxed">
                                نسخة سبيسيال للماك، خفيفة وسريعة. تدعم معالجات Apple Silicon (M1/M2/M3) و Intel.
                            </p>

                            <div className="mt-auto">
                                <button className="w-full py-4 bg-white hover:bg-gray-200 text-black font-bold rounded-xl shadow-[0_4px_30px_rgba(255,255,255,0.2)] transition-all flex items-center justify-center gap-3 mb-8 group-hover:scale-[1.02] active:scale-95">
                                    <Download className="w-5 h-5" />
                                    تحميل للماك
                                </button>

                                <div className="bg-[#111] rounded-xl p-5 border border-white/5">
                                    <h4 className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">واش لازم يكون عندك (Minimum)</h4>
                                    <SystemReq label="نظام التشغيل" value="macOS 11.0+" />
                                    <SystemReq label="الشريحة" value="M1/M2/M3 or Intel" />
                                    <SystemReq label="المساحة" value="500 MB Free" />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                </div>
            </section>

            {/* Mobile Apps Teaser */}
            <section className="max-w-4xl mx-auto px-6 mb-24 relative z-10">
                <div className="bg-[#0F0F0F]/50 border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden">
                    {/* Background Decor */}
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-brand/10 rounded-full blur-[80px]"></div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                        <div className="text-center md:text-right">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-bold mb-4">
                                <Zap className="w-3 h-3" />
                                قريباً (Coming Soon)
                            </div>
                            <h2 className="text-3xl font-black text-white mb-2">تطبيقات الهاتف (Mobile)</h2>
                            <p className="text-gray-400 max-w-md">
                                تقدر تسير المحل تاعك من التليفون. رانا خدامين على تطبيقات Android و iOS باش تكون الحالة ساهلة.
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex flex-col items-center gap-2 opacity-50 grayscale hover:grayscale-0 transition-all cursor-not-allowed">
                                <div className="w-14 h-14 rounded-2xl bg-[#222] flex items-center justify-center border border-white/10">
                                    <Smartphone className="w-7 h-7 text-green-500" />
                                </div>
                                <span className="text-xs font-bold text-gray-500">Android</span>
                            </div>
                            <div className="flex flex-col items-center gap-2 opacity-50 grayscale hover:grayscale-0 transition-all cursor-not-allowed">
                                <div className="w-14 h-14 rounded-2xl bg-[#222] flex items-center justify-center border border-white/10">
                                    <Apple className="w-7 h-7 text-white fill-current" />
                                </div>
                                <span className="text-xs font-bold text-gray-500">iOS</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Security / Trust */}
            <section className="text-center pb-10 relative z-10">
                <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    <span>برنامج نظيف 100% ومفيه حتى فيروس (Virus Free)</span>
                </div>
            </section>

        </div>
    );
};
