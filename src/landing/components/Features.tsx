import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
    Store,
    Truck,
    PieChart,
    ShieldCheck,
    Users,
    Smartphone,
    WifiOff,
    Box,
    TrendingUp,
    Database,
    ShoppingCart,
    Check,
    Search,
    Menu,
    Calculator,
    ArrowUpRight,
    ArrowDownLeft,
    MapPin,
    Cloud,
    X,
    History,
    Barcode,
    Printer
} from 'lucide-react';

// --- HIGH FIDELITY UI VISUALS ---

const BentoVisualContainer = ({ children }: { children: React.ReactNode }) => (
    <div className="w-full h-full bg-[#111] flex items-end justify-center relative overflow-hidden pt-8 px-4 rounded-b-3xl">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150px] h-[150px] bg-brand/5 rounded-full blur-[60px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>
        {children}
    </div>
);

const POSUi = () => (
    <div className="w-full max-w-[320px] bg-[#1A1A1A] border-t border-x border-white/10 rounded-t-xl shadow-2xl overflow-hidden flex flex-col h-[220px] relative">
        {/* Top Bar */}
        <div className="h-8 bg-[#222] border-b border-white/5 flex items-center justify-between px-3">
            <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
            </div>
            <div className="text-[9px] text-gray-400 font-mono">POS TERMINAL</div>
        </div>

        <div className="flex-1 flex text-[8px] md:text-[8px]">
            {/* Product Grid */}
            <div className="flex-1 p-2 grid grid-cols-3 gap-1.5 content-start">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className={`aspect-square rounded border border-white/5 flex flex-col justify-end p-1 transition-colors ${i === 1 ? 'bg-brand text-white border-brand' : 'bg-[#141414] text-gray-400'}`}>
                        <span className="font-bold">PROD-{i}</span>
                        <span className="text-[7px] opacity-70">1500 DA</span>
                    </div>
                ))}
            </div>

            {/* Cart Panel */}
            <div className="w-24 bg-[#111] border-l border-white/5 flex flex-col">
                <div className="flex-1 p-2 space-y-1">
                    <div className="flex justify-between items-center bg-[#222] p-1 rounded">
                        <span>Nike Air</span>
                        <span className="text-white">x1</span>
                    </div>
                    <div className="flex justify-between items-center bg-[#222] p-1 rounded">
                        <span>Adidas</span>
                        <span className="text-white">x2</span>
                    </div>
                </div>
                {/* Total & Pay */}
                <div className="p-2 border-t border-white/10 bg-[#161616]">
                    <div className="flex justify-between text-gray-400 mb-1">
                        <span>المجمل</span>
                        <span className="text-white font-bold">4500</span>
                    </div>
                    <div className="w-full bg-brand text-white text-center py-1.5 rounded font-bold shadow-[0_0_10px_rgba(255,122,0,0.3)]">
                        PAY
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const StoreUi = () => (
    <div className="relative w-[140px] h-[220px] bg-black border border-white/10 rounded-t-[2rem] mx-auto shadow-2xl overflow-hidden flex flex-col">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-b-xl z-20"></div>

        {/* App Content */}
        <div className="flex-1 bg-[#0F0F0F] pt-6 flex flex-col">
            <div className="px-3 mb-2 flex justify-between items-center">
                <Menu className="w-3 h-3 text-white" />
                <ShoppingCart className="w-3 h-3 text-brand" />
            </div>

            <div className="h-16 mx-2 rounded-lg bg-gradient-to-r from-brand/20 to-purple-500/20 mb-3 relative overflow-hidden">
                <div className="absolute bottom-2 left-2">
                    <div className="w-12 h-1.5 bg-white/80 rounded-full mb-1"></div>
                    <div className="w-6 h-1.5 bg-brand rounded-full"></div>
                </div>
            </div>

            <div className="flex-1 px-2 grid grid-cols-2 gap-2 overflow-hidden">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-[#1A1A1A] rounded p-1 flex flex-col gap-1">
                        <div className="aspect-square bg-white/5 rounded"></div>
                        <div className="w-full h-1 bg-white/10 rounded-full"></div>
                        <div className="w-2/3 h-1 bg-brand/50 rounded-full"></div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const LogisticsUi = () => (
    <div className="w-full max-w-[300px] h-[200px] bg-[#161616] rounded-t-xl border border-white/10 overflow-hidden relative flex flex-col p-4">
        <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-bl-full pointer-events-none"></div>

        {/* Integration Badge */}
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-[#222] border border-white/5 flex items-center justify-center text-red-500 font-black italic text-xs">
                    Y
                </div>
                <div>
                    <div className="text-[10px] text-gray-400">شركة التوصيل</div>
                    <div className="text-xs font-bold text-white">Yalidine Express</div>
                </div>
            </div>
            <div className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[9px] text-green-500 font-bold">
                Connected
            </div>
        </div>

        {/* Status Tracker */}
        <div className="bg-[#111] rounded-lg p-3 border border-white/5 mb-3">
            <div className="flex justify-between text-[9px] text-gray-400 mb-2">
                <span>Tracking ID</span>
                <span className="text-white font-mono">DT-99281</span>
            </div>
            <div className="relative h-1.5 bg-[#222] rounded-full mb-2">
                <div className="absolute left-0 top-0 h-full w-3/4 bg-brand rounded-full"></div>
                <div className="absolute left-3/4 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full border-2 border-brand shadow-[0_0_10px_rgba(255,122,0,0.5)]"></div>
            </div>
            <div className="flex justify-between text-[8px] font-bold">
                <span className="text-gray-500">Pick-up</span>
                <span className="text-brand">في الطريق</span>
                <span className="text-gray-600">تم التوصيل</span>
            </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
            <div className="flex-1 py-1.5 rounded bg-white/5 text-center text-[9px] text-gray-300 border border-white/5">طباعة البوصلة</div>
            <div className="flex-1 py-1.5 rounded bg-white/5 text-center text-[9px] text-gray-300 border border-white/5">الهاتف</div>
        </div>
    </div>
);

const FinanceUi = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { margin: "-20px" });

    return (
        <div ref={ref} className="w-full max-w-[320px] h-[220px] bg-[#121212] rounded-t-xl border border-white/10 p-4 relative overflow-hidden flex flex-col">
            {/* Net Profit Card */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">الفايدة الصافية (Net Profit)</div>
                    <div className="text-3xl font-black text-white flex items-baseline gap-1">
                        85.4 <span className="text-sm font-medium text-gray-500">مليون</span>
                    </div>
                </div>
                <div className="text-green-500 bg-green-500/10 px-2 py-1 rounded text-xs font-bold border border-green-500/20 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +24%
                </div>
            </div>

            {/* Chart visualization */}
            <div className="flex-1 w-full bg-[#1A1A1A] rounded-lg border border-white/5 relative overflow-hidden group">
                {/* Bars */}
                <div className="absolute bottom-0 left-0 right-0 h-full flex items-end justify-between px-3 pb-2 gap-1">
                    {[40, 60, 45, 80, 55, 70, 90].map((h, i) => (
                        <div key={i} className="w-full bg-[#333] hover:bg-brand/50 transition-colors rounded-t-sm relative group-hover:after:opacity-100 after:opacity-0 after:content-[''] after:absolute after:-top-4 after:left-1/2 after:-translate-x-1/2 after:text-[8px] after:text-white after:content-[attr(data-val)]" style={{ height: `${h}%` }} data-val={h}></div>
                    ))}
                </div>
                {/* Line Overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                    <path d="M 10 90 L 50 60 L 90 70 L 130 40 L 170 55 L 210 30 L 250 10" fill="none" stroke="#FF7A00" strokeWidth="2" strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(255,122,0,0.5)]" />
                </svg>
            </div>

            {/* Zakat Widget */}
            {isInView && (
                <div className="absolute top-4 right-4 animate-bounce">
                    <div className="bg-[#222] border border-brand/40 shadow-lg px-2 py-1 rounded text-[8px] text-brand font-bold flex items-center gap-1">
                        <Calculator className="w-2.5 h-2.5" />
                        زكاة: 2.1M
                    </div>
                </div>
            )}
        </div>
    );
};

const SecurityUi = () => (
    <div className="w-full max-w-[300px] h-[200px] bg-[#161616] rounded-t-xl border border-white/10 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-bold text-white">صلاحيات الخدامين</span>
            <ShieldCheck className="w-4 h-4 text-green-500" />
        </div>

        {/* User List */}
        <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-[#1A1A1A] rounded border border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-[10px] font-bold text-white">A</div>
                    <span className="text-[10px] text-white">المدير (أنت)</span>
                </div>
                <span className="text-[8px] text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">تحكم كامل</span>
            </div>

            <div className="flex items-center justify-between p-2 bg-[#1A1A1A] rounded border border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-white">S</div>
                    <span className="text-[10px] text-gray-300">أحمد (بائع)</span>
                </div>
                {/* Toggle */}
                <div className="w-6 h-3 bg-brand/20 rounded-full relative cursor-pointer">
                    <div className="absolute right-0.5 top-0.5 w-2 h-2 bg-brand rounded-full"></div>
                </div>
            </div>
            <div className="ml-8 text-[8px] text-gray-500 space-y-1">
                <div className="flex items-center gap-1"><X className="w-2 h-2 text-red-500" /> ممنوع يشوف الفايدة</div>
                <div className="flex items-center gap-1"><Check className="w-2 h-2 text-green-500" /> مسموح يبيع فقط</div>
            </div>
        </div>
    </div>
);

const OfflineUi = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { margin: "-20px" });

    return (
        <div ref={ref} className="w-full max-w-[300px] h-[200px] bg-[#1A1A1A] rounded-t-xl border border-white/10 p-4 flex flex-col relative overflow-hidden">
            {/* Network Banner */}
            <div className="bg-red-500/10 border border-red-500/20 rounded p-2 flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <WifiOff className="w-4 h-4 text-red-500" />
                    <span className="text-[10px] text-red-200 font-bold">لا يوجد إنترنت</span>
                </div>
                {isInView && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>}
            </div>

            {/* Sync Visual */}
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <div className="text-[10px] text-gray-400">النظام مازال يخدم عادي</div>
                <div className="flex gap-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-12 h-16 bg-[#222] border border-white/10 rounded flex flex-col items-center justify-center gap-1 shadow-lg transform translate-y-0 hover:-translate-y-1 transition-transform">
                            <div className="w-6 h-6 bg-brand/20 rounded flex items-center justify-center">
                                <ShoppingCart className="w-3 h-3 text-brand" />
                            </div>
                            <div className="h-1 w-6 bg-white/10 rounded"></div>
                        </div>
                    ))}
                </div>
                <div className="mt-2 text-[9px] text-brand font-bold bg-brand/10 px-2 py-1 rounded-full border border-brand/20 flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    يتم الحفظ في الجهاز (Local DB)
                </div>
            </div>
        </div>
    );
};

const CRMUi = () => (
    <div className="w-full max-w-[300px] h-[220px] bg-[#141414] rounded-t-xl border border-white/10 p-4 flex flex-col">
        <div className="flex gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand to-purple-600 p-[2px]">
                <div className="w-full h-full bg-[#141414] rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-gray-300" />
                </div>
            </div>
            <div>
                <div className="text-sm font-bold text-white">سفيان مرزوق</div>
                <div className="text-[9px] text-gray-500">زبون دائم (Gold)</div>
                <div className="flex gap-1 mt-1">
                    <span className="text-[8px] bg-brand/20 text-brand px-1.5 py-0.5 rounded">كريدي: 0 دج</span>
                </div>
            </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-[#1A1A1A] p-2 rounded border border-white/5 text-center">
                <div className="text-[8px] text-gray-500">مجموع الشراء</div>
                <div className="text-xs font-bold text-white">12.5M</div>
            </div>
            <div className="bg-[#1A1A1A] p-2 rounded border border-white/5 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-3 h-3 bg-brand/50 blur-lg rounded-full"></div>
                <div className="text-[8px] text-gray-500">نقاط الوفاء</div>
                <div className="text-xs font-bold text-brand">1500 ن</div>
            </div>
        </div>

        <div className="mt-auto bg-[#222] p-2 rounded flex items-center justify-between">
            <span className="text-[9px] text-gray-400">آخر زيارة: أمس</span>
            <History className="w-3 h-3 text-gray-500" />
        </div>
    </div>
);


// --- MAIN FEATURE COMPONENT ---

const FeatureCard = ({
    title,
    description,
    icon: Icon,
    visual,
    colSpan = 1
}: {
    title: string,
    description: string,
    icon: any,
    visual: React.ReactNode,
    colSpan?: number
}) => (
    <motion.div
        variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
        }}
        className={`group relative overflow-hidden rounded-3xl border border-white/5 bg-[#0A0A0A] hover:border-brand/30 transition-all duration-500 flex flex-col will-change-transform ${colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1'
            }`}
    >
        <div className="p-6 md:p-8 pb-0 relative z-20">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:bg-brand/10 group-hover:scale-110 transition-all duration-500">
                <Icon className="w-5 h-5 md:w-6 md:h-6 text-gray-300 group-hover:text-brand transition-colors" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-3">{title}</h3>
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
                {description}
            </p>
        </div>

        <div className="mt-8">
            <BentoVisualContainer>
                {visual}
            </BentoVisualContainer>
        </div>
    </motion.div>
);


// --- CAPABILITIES MATRIX (Clean List) ---
const FeatureCategory = ({ title, icon: Icon, features }: { title: string, icon: any, features: string[] }) => (
    <div className="flex flex-col gap-4 p-6 rounded-2xl bg-[#111] border border-transparent hover:border-white/5 transition-colors">
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-white/5 text-brand shadow-sm">
                <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white">{title}</h3>
        </div>
        <div className="space-y-2">
            {features.map((item, idx) => (
                <div
                    key={idx}
                    className="flex items-center gap-3 text-sm text-gray-400"
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-brand/50"></div>
                    <span>{item}</span>
                </div>
            ))}
        </div>
    </div>
);

export const Features: React.FC = () => {
    return (
        <section id="features" className="py-24 md:py-32 bg-[#050505] overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">

                {/* Header */}
                <div className="text-center mb-16 md:mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/5 text-brand text-xs font-bold mb-6 border border-brand/10"
                    >
                        <Store className="w-4 h-4" />
                        نظام تشغيل متكامل
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl md:text-5xl font-bold text-white mb-6"
                    >
                        نظام تسيير متكامل: <span className="text-brand">ماشي أنت تخدم عليه</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed"
                    >
                        من البيع في المحل (Caisse)، للتوصيل عبر 58 ولاية، للحسابات الدقيقة... كلش في بلاصة وحدة.
                    </motion.p>
                </div>

                {/* The Bento Grid */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: { staggerChildren: 0.1 }
                        }
                    }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20 md:mb-32"
                >
                    <FeatureCard
                        colSpan={2}
                        title="كاشير (POS) ونقطة بيع سريعة"
                        description="فوت الكليون بالخف. سكانير، طباعة التيكي، وحساب الصرف أوتوماتيك. واجهة مصممة للسرعة (Speed Mode)."
                        icon={Store}
                        visual={<POSUi />}
                    />
                    <FeatureCard
                        title="متجر أونلاين (Site Web) واجد"
                        description="سلعتك تطلع وحدها للإنترنت. اللي يشريه الكليون من السيت، ينقص من السطوك تاع الحانوت ديركت."
                        icon={Smartphone}
                        visual={<StoreUi />}
                    />
                    <FeatureCard
                        title="ليفيريزون (التوصيل 58 ولاية)"
                        description="مربوط مع ياليدين، Procolis وشركات التوصيل. طبع البوصلة (Bordereau) وتتبع الكوليتا ديركت من السيستام."
                        icon={Truck}
                        visual={<LogisticsUi />}
                    />
                    <FeatureCard
                        colSpan={2}
                        title="حساباتك و الفايدة الصافية"
                        description="تعرف واش يدخلك وواش يخرجلك بالدينار. حساب الأرباح، المصاريف، الكريدي، وحتى الزكاة. ما تزيدش تخدم بالخسارة."
                        icon={PieChart}
                        visual={<FinanceUi />}
                    />
                    <FeatureCard
                        title="الأمان ومراقبة الخدامين"
                        description="حدد لكل خدام واش يقدر يشوف (Admin vs Vendeur). وشوف سجل التاريخ (Audit Log) باش تعرف كل حركة صرات."
                        icon={ShieldCheck}
                        visual={<SecurityUi />}
                    />
                    <FeatureCard
                        title="ما تحبسش بلا إنترنت"
                        description="الإنترنت راحت؟ عادي. كمل بيع، وكي ترجع يتسجل كلش في السيرفر (Auto-Sync)."
                        icon={WifiOff}
                        visual={<OfflineUi />}
                    />
                    <FeatureCard
                        title="تهلى في الكليون (CRM)"
                        description="سجل معلومات الزبائن، نقاط الوفاء (Loyalty)، والكريدي. خليهم يرجعوا ليك ديما."
                        icon={Users}
                        visual={<CRMUi />}
                    />
                </motion.div>

                {/* Capabilities Matrix */}
                <div className="border-t border-white/5 pt-16 md:pt-20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        <FeatureCategory
                            title="الإدارة والمبيعات"
                            icon={Box}
                            features={[
                                "كاشير سريع (Scan Mode)",
                                "فواتير A4/Thermal",
                                "إدارة المخزون (Stock)",
                                "تنبيهات السلعة الناقصة",
                                "إدارة الديون (Carnet)",
                                "إدارة المصروفات",
                                "حساب الزكاة",
                                "إدارة الموردين"
                            ]}
                        />
                        <FeatureCategory
                            title="اللوجستيك والتوصيل"
                            icon={Truck}
                            features={[
                                "Yalidine Integration",
                                "طباعة البورديرو (PDF)",
                                "تحديث الحالة آلياً",
                                "إدارة الروتور (Retour)",
                                "حساب مصاريف الشحن",
                                "تتبع خريطة جوجل",
                                "توزيع الطلبات",
                                "SMS للكليون"
                            ]}
                        />
                        <FeatureCategory
                            title="النمو والتسويق"
                            icon={TrendingUp}
                            features={[
                                "متجر إلكتروني مجاني",
                                "بيكسل (FB/TikTok)",
                                "نقاط الولاء (Points)",
                                "كوبونات تخفيض",
                                "إدارة الحملات",
                                "تحليل المبيعات",
                                "تقارير الأرباح يومية"
                            ]}
                        />
                        <FeatureCategory
                            title="الأمان والفريق"
                            icon={ShieldCheck}
                            features={[
                                "صلاحيات (Admin/Vendeur)",
                                "كود PIN للدخول",
                                "مراقبة كل حركة (Log)",
                                "عمولات البيع (Commission)",
                                "حساب الصندوق (Caisse)",
                                "نسخ احتياطي (Backup)",
                                "حماية وتشفير SSL"
                            ]}
                        />
                    </div>
                </div>

            </div>
        </section>
    );
};