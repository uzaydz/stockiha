
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ShieldCheck, Zap, HelpCircle, Phone, Crown, Store, Truck, Users, Database, Star, ArrowRight, Minus, Coffee, Wallet, Award, Clock, RefreshCw } from 'lucide-react';

// --- DATA ---
const PRICING_TAGS = [
    { title: "أفضل سعر Best Price", icon: Wallet },
    { title: "بدون التزامات No Commitments", icon: Clock },
    { title: "دعم فني 7/7 Support", icon: Users },
    { title: "تحديثات مجانية Free Updates", icon: RefreshCw },
    { title: "دفع آمن Secure Payment", icon: ShieldCheck },
    { title: "ضمان استرجاع Money Back", icon: Award },
    { title: "شفافية تامة Transparency", icon: Star },
    { title: "نسخ احتياطي Backup", icon: Database },
];

const PLANS = [
    {
        id: 'starter',
        name: "البداية",
        subtitle: "للمتاجر الناشئة",
        monthlyPrice: 2500,
        highlight: false,
        features: [
            "600 منتج",
            "مستخدم واحد (المدير)",
            "نقطة بيع واحدة (POS)",
            "متجر إلكتروني مجاني",
            "دعم فني عبر التذاكر"
        ]
    },
    {
        id: 'growth',
        name: "النمو",
        subtitle: "الأكثر طلباً",
        monthlyPrice: 5000,
        highlight: true,
        features: [
            "1,000 منتج",
            "3 مستخدمين",
            "نقطتي بيع (2 POS)",
            "متجر إلكتروني متقدم",
            "ربط مع شركات التوصيل",
            "دعم فني عبر الشات"
        ]
    },
    {
        id: 'business',
        name: "الأعمال",
        subtitle: "للمتاجر المتوسعة",
        monthlyPrice: 7500,
        highlight: false,
        features: [
            "5,000 منتج",
            "7 مستخدمين",
            "5 نقاط بيع (5 POS)",
            "فرعين (2 Locations)",
            "تقارير متقدمة و Audit Log",
            "مدير حساب خاص"
        ]
    },
    {
        id: 'enterprise',
        name: "المؤسسات",
        subtitle: "للشركات الكبرى",
        monthlyPrice: 12500,
        highlight: false,
        features: [
            "منتجات غير محدودة",
            "15 مستخدم",
            "10 نقاط بيع",
            "5 فروع",
            "API خاص للربط",
            "أولوية قصوى في الدعم"
        ]
    }
];

const FEATURES_TABLE = [
    {
        category: "الأساسيات",
        icon: Star,
        rows: [
            { name: "عدد المنتجات", values: ["600", "1,000", "5,000", "غير محدود"] },
            { name: "المستخدمين", values: ["1", "3", "7", "15"] },
            { name: "نقاط البيع (POS)", values: ["1", "2", "5", "10"] },
            { name: "الفروع", values: ["1", "1", "2", "5"] },
        ]
    },
    {
        category: "إدارة المحل",
        icon: Store,
        rows: [
            { name: "عمل بدون إنترنت", values: [true, true, true, true] },
            { name: "طباعة الفواتير", values: [true, true, true, true] },
            { name: "إدارة المخزون", values: [true, true, true, true] },
            { name: "إدارة الديون", values: [true, true, true, true] },
            { name: "حساب الزكاة", values: [true, true, true, true] },
        ]
    },
    {
        category: "التجارة الإلكترونية",
        icon: Zap,
        rows: [
            { name: "متجر إلكتروني", values: [true, true, true, true] },
            { name: "مزامنة لحظية", values: [true, true, true, true] },
            { name: "عدد الطلبيات", values: ["غير محدود", "غير محدود", "غير محدود", "غير محدود"] },
            { name: "ربط دومين خاص", values: [false, true, true, true] },
            { name: "Pixel Tracking", values: [false, true, true, true] },
        ]
    },
    {
        category: "اللوجستيك والأمان",
        icon: ShieldCheck,
        rows: [
            { name: "ربط شركات التوصيل", values: [true, true, true, true] },
            { name: "تتبع الشحنات", values: [true, true, true, true] },
            { name: "سجل النشاط (Audit)", values: [false, true, true, true] },
            { name: "صلاحيات الموظفين", values: ["محدودة", "أساسية", "متقدمة", "كاملة"] },
        ]
    }
];

const FAQ = [
    { q: "هل أحتاج لبطاقة فيزا للدفع؟", a: "لا، ندعم الدفع المحلي عبر تطبيق بريدي موب (BaridiMob)، تحويل CCP، أو نقداً في مقرنا." },
    { q: "هل يمكنني تغيير الخطة لاحقاً؟", a: "نعم، يمكنك الترقية في أي وقت. سيتم احتساب المبلغ المتبقي من خطتك الحالية وخصمه من الخطة الجديدة." },
    { q: "ماذا يحدث إذا انقطع اشتراكي؟", a: "لن تفقد بياناتك. يتحول حسابك لوضع القراءة فقط لمدة 30 يوماً حتى تقوم بالتجديد." },
    { q: "هل السعر يشمل التحديثات؟", a: "نعم، جميع التحديثات المستقبلية والميزات الجديدة ستحصل عليها مجاناً ضمن اشتراكك." },
];

// --- COMPONENTS ---

const CheckIcon = () => <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center"><Check className="w-3 h-3 text-green-500" /></div>;
const MinusIcon = () => <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center"><Minus className="w-3 h-3 text-gray-600" /></div>;

export const PricingPage: React.FC = () => {
    const [isAnnual, setIsAnnual] = useState(true);

    return (
        <div className="bg-[#050505] min-h-screen pb-32 font-sans selection:bg-brand selection:text-white">

            {/* 1. PRICING HERO SECTION: "The Infinite Flow" Style */}
            <section className="relative min-h-[60vh] flex flex-col items-center justify-center text-center px-6 pt-32 pb-20 overflow-hidden bg-[#050505]">

                {/* Background Ambient Layers */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand/10 rounded-full blur-[120px] mix-blend-screen opacity-40"></div>
                    <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] mix-blend-screen opacity-30"></div>
                    {/* Grain Texture */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
                </div>

                {/* BEHIND: Seamless Infinite Marquee Background */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] md:w-[120%] h-32 md:h-48 bg-gradient-to-r from-transparent via-[#111]/50 to-transparent flex items-center -rotate-6 md:-rotate-3 z-0 overflow-hidden pointer-events-none">
                    <div className="flex relative w-full" dir="ltr">
                        <style>{`
                            @keyframes scrollPricing {
                                0% { transform: translateX(0); }
                                100% { transform: translateX(-50%); }
                            }
                            .animate-scroll-pricing {
                                animation: scrollPricing 40s linear infinite;
                            }
                        `}</style>

                        {/* Group 1 */}
                        <div className="flex shrink-0 animate-scroll-pricing items-center gap-12 md:gap-24 pr-12 md:pr-24 pl-12 md:pl-24">
                            {[...PRICING_TAGS, ...PRICING_TAGS].map((item, i) => (
                                <div key={`p1-${i}`} className="flex items-center gap-4 opacity-[0.08] font-black text-4xl md:text-6xl text-white whitespace-nowrap">
                                    <item.icon className="w-8 h-8 md:w-16 md:h-16 text-white" />
                                    <span>{item.title}</span>
                                </div>
                            ))}
                        </div>
                        {/* Group 2 */}
                        <div className="flex shrink-0 animate-scroll-pricing items-center gap-12 md:gap-24 pr-12 md:pr-24 pl-12 md:pl-24">
                            {[...PRICING_TAGS, ...PRICING_TAGS].map((item, i) => (
                                <div key={`p2-${i}`} className="flex items-center gap-4 opacity-[0.08] font-black text-4xl md:text-6xl text-white whitespace-nowrap">
                                    <item.icon className="w-8 h-8 md:w-16 md:h-16 text-white" />
                                    <span>{item.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center gap-6">

                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-md"
                    >
                        <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span>
                        <span className="text-[10px] md:text-xs text-gray-300 font-bold font-mono tracking-wider">استثمار في النجاح</span>
                    </motion.div>

                    {/* Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.1 }}
                        className="text-4xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-[1.1]"
                    >
                        أساس و
                        <span className="inline-block text-transparent bg-clip-text bg-gradient-to-br from-brand via-orange-400 to-yellow-500 mx-2 md:mx-4">
                            خطط
                        </span>
                        <br className="hidden md:block" />
                        واضحة للجميع
                    </motion.h1>

                    {/* Subheadline */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                        className="text-base md:text-2xl text-gray-400 font-light max-w-2xl mx-auto leading-relaxed mb-8"
                    >
                        خير الخطة لي توالمك. ابدا صغيراً واكبر معانا (Start Small, Grow Big). ماكانش تكاليف مخفية، كلش باين.
                    </motion.p>

                    {/* Premium Glassmorphic Billing Toggle */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="relative p-1.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full inline-flex items-center shadow-2xl"
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-full pointer-events-none"></div>

                        {/* Active Pill Indicator */}
                        <motion.div
                            className="absolute top-1.5 bottom-1.5 bg-brand rounded-full shadow-[0_0_20px_rgba(255,122,0,0.3)] z-0"
                            initial={false}
                            animate={{
                                left: isAnnual ? '50%' : '6px',
                                width: 'calc(50% - 6px)'
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />

                        {/* Monthly Button */}
                        <button
                            onClick={() => setIsAnnual(false)}
                            className={`relative z-10 w-32 md:w-40 py-2.5 rounded-full text-sm font-bold transition-colors ${!isAnnual ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            دفع شهري
                        </button>

                        {/* Annual Button */}
                        <button
                            onClick={() => setIsAnnual(true)}
                            className={`relative z-10 w-36 md:w-48 py-2.5 rounded-full text-sm font-bold transition-colors flex items-center justify-center gap-2 ${isAnnual ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            دفع سنوي
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${isAnnual ? 'bg-white text-brand' : 'bg-green-500 text-white'}`}>
                                وفر 17%
                            </span>
                        </button>
                    </motion.div>
                </div>
            </section>

            {/* 2. Pricing Cards Grid */}
            <div className="max-w-7xl mx-auto px-6 mb-32">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                    {PLANS.map((plan, index) => (
                        <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * index }}
                            className={`relative bg-[#0A0A0A] rounded-3xl p-6 border flex flex-col group transition-all duration-300 hover:-translate-y-1 ${plan.highlight
                                ? 'border-brand/50 shadow-[0_0_40px_rgba(255,122,0,0.15)] z-10 lg:scale-105 bg-[#0F0F0F]'
                                : 'border-white/5 hover:border-white/10'
                                }`}
                        >
                            {plan.highlight && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-white" />
                                    الأكثر طلباً
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className={`text-xl font-bold mb-1 ${plan.highlight ? 'text-white' : 'text-gray-200'}`}>{plan.name}</h3>
                                <p className="text-xs text-gray-500">{plan.subtitle}</p>
                            </div>

                            <div className="mb-6">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold text-white">
                                        {(isAnnual ? plan.monthlyPrice * 10 : plan.monthlyPrice).toLocaleString()}
                                    </span>
                                    <span className="text-sm text-gray-500">دج</span>
                                </div>
                                <div className="text-[10px] text-gray-500 mt-2">
                                    {isAnnual ? 'تدفع سنوياً (شهرين مجاناً)' : 'تدفع كل شهر'}
                                </div>
                            </div>

                            <button className={`w-full py-3.5 rounded-xl text-xs font-bold transition-all mb-8 flex items-center justify-center gap-2 ${plan.highlight
                                ? 'bg-brand text-white hover:bg-brand-hover shadow-lg shadow-brand/20'
                                : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'
                                }`}>
                                اختر خطة {plan.name}
                                <ArrowRight className="w-3 h-3" />
                            </button>

                            <div className="space-y-4">
                                {plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className={`mt-0.5 shrink-0 ${plan.highlight ? 'text-brand' : 'text-gray-600'}`}>
                                            <Check className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm text-gray-400 font-medium">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* 3. Detailed Comparison Table */}
            <div className="max-w-7xl mx-auto px-6 mb-32">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-white mb-4">مقارنة تفصيلية للميزات</h2>
                    <p className="text-gray-500">كل التفاصيل التقنية التي تحتاج معرفتها</p>
                </div>

                <div className="bg-[#0A0A0A] rounded-3xl border border-white/5 overflow-hidden">
                    {/* Desktop Sticky Header */}
                    <div className="hidden lg:grid grid-cols-5 bg-[#111] border-b border-white/10 sticky top-0 z-20">
                        <div className="p-6 text-sm font-bold text-gray-500">الميزة / الخطة</div>
                        {PLANS.map(plan => (
                            <div key={plan.id} className={`p-6 text-center text-sm font-bold ${plan.highlight ? 'text-brand bg-brand/5' : 'text-white'}`}>
                                {plan.name}
                            </div>
                        ))}
                    </div>

                    {/* Table Content */}
                    <div className="divide-y divide-white/5">
                        {FEATURES_TABLE.map((section, sIdx) => (
                            <div key={sIdx}>
                                {/* Section Header */}
                                <div className="bg-[#0F0F0F] p-4 px-6 border-y border-white/5 flex items-center gap-3">
                                    <section.icon className="w-4 h-4 text-brand" />
                                    <h3 className="text-sm font-bold text-white">{section.category}</h3>
                                </div>
                                {/* Rows */}
                                {section.rows.map((row, rIdx) => (
                                    <div key={rIdx} className="grid grid-cols-1 lg:grid-cols-5 hover:bg-white/[0.02] transition-colors group">
                                        <div className="p-4 px-6 text-sm text-gray-400 font-medium flex items-center justify-between lg:justify-start bg-[#0A0A0A] lg:bg-transparent">
                                            {row.name}
                                        </div>
                                        {row.values.map((val, vIdx) => (
                                            <div key={vIdx} className={`p-4 flex items-center justify-between lg:justify-center border-t border-white/5 lg:border-t-0 ${PLANS[vIdx].highlight ? 'bg-brand/[0.01]' : ''}`}>
                                                <span className="lg:hidden text-xs text-gray-600">{PLANS[vIdx].name}</span>
                                                <span className="text-sm font-medium text-white">
                                                    {val === true ? <CheckIcon /> :
                                                        val === false ? <MinusIcon /> :
                                                            val}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. FAQ */}
            <div className="max-w-3xl mx-auto px-6 mb-32">
                <h2 className="text-3xl font-bold text-white text-center mb-12">أسئلة شائعة</h2>
                <div className="grid gap-4">
                    {FAQ.map((item, i) => (
                        <div key={i} className="bg-[#111] border border-white/5 rounded-2xl p-6 md:p-8 hover:border-white/10 transition-colors">
                            <h3 className="text-lg font-bold text-white mb-3 flex items-start gap-3">
                                <HelpCircle className="w-5 h-5 text-gray-600 mt-1 shrink-0" />
                                {item.q}
                            </h3>
                            <p className="text-gray-400 leading-relaxed pr-8">{item.a}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* 5. Enterprise CTA */}
            <div className="max-w-7xl mx-auto px-6">
                <div className="relative bg-gradient-to-r from-[#111] to-[#0A0A0A] rounded-[2.5rem] p-8 md:p-16 border border-white/10 overflow-hidden text-center md:text-right flex flex-col md:flex-row items-center justify-between gap-10">
                    {/* Abstract Decoration */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

                    <div className="relative z-10 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white text-[10px] font-bold mb-6">
                            <Store className="w-3 h-3 text-brand" />
                            للشركات الكبرى والسلاسل
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">لديك أكثر من 10 فروع؟</h2>
                        <p className="text-lg text-gray-400 leading-relaxed">
                            نقدم خطة "Enterprise" مخصصة تشمل خوادم معزولة، مدير حساب مخصص، تدريب لفريق العمل في 58 ولاية، وربط API خاص بأنظمتكم الحالية.
                        </p>
                    </div>

                    <div className="relative z-10 shrink-0">
                        <button className="px-10 py-5 bg-white text-black font-bold text-sm rounded-2xl hover:bg-gray-200 transition-colors shadow-2xl flex items-center gap-3">
                            تواصل مع المبيعات
                            <Phone className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};
