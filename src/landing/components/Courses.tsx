import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Play, Clock, CheckCircle2, TrendingUp, ShoppingBag, Globe, Zap, Heart, MessageCircle, Share2, MousePointer2 } from 'lucide-react';

// --- VISUALS ---

const VisualContainer = ({ children }: { children?: React.ReactNode }) => (
    <div className="w-full h-44 bg-[#0F0F0F] relative overflow-hidden flex items-center justify-center border-b border-white/5 group-hover:bg-[#111] transition-colors duration-500">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent opacity-20 pointer-events-none"></div>
        {children}
    </div>
);

const FacebookAdVisual = () => (
    <div className="w-[180px] bg-white dark:bg-[#1A1A1A] rounded-lg border border-gray-200 dark:border-white/5 p-2 shadow-2xl relative transform rotate-[-3deg] group-hover:rotate-0 transition-transform duration-500">
        {/* Ad Header */}
        <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-[10px]">f</div>
            <div>
                <div className="h-1.5 w-16 bg-gray-200 dark:bg-white/20 rounded-full mb-1"></div>
                <div className="text-[6px] text-gray-400">Sponsored • Public</div>
            </div>
        </div>
        {/* Ad Image */}
        <div className="aspect-video bg-gray-100 dark:bg-[#111] rounded mb-2 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent"></div>
            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-blue-600 text-[6px] text-white font-bold rounded">LEARN MORE</div>
        </div>
        {/* Engagement */}
        <div className="h-2 w-full bg-gray-100 dark:bg-white/5 rounded"></div>
    </div>
);

const TikTokVisual = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { margin: "-20px" });

    return (
        <div ref={ref} className="w-[100px] h-[160px] bg-black rounded-[1rem] border border-gray-800 relative shadow-2xl transform rotate-[3deg] group-hover:rotate-0 transition-transform duration-500 overflow-hidden">
            {/* Video Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80"></div>

            {/* Right Sidebar actions */}
            <div className="absolute right-1 bottom-8 flex flex-col gap-2 items-center">
                <div className="flex flex-col items-center">
                    <div className="p-1 rounded-full bg-white/10 backdrop-blur-sm mb-0.5"><Heart className="w-3 h-3 text-red-500 fill-red-500" /></div>
                    <span className="text-[6px] text-white font-bold">12k</span>
                </div>
                <div className="flex flex-col items-center">
                    <div className="p-1 rounded-full bg-white/10 backdrop-blur-sm mb-0.5"><MessageCircle className="w-3 h-3 text-white" /></div>
                    <span className="text-[6px] text-white font-bold">450</span>
                </div>
                <div className="flex flex-col items-center">
                    <div className="p-1 rounded-full bg-white/10 backdrop-blur-sm mb-0.5"><Share2 className="w-3 h-3 text-white" /></div>
                </div>
            </div>

            {/* Caption */}
            <div className="absolute bottom-3 left-2 z-10 w-2/3">
                <div className="h-1 w-12 bg-white/80 rounded mb-1"></div>
                <div className="h-1 w-20 bg-white/50 rounded"></div>
            </div>

            {/* Music Disc */}
            <div className={`absolute bottom-3 right-2 w-5 h-5 rounded-full bg-[#111] border border-gray-700 flex items-center justify-center ${isInView ? 'animate-spin' : ''}`}>
                <div className="w-2 h-2 rounded-full bg-gradient-to-tr from-white to-gray-500"></div>
            </div>
        </div>
    );
};

const StoukihaVisual = () => (
    <div className="w-[180px] h-[120px] bg-[#1A1A1A] rounded-lg border border-white/10 p-2 relative shadow-2xl group-hover:scale-105 transition-transform">
        {/* Dashboard Header */}
        <div className="h-4 border-b border-white/5 mb-2 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500/50"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50"></div>
            <div className="h-1 w-12 bg-white/10 rounded ml-2"></div>
        </div>
        {/* Grid Content */}
        <div className="grid grid-cols-4 gap-1 h-16">
            <div className="col-span-1 bg-white/5 rounded h-full"></div>
            <div className="col-span-3 grid grid-rows-2 gap-1">
                <div className="bg-brand/10 border border-brand/20 rounded relative hover:bg-brand/20 transition-colors cursor-pointer group/btn">
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[6px] text-brand font-bold">ADD PRODUCT</span>
                    {/* Cursor */}
                    <div className="absolute -bottom-2 -right-2 transform translate-x-0 translate-y-0 text-white drop-shadow-lg">
                        <MousePointer2 className="w-4 h-4 fill-black" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-1">
                    <div className="bg-white/5 rounded"></div>
                    <div className="bg-white/5 rounded"></div>
                </div>
            </div>
        </div>
    </div>
);

const EcomGrowthVisual = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { margin: "-20px" });

    return (
        <div ref={ref} className="w-[180px] h-[120px] bg-[#161616] rounded-lg border border-white/10 p-3 relative shadow-2xl flex flex-col justify-end overflow-hidden group-hover:-translate-y-1 transition-transform">
            {/* Chart Line */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                <path d="M0,120 L30,100 L60,110 L90,60 L120,70 L150,20 L180,10" fill="none" stroke="#22c55e" strokeWidth="2" />
                <path d="M0,120 L30,100 L60,110 L90,60 L120,70 L150,20 L180,10 V120 H0 Z" fill="url(#greenGradient)" stroke="none" />
                <defs>
                    <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Sale Notification */}
            {isInView && (
                <div className="absolute top-4 right-2 bg-[#222] border border-green-500/30 rounded px-2 py-1 flex items-center gap-2 shadow-lg animate-bounce">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div className="flex flex-col">
                        <span className="text-[6px] text-gray-400">NEW ORDERS</span>
                        <span className="text-[8px] text-white font-bold">+12 Sales</span>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- DATA ---

const COURSES = [
    {
        id: 1,
        title: "إعلانات فيسبوك (Facebook Ads)",
        desc: "الفيسبوك راهو غالي؟ تعلم كيفاش تستهدف الكليون لي يشري صح، بأقل تكلفة (Cost Per Result).",
        duration: "3.5 ساعات",
        lessons: "12 درس",
        originalPrice: "5,000",
        visual: <FacebookAdVisual />
    },
    {
        id: 2,
        title: "أسرار التيك توك (Viral)",
        desc: "كيفاش تخلي الفيديو تاعك يطرطق (Viral) وتجيب مبيعات بلا ما تخسر دراهم كبار في الإشهار.",
        duration: "2 ساعة",
        lessons: "8 دروس",
        originalPrice: "4,000",
        visual: <TikTokVisual />
    },
    {
        id: 3,
        title: "احتراف سيستام سطوكيها",
        desc: "دورة تطبيقية (خطوة بخطوة) تعلمك كيفاش تسيري الحانوت، السطوك، والخدامين كيما المحترفين.",
        duration: "1.5 ساعة",
        lessons: "6 دروس",
        originalPrice: "2,000",
        visual: <StoukihaVisual />
    },
    {
        id: 4,
        title: "تطوير التجارة (Scaling)",
        desc: "كيفاش تفتح أكثر من فرع، وكيفاش تتعامل مع شركات التوصيل والضرائب.",
        duration: "4 ساعات",
        lessons: "15 درس",
        originalPrice: "3,000",
        visual: <EcomGrowthVisual />
    }
];

const CourseCard: React.FC<{ course: typeof COURSES[0] }> = ({ course }) => {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
            }}
            className="group bg-[#0A0A0A] border border-white/5 rounded-2xl overflow-hidden hover:border-brand/30 transition-all duration-300 hover:shadow-2xl hover:shadow-brand/5 flex flex-col transform-gpu will-change-transform"
        >
            {/* Visual Header */}
            <VisualContainer>
                {course.visual}
            </VisualContainer>

            {/* Content Body */}
            <div className="p-5 flex flex-col flex-1 border-t border-white/5 bg-[#141414]">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono bg-white/5 px-2 py-1 rounded">
                        <Clock className="w-3 h-3" />
                        {course.duration}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono bg-white/5 px-2 py-1 rounded">
                        <Play className="w-3 h-3 text-brand" />
                        {course.lessons}
                    </div>
                </div>

                <h3 className="text-base font-bold text-white mb-2 group-hover:text-brand transition-colors">
                    {course.title}
                </h3>
                <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                    {course.desc}
                </p>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5 border-dashed">
                    <div className="flex flex-col">
                        <span className="text-[8px] text-gray-600">قيمتها</span>
                        <div className="text-[10px] text-gray-500 line-through decoration-red-500 decoration-2">
                            {course.originalPrice} دج
                        </div>
                    </div>

                    <div className="px-3 py-1 bg-brand/10 border border-brand/20 rounded-full text-[10px] font-bold text-brand flex items-center gap-1 shadow-[0_0_10px_rgba(255,122,0,0.1)]">
                        <Zap className="w-3 h-3 fill-current" />
                        باطل (Gratuit)
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export const Courses: React.FC<{ onNavigate: (page: any) => void }> = ({ onNavigate }) => {
    // Total Value Calculation
    const totalValue = COURSES.reduce((acc, curr) => acc + parseInt(curr.originalPrice.replace(',', '')), 0);

    return (
        <section id="courses" className="py-24 bg-[#050505] relative overflow-hidden">
            {/* Background Grids */}
            <div className="absolute inset-0 bg-[linear-gradient(#111_1px,transparent_1px),linear-gradient(90deg,#111_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none will-change-transform"></div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">

                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 mb-16">
                    <div className="max-w-3xl">
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/5 border border-brand/10 text-brand text-[10px] font-bold mb-4 uppercase tracking-widest"
                        >
                            <Zap className="w-3 h-3" />
                            أكاديمية سطوكيها
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4"
                        >
                            نعطوك <span className="text-brand">"الصنعة"</span> <br className="hidden md:inline" />
                            ماشي غير <span className="text-gray-500">"الماتريال"</span>
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="text-gray-400 text-lg leading-relaxed max-w-2xl"
                        >
                            كي تشترك في سطوكيها، ما راكش تشري لوجيسيال وخلاص. راك تدخل في برنامج تدريبي يرجعك من "تاجر كلاسيكي" إلى "تاجر محترف" يبيع أونلاين وأوفلاين.
                        </motion.p>
                    </div>

                    {/* Value Box */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="bg-[#141414] border border-white/5 p-6 rounded-2xl flex items-center gap-6 shadow-2xl min-w-[250px]"
                    >
                        <div className="text-right flex-1">
                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">قيمة التدريب</div>
                            <div className="text-xl font-bold text-gray-400 line-through decoration-red-500 decoration-2">15,000 دج</div>
                        </div>
                        <div className="w-px h-10 bg-white/10"></div>
                        <div className="text-right flex-1">
                            <div className="text-[10px] text-brand uppercase font-bold tracking-wider mb-1">مع الاشتراك</div>
                            <div className="text-3xl font-black text-white">0 دج</div>
                        </div>
                    </motion.div>
                </div>

                {/* Courses Grid */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: { staggerChildren: 0.1 }
                        }
                    }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                    {COURSES.map((course) => (
                        <CourseCard key={course.id} course={course} />
                    ))}
                </motion.div>

                {/* Bottom CTA */}
                <div className="mt-20 text-center">
                    <button
                        onClick={() => onNavigate('download')}
                        className="px-8 py-3.5 bg-brand hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-brand/20 transition-all transform hover:-translate-y-1"
                    >
                        ابدأ التدريب مجاناً
                    </button>
                </div>

            </div>
        </section>
    );
};