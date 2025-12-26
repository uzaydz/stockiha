import React, { useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useInView } from 'framer-motion';
import {
    Play,
    Zap,
    Users,
    Video,
    TrendingUp,
    Store,
    Smartphone,
    Monitor,
    MousePointer2,
    CheckCircle2,
    Globe,
    ShoppingBag,
    Music,
    Layout,
    Wrench,
    ArrowRightLeft,
    GraduationCap,
    Award,
    Calendar,
    Star,
    BarChart3,
    Target,
    ChevronRight,
    PlayCircle,
    ArrowDown,
    Lock
} from 'lucide-react';

// --- CONSTANTS FOR HERO MARQUEE ---
const COURSE_MODULES = [
    { title: 'التجارة الإلكترونية', subtitle: 'احتراف الـ E-commerce', icon: Globe, color: 'text-blue-500' },
    { title: 'التسويق الرقمي', subtitle: 'Digital Marketing', icon: TrendingUp, color: 'text-brand' },
    { title: 'تسيير المحلات', subtitle: 'Gestion de Stock', icon: Store, color: 'text-green-500' },
    { title: 'صناعة المحتوى', subtitle: 'Création de Contenu', icon: Video, color: 'text-purple-500' },
    { title: 'الإعلانات الممولة', subtitle: 'Facebook & TikTok Ads', icon: Zap, color: 'text-yellow-500' },
    { title: 'إدارة الفريق', subtitle: 'Gestion d\'équipe', icon: Users, color: 'text-red-500' },
];

const COURSE_TAGS = [
    { title: "شهادة معتمدة", icon: Award },
    { title: "تطبيق عملي 100%", icon: CheckCircle2 },
    { title: "سوق جزائري", icon: Target },
    { title: "مجتمع حصري", icon: Lock },
    { title: "دعم مباشر", icon: Users },
    { title: "تحديث مستمر", icon: Zap },
    { title: "خبراء", icon: Star },
    { title: "إعلانات فيسبوك", icon: TrendingUp },
    { title: "تيك توك", icon: Smartphone },
    { title: "إدارة مخزون", icon: Store },
    { title: "زيادة المبيعات", icon: BarChart3 }
];


// --- SHARED VISUAL UTILS ---

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

// --- BENTO GRID VISUALS ---

const AdsDashboardVisual = () => (
    <div className="w-full h-full bg-[#0F0F0F] relative overflow-hidden flex flex-col p-4 font-mono text-xs">
        <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-gray-400">الحالة: <span className="text-green-500 font-bold">نشطة (Active)</span></span>
            </div>
            <span className="text-gray-600">ID: #88291</span>
        </div>
        <div className="flex-1 relative flex items-end gap-1 mb-4 border-b border-white/5 pb-2">
            {[30, 45, 35, 60, 50, 75, 65, 90, 80, 100].map((h, i) => (
                <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    className="flex-1 bg-brand/20 rounded-t-sm hover:bg-brand transition-colors relative group"
                ></motion.div>
            ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#1A1A1A] rounded p-2 border border-white/5">
                <div className="text-[10px] text-gray-500">المصروف (Spend)</div>
                <div className="text-white font-bold">$1,240</div>
            </div>
            <div className="bg-[#1A1A1A] rounded p-2 border border-white/5">
                <div className="text-[10px] text-gray-500">العائد (ROAS)</div>
                <div className="text-green-500 font-bold">4.2x</div>
            </div>
        </div>
    </div>
);

const TikTokPhoneVisual = () => (
    <div className="w-full h-full flex items-center justify-center bg-[#080808]">
        <div className="w-28 h-48 bg-black rounded-[1.2rem] border-[3px] border-[#222] relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-black">
                <div className="w-full h-full opacity-50 relative">
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 animate-pulse"></div>
                </div>
                <div className="absolute bottom-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex flex-col gap-1 mb-2">
                        <div className="w-12 h-1 bg-white/80 rounded-full"></div>
                        <div className="w-20 h-1 bg-white/40 rounded-full"></div>
                    </div>
                </div>
                <div className="absolute right-1 bottom-10 flex flex-col gap-2 items-center">
                    <div className="w-5 h-5 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-white/10 backdrop-blur-md"></div>
                </div>
            </div>
        </div>
    </div>
);

const TransformationVisual = () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0F0F0F] relative overflow-hidden px-8">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10"></div>
        <div className="flex justify-between items-center w-full relative z-10">
            <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] border border-white/10 flex items-center justify-center">
                    <Store className="w-5 h-5 text-gray-500" />
                </div>
                <span className="text-[10px] text-gray-500 font-mono">المحل (Stock)</span>
            </div>

            <motion.div
                animate={{ x: [-5, 5, -5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center z-10"
            >
                <ArrowRightLeft className="w-4 h-4 text-brand" />
            </motion.div>

            <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1A1A1A] to-brand/5 border border-brand/50 flex items-center justify-center shadow-[0_0_20px_rgba(255,122,0,0.1)] relative">
                    <Globe className="w-5 h-5 text-white" />
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-black"></div>
                </div>
                <span className="text-[10px] text-brand font-mono">البيع أونلاين</span>
            </div>
        </div>
    </div>
);

// --- LEARNING PATH COMPONENT ---
const TimelineItem = ({ number, title, desc, icon: Icon, isLast }: any) => (
    <div className="relative flex gap-6 group">
        {!isLast && (
            <div className="absolute top-12 right-[19px] bottom-[-20px] w-px bg-white/10 group-hover:bg-brand/50 transition-colors"></div>
        )}
        <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-[#111] border border-white/10 flex items-center justify-center group-hover:border-brand/50 group-hover:scale-110 transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0)] group-hover:shadow-[0_0_20px_rgba(255,122,0,0.2)]">
            <Icon className="w-5 h-5 text-gray-400 group-hover:text-brand transition-colors" />
        </div>
        <div className="pb-10">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded border border-brand/20">المرحلة {number}</span>
                <h4 className="text-lg font-bold text-white">{title}</h4>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-md">{desc}</p>
        </div>
    </div>
);

// --- MAIN PAGE COMPONENT ---

export const CoursesPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#050505] text-white overflow-hidden font-sans">
            <HeroBackground />

            {/* 1. HERO SECTION: "The Infinite Flow" (ACADEMY VERSION) */}
            <section className="relative min-h-[90vh] flex flex-col items-center justify-center bg-[#050505] overflow-hidden">

                {/* Main Content Helper */}
                <div className="relative z-10 w-full flex flex-col gap-8 md:gap-16 pt-0 md:pt-20">

                    {/* Typography Block */}
                    <div className="text-center px-4 max-w-4xl mx-auto space-y-4 md:space-y-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-md"
                        >
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-brand animate-pulse"></span>
                            <span className="text-[9px] md:text-xs text-gray-300 font-mono tracking-wider">ACADEMY V2.0</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.1 }}
                            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-tight whitespace-nowrap"
                        >
                            تعلم التجارة
                            <span className="inline-block text-transparent bg-clip-text bg-gradient-to-br from-brand via-orange-400 to-yellow-500 mx-2 md:mx-4">
                                الحديثة
                            </span>
                            بالمجان
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.2 }}
                            className="text-base md:text-2xl text-gray-400 font-light max-w-sm md:max-w-2xl mx-auto leading-relaxed px-2 md:px-0"
                        >
                            من تاجر تقليدي إلى رائد أعمال رقمي. كورسات احترافية، وشروحات حصرية لمشتركي سطوكيها باش تطور مشروعك.
                        </motion.p>
                    </div>

                    {/* Marquee Container */}
                    <div className="relative w-full overflow-hidden flex flex-col gap-4 md:gap-6 dir-ltr">
                        <style>{`
                            .dir-ltr { direction: ltr; }
                            @keyframes scrollLeft {
                                0% { transform: translateX(0); }
                                100% { transform: translateX(-50%); }
                            }
                        `}</style>

                        {/* Gradient Fade Overlays */}
                        <div className="absolute top-0 left-0 h-full w-8 md:w-32 bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none"></div>
                        <div className="absolute top-0 right-0 h-full w-8 md:w-32 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none"></div>

                        {/* Row 1: The Modules (Right to Left) */}
                        <div className="flex w-max animate-[scrollLeft_40s_linear_infinite] md:animate-[scrollLeft_60s_linear_infinite] hover:[animation-play-state:paused]">
                            {/* Container 1 */}
                            <div className="flex gap-3 md:gap-4 px-1.5 md:px-2">
                                {[...COURSE_MODULES, ...COURSE_MODULES].map((module, idx) => (
                                    <div key={`m1-${idx}`} className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 bg-[#111] border border-white/5 rounded-2xl hover:border-brand/50 hover:bg-[#161616] transition-colors group cursor-default min-w-[160px] md:min-w-[200px]">
                                        <div className={`p-1.5 md:p-2 rounded-lg bg-white/5 ${module.color} group-hover:scale-110 transition-transform`}>
                                            <module.icon className="w-4 h-4 md:w-5 md:h-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs md:text-sm font-bold text-white whitespace-nowrap">{module.title}</div>
                                            <div className="text-[8px] md:text-[10px] text-gray-500 font-mono hidden md:block">{module.subtitle}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Container 2 */}
                            <div className="flex gap-3 md:gap-4 px-1.5 md:px-2">
                                {[...COURSE_MODULES, ...COURSE_MODULES].map((module, idx) => (
                                    <div key={`m2-${idx}`} className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 bg-[#111] border border-white/5 rounded-2xl hover:border-brand/50 hover:bg-[#161616] transition-colors group cursor-default min-w-[160px] md:min-w-[200px]">
                                        <div className={`p-1.5 md:p-2 rounded-lg bg-white/5 ${module.color} group-hover:scale-110 transition-transform`}>
                                            <module.icon className="w-4 h-4 md:w-5 md:h-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs md:text-sm font-bold text-white whitespace-nowrap">{module.title}</div>
                                            <div className="text-[8px] md:text-[10px] text-gray-500 font-mono hidden md:block">{module.subtitle}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Row 2: The Features/Tags (Right to Left) */}
                        <div className="flex w-max animate-[scrollLeft_50s_linear_infinite] md:animate-[scrollLeft_90s_linear_infinite] hover:[animation-play-state:paused]">
                            {/* Set 1 */}
                            <div className="flex gap-3 md:gap-4 px-1.5 md:px-2">
                                {[...COURSE_TAGS, ...COURSE_TAGS].map((tag, idx) => (
                                    <div key={`t1-${idx}`} className="flex items-center gap-2 md:gap-3 px-4 md:px-5 py-2 md:py-3 bg-[#0A0A0A] border border-white/5 rounded-xl hover:border-white/20 transition-colors min-w-[150px] md:min-w-[200px]">
                                        <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-gray-600"></div>
                                        <tag.icon className="w-3 h-3 text-gray-400" />
                                        <div className="text-[10px] md:text-xs text-gray-300 whitespace-nowrap">{tag.title}</div>
                                    </div>
                                ))}
                            </div>
                            {/* Set 2 */}
                            <div className="flex gap-3 md:gap-4 px-1.5 md:px-2">
                                {[...COURSE_TAGS, ...COURSE_TAGS].map((tag, idx) => (
                                    <div key={`t2-${idx}`} className="flex items-center gap-2 md:gap-3 px-4 md:px-5 py-2 md:py-3 bg-[#0A0A0A] border border-white/5 rounded-xl hover:border-white/20 transition-colors min-w-[150px] md:min-w-[200px]">
                                        <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-gray-600"></div>
                                        <tag.icon className="w-3 h-3 text-gray-400" />
                                        <div className="text-[10px] md:text-xs text-gray-300 whitespace-nowrap">{tag.title}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scroll Down Hint */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 1 }}
                    className="absolute bottom-5 md:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-500"
                >
                    <span className="text-[8px] md:text-[10px] tracking-[0.2em] font-mono uppercase">START LEARNING</span>
                    <div className="w-[1px] h-8 md:h-12 bg-gradient-to-b from-brand to-transparent"></div>
                </motion.div>
            </section>

            {/* 2. LEARNING PATH (TIMELINE) */}
            <section className="py-24 bg-[#080808] border-y border-white/5 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold mb-4 border border-blue-500/20">
                            <Target className="w-3 h-3" />
                            خارطة الطريق
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black text-white mb-6">مسار تعليمي ممنهج <br /><span className="text-gray-500">يعطيك الصحة</span></h2>
                        <p className="text-gray-400 leading-relaxed mb-8">
                            ما تتعلمش عشوائياً. خدمنا لك "طريق باين" يبدا معاك من "الزيرو" (كيفاش تفتح المتجر) حتى تولي "Pro" تفتح فروع وتجيري ليكيب تاعك، وتتقن الماركوتينغ (Ads).
                        </p>

                        <div className="bg-[#111] p-6 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="text-4xl font-bold text-brand">100%</div>
                                <div className="text-sm text-gray-400">محتوى عملي (Pratique)<br />على السوق الجزائري</div>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="w-full h-full bg-gradient-to-r from-brand to-yellow-500"></div>
                            </div>
                        </div>
                    </div>

                    <div className="pl-4 md:pl-10">
                        <div className="flex flex-col">
                            {[
                                { step: '01', title: 'التأسيس والرقمنة', desc: 'نريڨلو المتجر، ندخلو السلعة (Stock)، ونفهمو اللوجيسيال.', icon: Store },
                                { step: '02', title: 'الانطلاق والمبيعات', desc: 'كيفاش نبيعو، نتعاملو مع لي كليون، ونخرج السلعة.', icon: ShoppingBag },
                                { step: '03', title: 'التسويق الإلكتروني (Ads)', desc: 'كيفاش تطلق ليزادس (Sponsoring) وتجيب مبيعات أونلاين.', icon: TrendingUp },
                                { step: '04', title: 'التوسع والنمو', desc: 'قراءة الأرقام (Les Chiffres)، التقارير، وكيفاش تحل حوانت جدد.', icon: BarChart3 }
                            ].map((item, idx, arr) => (
                                <TimelineItem
                                    key={idx}
                                    number={item.step}
                                    title={item.title}
                                    desc={item.desc}
                                    icon={item.icon}
                                    isLast={idx === arr.length - 1}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. COURSES BENTO GRID */}
            <section className="py-24 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-black text-white mb-4">الدورات المتاحة</h2>
                    <p className="text-gray-400">مكتبة فيها كلش على التجارة، الماركوتينغ، والتسيير</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

                    {/* Featured Course: Transformation */}
                    <div className="md:col-span-12 lg:col-span-8 bg-[#0A0A0A] rounded-3xl border border-white/5 overflow-hidden flex flex-col md:flex-row group hover:border-brand/30 transition-all duration-500">
                        <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-center">
                            <div className="flex gap-2 mb-6">
                                <span className="px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold border border-brand/20">الأكثر طلباً</span>
                                <span className="px-3 py-1 rounded-full bg-white/5 text-gray-400 text-xs font-mono border border-white/5">42 درس</span>
                            </div>
                            <h3 className="text-3xl font-black text-white mb-4 leading-tight">
                                التحول الرقمي:<br />من المحل للمنصة
                            </h3>
                            <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                                هذه الدورة لاباز (La Base). تعلم كيفاش تربط الحانوت تاعك مع السيت (Site Web)، وتولي تبيع أونلاين وأوفلاين في نفس الوقت بلا مشاكل في السلعة.
                            </p>
                            <button className="w-fit px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2">
                                <Play className="w-4 h-4 fill-black" />
                                شاهد المقدمة باطل
                            </button>
                        </div>
                        <div className="w-full md:w-1/2 min-h-[300px] bg-[#050505] relative border-l border-white/5 flex items-center justify-center">
                            {/* Inner Visual Container */}
                            <div className="w-full h-full p-8">
                                <TransformationVisual />
                            </div>
                        </div>
                    </div>

                    {/* Facebook Ads */}
                    <div className="md:col-span-6 lg:col-span-4 bg-[#0A0A0A] rounded-3xl border border-white/5 overflow-hidden group hover:border-blue-500/30 transition-all duration-500 flex flex-col">
                        <div className="h-[240px] border-b border-white/5 relative">
                            <div className="absolute inset-0 bg-blue-500/5 mix-blend-overlay"></div>
                            <AdsDashboardVisual />
                        </div>
                        <div className="p-8 flex-1 flex flex-col">
                            <h3 className="text-2xl font-bold text-white mb-2">التسويق الإلكتروني (Ads)</h3>
                            <p className="text-sm text-gray-400 mb-6">احترف السبونسورينغ في فيسبوك، انستجرام، وتيك توك. تعلم كيفاش تستهدف (Targeting) وتحسب الفايدة (ROAS).</p>
                            <div className="mt-auto flex justify-between items-center group/link cursor-pointer">
                                <span className="flex items-center gap-1 text-yellow-500 text-xs font-bold"><Star className="w-3 h-3 fill-current" /> 4.9</span>
                                <span className="text-blue-500 text-xs font-bold group-hover/link:underline">شوف التفاصيل &uarr;</span>
                            </div>
                        </div>
                    </div>

                    {/* TikTok Special */}
                    <div className="md:col-span-6 lg:col-span-4 bg-[#0A0A0A] rounded-3xl border border-white/5 overflow-hidden group hover:border-pink-500/30 transition-all duration-500 flex flex-col">
                        <div className="h-[280px] border-b border-white/5 bg-[#000] relative flex items-center justify-center pt-8">
                            <TikTokPhoneVisual />
                        </div>
                        <div className="p-8 flex-1">
                            <h3 className="text-xl font-bold text-white mb-2">TikTok Viral Ads</h3>
                            <p className="text-sm text-gray-400">كيفاش تخدم فيديوهات شابة تطلع "طوندونس" (Viral) وتجيب لك مبيعات بزاف بأقل تكلفة.</p>
                        </div>
                    </div>

                    {/* E-commerce & Services */}
                    <div className="md:col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Course 1 */}
                        <div className="bg-[#0A0A0A] rounded-3xl border border-white/5 p-8 flex flex-col hover:border-green-500/30 transition-colors group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-green-500/20">
                                    <Layout className="w-6 h-6 text-green-500" />
                                </div>
                                <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-1 rounded border border-green-500/20">مستوى متوسط</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">تصميم متجر احترافي</h3>
                            <p className="text-sm text-gray-400 mb-8">تعلم كيفاش تبني وتزين المتجر تاعك في سطوكيها (Design) وتخليه يبان بروفيسيونال بلا ما تجيب مبرمج.</p>
                            <div className="mt-auto w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div className="w-[60%] h-full bg-green-500"></div>
                            </div>
                        </div>

                        {/* Course 2 */}
                        <div className="bg-[#0A0A0A] rounded-3xl border border-white/5 p-8 flex flex-col hover:border-purple-500/30 transition-colors group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-purple-500/20">
                                    <Monitor className="w-6 h-6 text-purple-500" />
                                </div>
                                <span className="text-[10px] bg-purple-500/10 text-purple-500 px-2 py-1 rounded border border-purple-500/20">قريباً</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">إدارة ورشات التصليح</h3>
                            <p className="text-sm text-gray-400 mb-8">كيفاش تنظم لي ريباراسيون (Réparation)، التذاكر، وتتبع حالة الهواتف مع لي كليون.</p>
                            <button className="mt-auto w-full py-2.5 rounded-xl border border-white/10 text-xs font-bold hover:bg-white hover:text-black transition-colors">
                                سجل في القائمة (Waitlist)
                            </button>
                        </div>
                    </div>

                </div>
            </section>

            {/* 4. LIVE EVENTS SECTION */}
            <section className="py-20 bg-[#111] border-t border-white/5 relative">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="flex items-center gap-2 text-red-500 font-bold mb-4 animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span className="text-xs tracking-widest uppercase">Live Streaming</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-6">لايفات كل سمانة <br />مع الخبراء</h2>
                        <p className="text-gray-400 text-lg leading-relaxed mb-8">
                            كل يوم خميس على الـ 20:00. نحكيو على جديد التجارة، نشوفو المتاجر تاعكم (Audit)، ونجاوبو على قاع الأسئلة التقنية.
                        </p>
                        <button className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-600/20 flex items-center gap-2">
                            <Video className="w-5 h-5" />
                            أشترك باش يلحقك التنبيه
                        </button>
                    </div>

                    <div className="bg-[#1A1A1A] p-8 rounded-3xl border border-white/10 relative overflow-hidden group">
                        {/* Card Glow */}
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-600/20 blur-[80px] rounded-full pointer-events-none group-hover:bg-red-600/30 transition-colors"></div>

                        <div className="flex items-center justify-between mb-8">
                            <div className="flex flex-col items-center bg-[#111] border border-white/10 p-3 rounded-xl min-w-[70px]">
                                <span className="text-3xl font-black text-white">20</span>
                                <span className="text-[10px] text-red-500 font-bold uppercase">أكتوبر</span>
                            </div>
                            <div className="flex -space-x-3 space-x-reverse">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className={`w-10 h-10 rounded-full border-2 border-[#1A1A1A] bg-gray-700`}></div>
                                ))}
                                <div className="w-10 h-10 rounded-full border-2 border-[#1A1A1A] bg-[#111] flex items-center justify-center text-xs text-white font-bold">+120</div>
                            </div>
                        </div>

                        <div>
                            <div className="text-sm text-red-400 font-bold mb-1">اللايف الجاي • الخميس 20:00</div>
                            <h3 className="text-2xl font-bold text-white mb-2">كيفاش تطلع لي كوموند: من 0 لـ 100 طلبية</h3>
                            <p className="text-sm text-gray-500">كيفاش تزيد في ميزانية الإشهار (Scaling) بلا ما تخسر دراهمك ويطيح الـ ROAS.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default CoursesPage;
