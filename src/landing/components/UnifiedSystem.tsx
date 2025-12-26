
import React from 'react';
import { useInView } from 'react-intersection-observer';
import { motion } from 'framer-motion';
import {
    Store,
    Smartphone,
    ArrowRightLeft,
    Truck,
    Facebook,
    MousePointer2,
    Wrench,
    CheckCircle2,
    ShoppingCart,
    Zap,
    Globe,
    PackageCheck,
    ScanBarcode,
    Barcode
} from 'lucide-react';

// --- CUSTOM UI VISUALIZATIONS ---

// 1. SYNC VISUAL: POS <-> WEB (Animated Counter)
const SyncVisual = () => {
    // Simulated stock countdown
    const [count, setCount] = React.useState(50);
    const { ref, inView } = useInView({ threshold: 0 });

    React.useEffect(() => {
        if (!inView) return;
        const interval = setInterval(() => {
            setCount(prev => (prev > 45 ? prev - 1 : 50));
        }, 2500);
        return () => clearInterval(interval);
    }, [inView]);

    return (
        <div ref={ref} className="relative w-full h-48 bg-[#111] rounded-2xl border border-white/5 overflow-hidden flex items-center justify-around px-2 md:px-8">
            {/* Background Gradient Line */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            {/* POS Side */}
            <div className="flex flex-col items-center gap-3 relative z-10 min-w-[80px] md:min-w-[100px]">
                <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold tracking-widest uppercase">
                    <Store className="w-3 h-3" />
                    <span>Magasin</span>
                </div>
                <div className="relative p-2 md:p-4 bg-[#151515] border border-white/10 rounded-2xl shadow-xl flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24">
                    <div className="text-3xl md:text-4xl font-black text-white tabular-nums">{count}</div>
                    <span className="text-[9px] text-gray-500">Stock</span>
                    {/* Sale Indicator */}
                    <motion.div
                        key={count}
                        initial={{ opacity: 0, y: 10, scale: 0.5 }}
                        animate={{ opacity: 1, y: -20, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-0 right-0 text-red-500 text-xs font-bold transform-gpu will-change-transform"
                    >
                        -1
                    </motion.div>
                </div>
            </div>

            {/* Sync Icon */}
            <div className="flex flex-col items-center gap-2 relative z-10 bg-[#0A0A0A] p-2 rounded-xl border border-white/10 shadow-2xl">
                <div className="p-2 bg-brand/10 rounded-full text-brand animate-pulse">
                    <ArrowRightLeft className="w-5 h-5" />
                </div>
                <span className="text-[8px] text-brand font-bold bg-brand/5 px-2 py-0.5 rounded-full">
                    Synchro
                </span>
            </div>

            {/* Web Side */}
            <div className="flex flex-col items-center gap-3 relative z-10 min-w-[80px] md:min-w-[100px]">
                <div className="flex items-center gap-2 text-blue-400 text-[10px] font-bold tracking-widest uppercase">
                    <Globe className="w-3 h-3" />
                    <span>Site Web</span>
                </div>
                <div className="relative p-2 md:p-4 bg-[#151515] border border-white/10 rounded-2xl shadow-xl flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24">
                    <div className="text-3xl md:text-4xl font-black text-white tabular-nums">{count}</div>
                    <span className="text-[9px] text-gray-500">Online</span>
                    {/* Mirror Indicator */}
                    <motion.div
                        key={count}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: [0, 1, 0], scale: 1.2 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 border-2 border-brand rounded-2xl transform-gpu will-change-transform"
                    />
                </div>
            </div>
        </div>
    );
};

// 2. ORDER FLOW VISUAL
const OrderFlowVisual = () => (
    <div className="w-full flex flex-col gap-3">
        {/* Step 1: Order */}
        <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg border border-white/5 opacity-50">
            <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500 text-[10px]">1</div>
            <div className="text-[10px] text-gray-400">طلب جديد (New Order)</div>
        </div>

        {/* Step 2: Confirmation (Active) */}
        <div className="flex items-center justify-between p-3 bg-brand/10 rounded-lg border border-brand/20 relative overflow-hidden">
            <div className="flex items-center gap-3 relative z-10">
                <div className="w-6 h-6 bg-brand rounded-full flex items-center justify-center text-white text-[10px] font-bold">2</div>
                <div>
                    <div className="text-xs font-bold text-white">تأكيد الطلب</div>
                    <div className="text-[9px] text-brand">Click to Confirm</div>
                </div>
            </div>
            <div className="w-20 h-6 bg-brand rounded flex items-center justify-center text-[9px] font-bold text-white shadow-lg cursor-pointer hover:scale-105 transition-transform">
                VALIDER
            </div>
        </div>

        {/* Step 3: Delivery */}
        <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg border border-white/5 opacity-50">
            <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 text-[10px]">3</div>
            <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">إرسال لشركة التوصيل</span>
                <span className="px-1.5 py-0.5 bg-[#222] rounded text-[8px] text-gray-500">Yalidine</span>
            </div>
        </div>
    </div>
);

// 3. PIXEL VISUAL
const PixelVisual = () => (
    <div className="h-32 flex items-center justify-center relative">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

        <div className="relative w-full max-w-[200px]">
            {/* Product Item */}
            <div className="flex items-center gap-3 bg-[#1A1A1A] p-3 rounded-xl border border-white/10 mb-4 z-10 relative">
                <div className="w-8 h-8 bg-white/10 rounded-md"></div>
                <div className="flex-1 h-2 bg-white/10 rounded"></div>
                {/* Pixel Badge */}
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-[#1877F2] rounded-full flex items-center justify-center border-2 border-[#111]">
                    <Facebook className="w-3 h-3 text-white" />
                </div>
            </div>

            {/* Product Item 2 */}
            <div className="flex items-center gap-3 bg-[#1A1A1A] p-3 rounded-xl border border-white/10 opacity-50 scale-95">
                <div className="w-8 h-8 bg-white/10 rounded-md"></div>
                <div className="flex-1 h-2 bg-white/10 rounded"></div>
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-black rounded-full flex items-center justify-center border-2 border-[#111]">
                    <span className="text-[8px] text-white">TT</span>
                </div>
            </div>
        </div>
    </div>
);


export const UnifiedSystem: React.FC<{ onNavigate: (page: any) => void }> = ({ onNavigate }) => {
    return (
        <section className="relative py-32 bg-[#050505] overflow-hidden">

            {/* Background Effects */}
            {/* Background Effects - Optimized */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none will-change-transform"></div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">

                {/* Header */}
                <div className="text-center mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-bold mb-6"
                    >
                        <Zap className="w-4 h-4" />
                        <span>عرض الكل في واحد (All-in-One)</span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight leading-tight"
                    >
                        برنامج التسيير عليك... <br />
                        والمتجر الإلكتروني <span className="text-brand">علينا.</span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed"
                    >
                        لماذا تدفع اشتراكين؟ عند اشتراكك في برنامج سطوكيها لتسيير المحل، تتحصل آلياً على متجر إلكتروني احترافي متكامل ومربوط بالنظام <span className="text-white font-bold">بـ 0 دج</span>. ابدأ البيع أونلاين فوراً دون تكاليف إضافية.
                    </motion.p>
                </div>

                {/* --- THE GENIUS BENTO GRID --- */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-6 auto-rows-auto">

                    {/* 1. CORE SYNC (Large - Spans 4) */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5 }}
                        className="md:col-span-4 bg-[#0A0A0A] border border-white/5 rounded-[32px] p-8 md:p-10 relative group hover:border-brand/20 transition-all duration-500 flex flex-col justify-between transform-gpu will-change-transform"
                    >
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-[#151515] rounded-xl border border-white/10 text-brand">
                                    <ArrowRightLeft className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-bold text-white">مخزون موحد (100% Synchro)</h3>
                            </div>
                            <p className="text-gray-400 text-lg leading-relaxed max-w-lg">
                                مخزون واحد يمشي فيهم للإثنين. كي تبيع حبة في المحل <Store className="inline w-4 h-4 mx-1 text-gray-500" /> تنقص أوتوماتيك من السيت. وكي تبيع في السيت <Globe className="inline w-4 h-4 mx-1 text-blue-500" /> تهبط الكوموند للمحل وتنقص من الستوك. <span className="text-white font-bold">تهنى من خلطة الحسابات.</span>
                            </p>
                        </div>
                        <SyncVisual />
                    </motion.div>

                    {/* 2. DELIVERY INTEGRATION (Tall - Spans 2) */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="md:col-span-2 md:row-span-2 bg-[#0A0A0A] border border-white/5 rounded-[32px] p-8 relative overflow-hidden group hover:border-green-500/20 transition-all duration-500 transform-gpu will-change-transform"
                    >
                        <div className="mb-8 relative z-10">
                            <div className="w-12 h-12 bg-[#151515] rounded-xl flex items-center justify-center mb-4 text-green-500 border border-white/10">
                                <PackageCheck className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">من الطلب للتوصيل</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                الكوموند تلحق للبرنامج ← فاليدي بضغطة زر ← تروح ديركت لشركة التوصيل (Yalidine, Procolis...).
                                <br /><br />
                                ما تشقاش تعمر البورديرو بيدك. كلش أوتوماتيك.
                            </p>
                        </div>
                        <div className="mt-8 relative z-10">
                            <OrderFlowVisual />
                        </div>
                        {/* Bg Icon */}
                        <Truck className="absolute -bottom-4 -right-4 w-40 h-40 text-green-500/5 rotate-[-10deg]" />
                    </motion.div>

                    {/* 3. INFINITE PIXEL (Medium - Spans 2) */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="md:col-span-2 bg-[#0A0A0A] border border-white/5 rounded-[32px] p-8 relative overflow-hidden group hover:border-blue-500/20 transition-all duration-500 transform-gpu will-change-transform"
                    >
                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                            <ScanBarcode className="w-5 h-5 text-blue-500" />
                            Pixel لكل منتج
                        </h3>
                        <p className="text-gray-400 text-sm mb-6">
                            كل Produit عندو الـ Pixel الخاص بيه (Facebook/TikTok). تبع مبيعات كل حبة بدقة 100%. وعدد بيكسلات لا نهائي.
                        </p>
                        <PixelVisual />
                    </motion.div>

                    {/* 4. FLEXIBLE ORDERING (Medium - Spans 2) */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="md:col-span-2 bg-[#0A0A0A] border border-white/5 rounded-[32px] p-8 relative overflow-hidden group hover:border-purple-500/20 transition-all duration-500 transform-gpu will-change-transform"
                    >
                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-purple-500" />
                            سلة ولا طلب مباشر؟
                        </h3>
                        <p className="text-gray-400 text-sm mb-6">
                            أنت خير: تحب تخدم بنظام <span className="text-white">السلة (Panier)</span> كيما المتاجر الكبار، ولا <span className="text-white">Direct Order</span> (Landing Page) باش تزيد المبيعات.
                        </p>
                        {/* Toggle Visual */}
                        <div className="flex items-center justify-center gap-4 bg-[#111] p-3 rounded-xl border border-white/5">
                            <span className="text-xs text-gray-500">Panier Mode</span>
                            <div className="w-12 h-6 bg-purple-500 rounded-full relative px-1 flex items-center cursor-pointer">
                                <div className="w-4 h-4 bg-white rounded-full absolute right-1"></div>
                            </div>
                            <span className="text-xs text-white font-bold">Direct Mode</span>
                        </div>
                    </motion.div>

                    {/* 5. REPAIR TRACKING (Full Width Bottom - Spans 6) */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="md:col-span-6 bg-gradient-to-r from-[#0A0A0A] to-[#111] border border-white/5 rounded-[32px] p-8 md:p-12 relative overflow-hidden group hover:border-yellow-500/20 transition-all duration-500 flex flex-col md:flex-row items-center gap-8 md:gap-16 transform-gpu will-change-transform"
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-[#151515] rounded-xl border border-white/10 text-yellow-500">
                                    <Wrench className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-bold text-white">تتبع التصليحات (Suivi Réparation)</h3>
                            </div>
                            <p className="text-gray-400 text-lg leading-relaxed max-w-2xl">
                                عندك ورشة تصليح؟ ما تكسرش راسك مع التيليفون. الزبون يقدر يدخل للسيت، يكتب نيميرو البون، ويشوف جهازه وين عاد (En cours, Réparé, Livré). ميزة حصرية تزيد الثقة.
                            </p>
                        </div>

                        {/* Search Bar Visual */}
                        <div className="w-full md:w-1/3">
                            <div className="bg-[#050505] p-6 rounded-2xl border border-white/10 shadow-2xl">
                                <label className="text-xs text-gray-500 block mb-2 font-mono">CODE DE RÉPARATION</label>
                                <div className="flex gap-2">
                                    <div className="h-10 flex-1 bg-[#1A1A1A] rounded p-2 text-white font-mono text-sm border border-white/5 flex items-center">
                                        R-992810
                                    </div>
                                    <div className="h-10 w-10 bg-yellow-500 rounded flex items-center justify-center text-black">
                                        <ArrowRightLeft className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-green-500 text-xs font-bold">Réparé (تم التصليح)</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                </div>

                {/* Bottom CTA */}
                <div className="mt-20 text-center">
                    <button
                        onClick={() => onNavigate('download')}
                        className="px-8 py-3.5 bg-brand hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-brand/20 transition-all transform hover:-translate-y-1"
                    >
                        جرب النظام الموحد مجاناً
                    </button>
                </div>

            </div>
        </section>
    );
};
