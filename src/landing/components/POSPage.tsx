import React, { useState } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Scan, WifiOff, Zap, Printer, Search, ShoppingCart, ArrowLeft, CheckCircle2, RefreshCcw, AlertTriangle, Wallet, ArrowRightLeft, Layout, Image, Settings, Scale, Package, Ruler, CalendarClock, Barcode, ShieldCheck, Tags, Coins, Sparkles, Send, ArrowUpRight, Clock, FileText, Users, CreditCard, RotateCcw, FileWarning, Receipt } from 'lucide-react';

// --- COMPONENTS ---

// 1. Interactive POS Simulator (The "Genius" Visual - Responsive)
const POSSimulator = () => {
    const ref = React.useRef(null);
    const isInView = useInView(ref, { margin: "50px" });

    return (
        <div ref={ref} className="relative w-full max-w-5xl mx-auto h-[600px] md:h-auto md:aspect-video bg-[#0A0A0A] rounded-3xl border-[8px] border-[#1A1A1A] shadow-2xl overflow-hidden flex flex-col md:flex-row">
            {/* Left: Product Grid (Scrollable on mobile) */}
            <div className="flex-1 p-4 overflow-y-auto md:overflow-visible">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[...Array(16)].map((_, i) => (
                        <div
                            key={i}
                            className="bg-[#161616] rounded-xl border border-white/5 p-2 flex flex-col gap-2 hover:border-brand/40 cursor-pointer group transition-colors"
                        >
                            <div className="flex-1 bg-white/5 rounded-lg w-full aspect-square relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-tr from-brand/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                            <div className="h-2 w-2/3 bg-white/10 rounded-full"></div>
                            <div className="h-2 w-1/3 bg-brand/20 rounded-full"></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Desktop Cart Context (Right Side) - Hidden on Mobile */}
            <div className="hidden md:flex w-80 bg-[#111] border-r border-white/5 flex-col h-full relative z-10 shadow-2xl">
                {/* Header */}
                <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#161616]">
                    <span className="text-white font-bold text-sm">السلة (3)</span>
                    <ShoppingCart className="w-4 h-4 text-brand" />
                </div>
                {/* Cart Items */}
                <div className="flex-1 p-3 space-y-2 overflow-hidden relative">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="flex items-center gap-3 p-2 bg-[#0A0A0A] rounded-lg border border-white/5">
                            <div className="w-8 h-8 rounded bg-white/5"></div>
                            <div className="flex-1">
                                <div className="h-2 w-16 bg-white/20 rounded-full mb-1"></div>
                                <div className="h-2 w-8 bg-brand/20 rounded-full"></div>
                            </div>
                            <span className="text-white font-mono text-xs">x1</span>
                        </div>
                    ))}
                    {/* Scanning Line Animation */}
                    {isInView && (
                        <motion.div
                            animate={{ top: ['0%', '100%', '0%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-[2px] bg-red-500 shadow-[0_0_20px_rgba(255,0,0,0.8)] z-20 pointer-events-none"
                            style={{ willChange: 'top' }}
                        ></motion.div>
                    )}
                </div>
                {/* Total & Checkout */}
                <div className="p-4 bg-[#161616] border-t border-white/5">
                    <div className="flex justify-between text-white font-bold mb-4">
                        <span>المجموع:</span>
                        <span className="font-mono text-brand">12,500 دج</span>
                    </div>
                    <button className="w-full py-3 bg-brand hover:bg-brand-hover text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(255,122,0,0.3)]">
                        دفع (F12)
                    </button>
                </div>
            </div>

            {/* Mobile Checkout Bar (Floating Bottom) - Visible only on Mobile */}
            <div className="md:hidden absolute bottom-0 left-0 right-0 bg-[#161616]/90 backdrop-blur-md border-t border-white/10 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand">
                            <ShoppingCart className="w-4 h-4" />
                        </div>
                        <span className="text-white font-bold text-sm">3 منتجات</span>
                    </div>
                    <span className="text-brand font-mono font-bold text-lg">12,500 دج</span>
                </div>
                <button className="w-full py-3 bg-brand text-white font-bold rounded-xl shadow-lg">
                    تأكيد الطلب
                </button>
            </div>

            {/* Reflection */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none rounded-3xl pointer-events-none"></div>
        </div>
    );
};

// 2. POS Modes Interactive Demo
const POSModesDemo = () => {
    const [mode, setMode] = useState<'sell' | 'return' | 'loss' | 'expense'>('sell');

    const modes = {
        sell: {
            title: "وضع البيع (Standard)",
            sub: "البيع السريع",
            color: "text-brand",
            bg: "bg-brand",
            border: "border-brand",
            shadow: "shadow-brand/20",
            icon: ShoppingCart,
            desc: "الوضع العادي للبيع. سريع وسلس."
        },
        return: {
            title: "وضع الإرجاع (Retour)",
            sub: "إرجاع المنتجات",
            color: "text-blue-500",
            bg: "bg-blue-500",
            border: "border-blue-500",
            shadow: "shadow-blue-500/20",
            icon: RefreshCcw,
            desc: "رجع سلعة للستوك ورجع الدراهم للكليون بضغطة زر."
        },
        loss: {
            title: "وضع الخسارة (Pertes)",
            sub: "إتلاف المخزون",
            color: "text-red-500",
            bg: "bg-red-500",
            border: "border-red-500",
            shadow: "shadow-red-500/20",
            icon: AlertTriangle,
            desc: "سجل السلعة الفاسدة أو المكسرة باش يخرجها من الستوك."
        },
        expense: {
            title: "وضع المصاريف (Frais)",
            sub: "تسجيل المصاريف",
            color: "text-yellow-500",
            bg: "bg-yellow-500",
            border: "border-yellow-500",
            shadow: "shadow-yellow-500/20",
            icon: Wallet,
            desc: "سجل مصاريف الحانوت (غداء، نقل، إلخ) مباشرة من الكاشير."
        }
    };

    const currentMode = modes[mode];

    return (
        <div className="mb-32 px-4">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
                    أنظمة بيع متعددة: بدل الـ Mode في <span className={modes[mode].color}>رمشة عين</span> 😉
                </h2>
                <p className="text-gray-400 max-w-xl mx-auto text-lg">
                    واجهة ذكية تتغير حسب احتياجك. كلش في بلاصة وحدة.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto items-start">
                {/* Controls - Left Side */}
                <div className="lg:col-span-4 flex flex-col gap-4 sticky top-24">
                    {(Object.keys(modes) as Array<keyof typeof modes>).map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`group relative p-4 rounded-2xl border transition-all duration-300 overflow-hidden text-right ${mode === m
                                ? `bg-[#161616] ${modes[m].border} shadow-lg ${modes[m].shadow}`
                                : 'bg-[#0A0A0A] border-white/5 hover:bg-[#111] hover:border-white/10'
                                }`}
                        >
                            {/* Background Gradient for Active Text */}
                            {mode === m && <div className={`absolute inset-0 opacity-10 ${modes[m].bg}`}></div>}

                            <div className="flex items-center gap-4 relative z-10">
                                <div className={`p-3 rounded-xl transition-colors duration-300 ${mode === m ? modes[m].bg + ' text-white' : 'bg-[#1A1A1A] text-gray-500 group-hover:text-white'}`}>
                                    {React.createElement(modes[m].icon, { className: "w-6 h-6" })}
                                </div>
                                <div>
                                    <div className={`font-bold text-lg mb-1 transition-colors ${mode === m ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                                        {modes[m].title}
                                    </div>
                                    <div className="text-xs text-gray-500 leading-tight">
                                        {modes[m].desc}
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Live Preview - Right Side */}
                <div className="lg:col-span-8">
                    <motion.div
                        layout
                        className={`relative rounded-3xl border-2 overflow-hidden bg-[#050505] shadow-2xl transition-colors duration-500 min-h-[500px] flex flex-col`}
                        style={{ borderColor: mode === 'sell' ? '#FF7A0033' : mode === 'return' ? '#3B82F633' : mode === 'loss' ? '#EF444433' : '#EAB30833' }}
                    >
                        {/* Header Bar */}
                        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0A0A0A]">
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                            </div>
                            <div className={`px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-sm font-mono font-bold flex items-center gap-2 transition-colors duration-300 ${currentMode.color}`}>
                                <currentMode.icon className="w-4 h-4" />
                                {currentMode.sub}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 p-6 relative">
                            <AnimatePresence mode="wait">
                                {mode === 'expense' ? (
                                    /* EXPENSE MODE UI (Form Layout) */
                                    <motion.div
                                        key="expense"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 1.05 }}
                                        transition={{ duration: 0.3 }}
                                        className="h-full flex flex-col items-center justify-center max-w-md mx-auto w-full"
                                    >
                                        <div className="w-full bg-[#111] rounded-2xl border border-dashed border-yellow-500/30 p-8 text-center space-y-6">
                                            <div className="w-20 h-20 mx-auto rounded-full bg-yellow-500/10 flex items-center justify-center">
                                                <Wallet className="w-10 h-10 text-yellow-500" />
                                            </div>
                                            <div className="space-y-4 w-full">
                                                <input disabled placeholder="المبلغ (دج)" className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-right text-white font-mono" />
                                                <div className="flex gap-2 justify-center">
                                                    {['غداء', 'نقل', 'صيانة', 'أخرى'].map(tag => (
                                                        <span key={tag} className="px-3 py-1 rounded-lg bg-white/5 text-gray-400 text-xs border border-white/5">{tag}</span>
                                                    ))}
                                                </div>
                                                <textarea disabled placeholder="ملاحظة..." className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-right text-white h-24 resize-none"></textarea>
                                            </div>
                                            <button className="w-full py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors">
                                                تسجيل المصروف
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    /* GRID LAYOUT (Sell, Return, Loss) */
                                    <motion.div
                                        key="grid"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="h-full flex gap-6"
                                    >
                                        {/* Products Grid */}
                                        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {[...Array(6)].map((_, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className={`bg-[#111] rounded-xl border p-3 flex flex-col gap-3 group relative overflow-hidden transition-colors duration-300 ${mode === 'loss' ? 'border-red-500/20 hover:border-red-500' : mode === 'return' ? 'border-blue-500/20 hover:border-blue-500' : 'border-white/5 hover:border-brand'}`}
                                                >
                                                    <div className="flex-1 bg-white/5 rounded-lg w-full aspect-video relative">
                                                        {/* Contextual Icon overlay */}
                                                        <div className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm`}>
                                                            {mode === 'loss' && <AlertTriangle className="w-8 h-8 text-red-500" />}
                                                            {mode === 'return' && <RefreshCcw className="w-8 h-8 text-blue-500" />}
                                                            {mode === 'sell' && <ShoppingCart className="w-8 h-8 text-brand" />}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="h-2 w-2/3 bg-white/10 rounded-full"></div>
                                                        <div className="h-2 w-1/3 bg-white/5 rounded-full"></div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>

                                        {/* Cart Sidebar */}
                                        <div className={`w-64 rounded-xl border border-white/5 flex flex-col overflow-hidden transition-colors duration-300 ${mode === 'loss' ? 'bg-red-500/5' : mode === 'return' ? 'bg-blue-500/5' : 'bg-[#111]'}`}>
                                            <div className={`p-4 border-b border-white/5 font-bold flex justify-between ${currentMode.color}`}>
                                                <span>{mode === 'loss' ? 'قائمة الإتلاف' : mode === 'return' ? 'قائمة الإرجاع' : 'السلة'}</span>
                                                <span className="font-mono opacity-80">2</span>
                                            </div>
                                            <div className="flex-1 p-3 space-y-2">
                                                <div className="bg-[#0A0A0A] p-2 rounded-lg border border-white/5 flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded bg-white/5"></div>
                                                    <div className="flex-1 h-2 bg-white/10 rounded-full"></div>
                                                </div>
                                                <div className="bg-[#0A0A0A] p-2 rounded-lg border border-white/5 flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded bg-white/5"></div>
                                                    <div className="flex-1 h-2 bg-white/10 rounded-full"></div>
                                                </div>
                                            </div>
                                            <div className="p-4 border-t border-white/5 bg-black/20">
                                                <button className={`w-full py-2.5 rounded-lg font-bold text-white shadow-lg transition-colors ${currentMode.bg} hover:brightness-110`}>
                                                    {mode === 'loss' ? 'تأكيد الإتلاف' : mode === 'return' ? 'إرجاع المال' : 'دفع (Space)'}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

// 3. TICKET CUSTOMIZATION & PRINTING (New Component)
// 3. TICKET CUSTOMIZATION & PRINTING (Redesigned - Brand Theme)
const TicketCustomizationSection = () => {
    const [template, setTemplate] = useState<'thermal' | 'a4'>('thermal');

    return (
        <div className="mb-32">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto px-6">
                {/* Left: Content & Features */}
                <div>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-bold mb-6"
                    >
                        <Printer className="w-4 h-4" />
                        الطباعة والفواتير
                    </motion.div>
                    <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
                        تخصيص الفواتير: التيكيه تاعك، <span className="text-brand">بالستيل</span> لي يعجبك. 🎨
                    </h2>
                    <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                        ما تتقيدش بتصميم واحد. في سطوكيها، أنت الرسام. صمم التيكيه (Ticket) أو الفاتورة (Facture) كيما تحب، زيد اللوجو، بدل الخط، وتحكم في كلش.
                    </p>

                    <div className="space-y-6">
                        {[
                            {
                                icon: Layout,
                                title: "قوالب جاهزة واحترافية",
                                desc: "ما تكسرش راسك، خير واحد من القوالب الموجودة وابدأ تخدم.",
                                color: "text-brand", bg: "bg-brand/10"
                            },
                            {
                                icon: Printer,
                                title: "طبع واش تحب",
                                desc: "تيكيه صغيرة (Thermal 80mm) ولا فاتورة كبيرة (A4)، النظام يدعمهم في زوج في نفس الوقت.",
                                color: "text-white", bg: "bg-white/10"
                            },
                            {
                                icon: Settings,
                                title: "تحكم شامل",
                                desc: "زيد QR Code، بدل العنوان، اخفي الأسعار... كلش بضغطة زر.",
                                color: "text-brand", bg: "bg-brand/10"
                            }
                        ].map((item, i) => (
                            <div key={i} className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${item.bg}`}>
                                    <item.icon className={`w-6 h-6 ${item.color}`} />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-lg mb-1">{item.title}</h3>
                                    <p className="text-gray-400 text-sm">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: The Visual Editor Mockup */}
                <div className="relative">
                    {/* Background Glow */}
                    <div className="absolute inset-0 bg-brand/5 blur-[80px] rounded-full pointer-events-none"></div>

                    <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-6 relative z-10 shadow-2xl">
                        {/* Editor Header */}
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                            <div className="flex gap-2 bg-[#111] p-1 rounded-lg border border-white/5">
                                <button
                                    onClick={() => setTemplate('thermal')}
                                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${template === 'thermal' ? 'bg-brand text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Ticket 80mm
                                </button>
                                <button
                                    onClick={() => setTemplate('a4')}
                                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${template === 'a4' ? 'bg-brand text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Facture A4
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <div className="w-8 h-8 rounded-full bg-[#161616] border border-white/5 flex items-center justify-center text-gray-400">
                                    <Settings className="w-4 h-4" />
                                </div>
                            </div>
                        </div>

                        {/* Editor Workspace */}
                        <div className="flex gap-4 h-[400px]">
                            {/* Controls Sidebar */}
                            <div className="w-1/3 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-500 font-bold">اللوجو (Logo)</label>
                                    <div className="h-20 bg-[#111] border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-gray-600 hover:border-brand/50 hover:bg-brand/5 transition-colors cursor-pointer">
                                        <div className="w-8 h-8 mb-1"><img src="/logo-new.ico" className="opacity-50" /></div>
                                        <span className="text-[10px]">بدل الصورة</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-500 font-bold">معلومات المحل</label>
                                    <div className="h-2 bg-[#161616] rounded-full w-full"></div>
                                    <div className="h-2 bg-[#161616] rounded-full w-2/3"></div>
                                </div>
                                <div className="pt-4 border-t border-white/5">
                                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                                        <span>إظهار QR Code</span>
                                        <div className="w-8 h-4 bg-brand/20 rounded-full relative"><div className="absolute right-0.5 top-0.5 w-3 h-3 bg-brand rounded-full shadow"></div></div>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                        <span>إظهار الملاحظات</span>
                                        <div className="w-8 h-4 bg-[#222] rounded-full relative"><div className="absolute left-0.5 top-0.5 w-3 h-3 bg-gray-500 rounded-full"></div></div>
                                    </div>
                                </div>
                            </div>

                            {/* Live Preview Area */}
                            <div className="flex-1 bg-[#1A1A1A] rounded-xl border border-white/5 p-4 flex items-center justify-center overflow-hidden relative">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"></div>

                                <AnimatePresence mode="wait">
                                    {template === 'thermal' ? (
                                        <motion.div
                                            key="thermal"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="w-48 bg-white text-black p-4 shadow-2xl text-[8px] font-mono leading-tight rotate-1"
                                        >
                                            <div className="text-center mb-4 border-b pb-2 border-black/10">
                                                <div className="font-bold text-lg mb-1">STOUKIHA</div>
                                                <div>حي العالية، الجزائر</div>
                                                <div>0550 00 00 00</div>
                                            </div>
                                            <div className="flex justify-between font-bold mb-2">
                                                <span>PRODUIT</span>
                                                <span>PRIX</span>
                                            </div>
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex justify-between mb-1">
                                                    <span>Article {i}</span>
                                                    <span>1000 DA</span>
                                                </div>
                                            ))}
                                            <div className="border-t border-dashed border-black/20 my-2"></div>
                                            <div className="flex justify-between font-bold text-sm">
                                                <span>TOTAL</span>
                                                <span>3000 DA</span>
                                            </div>
                                            <div className="mt-4 flex justify-center">
                                                <div className="w-16 h-16 bg-black/10"></div>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="a4"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="w-56 h-72 bg-white text-black p-3 shadow-2xl text-[6px] flex flex-col relative"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="w-8 h-8 bg-brand rounded"></div>
                                                <div className="text-right">
                                                    <div className="font-bold text-brand text-lg">FACTURE</div>
                                                    <div>#2024-001</div>
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-100 h-4 mb-2"></div>
                                            <div className="space-y-1">
                                                {[1, 2, 3, 4].map(i => (
                                                    <div key={i} className="flex justify-between border-b border-gray-100 pb-1">
                                                        <span className="w-1/2">Product Description {i}</span>
                                                        <span>1</span>
                                                        <span>5000.00</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-auto border-t border-brand pt-2 flex justify-end gap-4">
                                                <div className="text-right">
                                                    <div className="font-bold text-xs">TOTAL A PAYER</div>
                                                    <div className="text-brand font-bold text-base">20,000 DA</div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 4. ADVANCED SELLING FEATURES (Redesigned - Cards System)
const AdvancedSellingSection = () => {
    const ref = React.useRef(null);
    const isInView = useInView(ref, { margin: "-50px" });

    const features = [
        {
            title: "بيع بالميزان (الوزن)",
            desc: "السيستم يقرا الوزن مباشرة من الميزان. حط السلعة، والسعر يطلع أوتوماتيك.",
            icon: Scale,
            visual: (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#1A1A1A] rounded-xl border border-dashed border-white/10 relative overflow-hidden group-hover:border-brand/30 transition-colors">
                    <div className="text-4xl font-mono text-brand font-bold mb-1">1.250 <span className="text-sm text-gray-500">kg</span></div>
                    <div className="px-3 py-1 bg-brand/10 text-brand text-[10px] rounded-full font-bold border border-brand/20">متصل بالميزان</div>
                </div>
            )
        },
        {
            title: "تاريخ الصلاحية (Péremption)",
            desc: "تنبيهات ذكية قبل ما تموت السلعة. بيع القديم قبل الجديد (FEFO) باش ما تخسرش.",
            icon: CalendarClock,
            visual: (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#1A1A1A] rounded-xl border border-white/5 relative overflow-hidden">
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg backdrop-blur-sm">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-red-400 font-bold">ينتهي قريباً</span>
                            <span className="text-xs text-white font-mono">2024-12-31</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "البيع بالكرتون (Emballage)",
            desc: "بيع بالوحدة ولا بالكرطونة. النظام يحسب الكمية ويقص من الستوك بذكاء.",
            icon: Package,
            visual: (
                <div className="w-full h-full flex items-center justify-center bg-[#1A1A1A] rounded-xl border border-white/5 relative overflow-hidden gap-2">
                    <div className="w-12 h-12 bg-[#222] border border-white/10 rounded-lg flex items-center justify-center shadow-lg relative">
                        <Package className="text-gray-600 w-6 h-6" />
                        <div className="absolute -top-2 -right-2 bg-brand text-black text-[10px] font-bold px-1.5 rounded-full">x12</div>
                    </div>
                    <ArrowRightLeft className="w-4 h-4 text-gray-600" />
                    <div className="w-8 h-8 bg-[#222] border border-white/10 rounded-lg flex items-center justify-center shadow-lg">
                        <div className="w-3 h-3 bg-white/20 rounded-full"></div>
                    </div>
                </div>
            )
        },
        {
            title: "الأرقام التسلسلية (S/N)",
            desc: "تبع المنتجات الغالية (هواتف، إلكترونيات) حبة بحبة. كل حبة عندها تاريخها.",
            icon: Barcode,
            visual: (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#1A1A1A] rounded-xl border border-white/5 relative overflow-hidden">
                    <div className="w-3/4 h-12 bg-white flex flex-col items-center justify-center p-1 rounded-sm">
                        <div className="flex-1 w-full bg-[url('https://upload.wikimedia.org/wikipedia/commons/8/84/EAN13.svg')] bg-cover bg-center opacity-80"></div>
                        <div className="text-[8px] text-black font-mono font-bold tracking-widest mt-0.5">S/N: 8839201</div>
                    </div>
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-red-500 shadow-[0_0_10px_red]"></div>
                </div>
            )
        },
        {
            title: "البيع بالمتر (Mesure)",
            desc: "للكوابل، القماش، والأنابيب. اكتب الطول، والنظام يحسب السعر ويقص من الرولو.",
            icon: Ruler,
            visual: (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#1A1A1A] rounded-xl border border-white/5 relative overflow-hidden">
                    <div className="w-3/4 h-4 bg-yellow-500/20 border border-yellow-500/40 rounded flex items-center relative overflow-hidden">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="flex-1 border-r border-yellow-500/40 h-full flex items-end justify-center">
                                <div className="h-1.5 w-px bg-yellow-500/60"></div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 font-mono text-brand font-bold text-sm">3.50 m</div>
                </div>
            )
        },
        {
            title: "الضمان (Garantie)",
            desc: "حدد مدة الضمان لكل منتج. اطبعها في الفاتورة واحمي حقوقك وحقوق الزبون.",
            icon: ShieldCheck,
            visual: (
                <div className="w-full h-full flex items-center justify-center bg-[#1A1A1A] rounded-xl border border-white/5 relative overflow-hidden">
                    <div className="relative">
                        <ShieldCheck className="w-16 h-16 text-brand/20" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="font-bold text-brand text-xs">12 شهر</span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-[#1A1A1A]">
                            <CheckCircle2 className="w-3 h-3 text-black" />
                        </div>
                    </div>
                </div>
            )
        }
    ];

    return (
        <div ref={ref} className="mb-32">
            <div className="text-center mb-16">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    className="inline-block px-4 py-1.5 rounded-full border border-brand/30 bg-brand/10 text-brand font-bold text-sm mb-4"
                >
                    <Tags className="w-4 h-4 inline-block ml-2" />
                    ماشي غير بيع بسيط
                </motion.div>
                <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
                    إدارة شاملة للمخزون: بيع <span className="text-brand">أي حاجة</span>، كيفما كانت. 📦
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
                    من الخضرة للمواد الغذائية للإلكترونيات. سطوكيها مصمم باش يتعامل مع كل أنواع المنتجات وطرق البيع المعقدة.
                </p>
            </div>

            {/* Feature Cards Grid (2 Columns on Desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mb-24 cursor-default">
                {features.map((item, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-[#111] rounded-3xl border border-white/5 p-6 hover:border-brand/30 transition-all duration-300 group flex flex-col"
                    >
                        {/* Visual Area */}
                        <div className="w-full h-40 mb-6 rounded-2xl overflow-hidden relative bg-[#050505] flex items-center justify-center group-hover:bg-[#0A0A0A] transition-colors">
                            <div className="w-full h-full p-2">
                                {item.visual}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand shrink-0 group-hover:bg-brand group-hover:text-black transition-colors">
                                <item.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg mb-2 group-hover:text-brand transition-colors">{item.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Price Levels Section (Orange Themed) */}
            <div className="max-w-5xl mx-auto bg-gradient-to-br from-[#111] to-[#0A0A0A] rounded-3xl border border-brand/20 p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row items-center gap-12 shadow-[0_0_50px_rgba(255,122,0,0.05)]">
                <div className="flex-1 z-10">
                    <div className="flex items-center gap-3 text-brand font-bold mb-4">
                        <Coins className="w-6 h-6" />
                        <span>مستويات الأسعار (Niveaux de Prix)</span>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4">بيع للجملة، للتجزئة، ولـ VIP في نفس الوقت.</h3>
                    <p className="text-gray-400 leading-relaxed mb-8">
                        حدد أسعار مختلفة لنفس المنتج. النظام يغير السعر أوتوماتيك مع اختيار الكليون (Client).
                        <br />
                        <span className="text-brand/80 text-sm block mt-2">• سعر التجزئة (Détail)</span>
                        <span className="text-brand/80 text-sm block mt-1">• سعر الجملة (Gros)</span>
                        <span className="text-brand/80 text-sm block mt-1">• سعر خاص (Promotions)</span>
                    </p>
                </div>

                <div className="flex-1 flex justify-center z-10 w-full">
                    {/* Visual representation of Price Levels */}
                    <div className="bg-[#161616] border border-brand/10 rounded-2xl p-4 w-full max-w-sm space-y-3 shadow-2xl relative">
                        {/* Glow Effect */}
                        <div className="absolute -inset-1 bg-brand/20 blur-xl opacity-20 rounded-full pointer-events-none"></div>

                        <div className="flex items-center justify-between text-gray-500 text-xs px-2">
                            <span>المنتج</span>
                            <span>السعر</span>
                        </div>
                        <div className="flex items-center justify-between bg-[#222] p-3 rounded-lg border-r-4 border-gray-500">
                            <span className="text-white font-bold">زبون عادي</span>
                            <span className="text-white font-mono">15,000 دج</span>
                        </div>
                        <div className="flex items-center justify-between bg-[#222] p-3 rounded-lg border-r-4 border-brand/50 relative overflow-hidden">
                            <div className="absolute inset-0 bg-brand/5"></div>
                            <span className="text-white font-bold">زبون جملة</span>
                            <div className="flex flex-col items-end">
                                <span className="text-gray-500 line-through text-[10px]">15,000</span>
                                <span className="text-brand font-mono">12,500 دج</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between bg-[#222] p-3 rounded-lg border-r-4 border-brand relative overflow-hidden ring-1 ring-brand/20">
                            <div className="absolute inset-0 bg-brand/10"></div>
                            <span className="text-white font-bold flex items-center gap-2">VIP Premium {isInView && <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>}</span>
                            <div className="flex flex-col items-end">
                                <span className="text-gray-500 line-through text-[10px]">15,000</span>
                                <span className="text-brand font-mono font-bold text-lg">11,000 دج</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 5. SERA AI SECTION
const SalesResult = () => (
    <div className="w-full bg-[#141414] rounded-xl p-4 border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-brand/10 blur-2xl rounded-full pointer-events-none"></div>
        <div className="flex justify-between items-start mb-4">
            <div>
                <div className="text-[10px] text-gray-500 font-bold mb-1">صافي الأرباح (اليوم)</div>
                <div className="text-2xl font-black text-white flex items-baseline gap-2">
                    24,500 <span className="text-sm font-normal text-gray-400">دج</span>
                </div>
            </div>
            <div className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-green-500 text-[10px] font-bold flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                12%
            </div>
        </div>
        <div className="flex items-end gap-2 h-20 pt-4 border-t border-white/5">
            {[40, 70, 45, 90, 60, 80, 50].map((h, i) => (
                <div key={i} className="flex-1 bg-white/5 rounded-t-sm hover:bg-brand transition-colors group relative" style={{ height: `${h}%` }}>
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-white text-black text-[8px] font-bold px-1.5 py-0.5 rounded transition-opacity">{h}00</div>
                </div>
            ))}
        </div>
    </div>
);

const InventoryResult = () => (
    <div className="w-full bg-[#141414] rounded-xl p-4 border border-white/5 shadow-2xl relative">
        <div className="flex gap-3">
            <div className="bg-yellow-500/10 w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-yellow-500/20">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="flex-1">
                <h4 className="text-white font-bold text-sm mb-1">تنبيه نفاذ الكمية</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                    المنتج <span className="text-white font-medium">ساعة Smart Watch Ultra</span> راهو قريب يخلص.
                </p>
                <div className="mt-3 flex items-center justify-between text-xs bg-[#0A0A0A] p-2 rounded border border-white/5">
                    <span className="text-gray-500">الباقي في المخزون:</span>
                    <span className="text-yellow-500 font-bold">3 قطع</span>
                </div>
            </div>
        </div>
    </div>
);

const CustomerResult = () => (
    <div className="w-full bg-[#141414] rounded-xl p-4 border border-white/5 shadow-2xl">
        <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] text-gray-500 font-bold uppercase">بطاقة زبون</span>
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        </div>
        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#222] rounded-full flex items-center justify-center text-white font-bold">M</div>
            <div>
                <div className="text-white font-bold text-sm">Mohamed Amine</div>
                <div className="text-[10px] text-gray-500">0550 12 34 56</div>
            </div>
        </div>
        <div className="space-y-2">
            <div className="flex justify-between text-xs py-2 border-t border-white/5">
                <span className="text-gray-400">مجموع المشتريات</span>
                <span className="text-white font-mono">15,200 دج</span>
            </div>
            <div className="flex justify-between text-xs py-2 border-t border-white/5">
                <span className="text-gray-400">الديون (Crédit)</span>
                <span className="text-red-500 font-bold font-mono">4,500 دج</span>
            </div>
        </div>
    </div>
);

const POSSeraSection = () => {
    const [index, setIndex] = useState(0);
    const [displayText, setDisplayText] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [showResult, setShowResult] = useState(false);

    const SCENARIOS = [
        { query: "شحال دخلنا دراهم اليوم؟", result: <SalesResult /> },
        { query: "خاصني العميل محمد أمين", result: <CustomerResult /> },
        { query: "واش هوما لي برودوي لي قريب يخلصو؟", result: <InventoryResult /> }
    ];

    const ref = React.useRef(null);
    const isInView = useInView(ref, { margin: "-50px" });

    React.useEffect(() => {
        if (!isInView) return;

        // Reset state when entering view or changing index
        let currentScenario = SCENARIOS[index];
        let charIndex = 0;
        setDisplayText("");
        setShowResult(false);
        setIsTyping(true);

        const typeInterval = setInterval(() => {
            if (charIndex <= currentScenario.query.length) {
                setDisplayText(currentScenario.query.slice(0, charIndex));
                charIndex++;
            } else {
                clearInterval(typeInterval);
                setIsTyping(false);
                setTimeout(() => {
                    setShowResult(true);
                    setTimeout(() => {
                        setIndex(prev => (prev + 1) % SCENARIOS.length);
                    }, 4000);
                }, 600);
            }
        }, 50);

        return () => clearInterval(typeInterval);
    }, [index, isInView]);

    return (
        <div ref={ref} className="mb-32">
            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                <div className="w-full lg:w-1/2 text-center lg:text-right order-2 lg:order-1">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] font-bold mb-4 uppercase tracking-widest"
                    >
                        <Sparkles className="w-3 h-3" />
                        Smart Assistant (AI)
                    </motion.div>
                    <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-[1.4]">
                        المساعدة الذكية <span className="text-brand">سيرا (Sera)</span>. <br />
                        <span className="text-gray-500 text-2xl md:text-4xl font-bold">أكتب واش حبيت، وهي تنفذ.</span>
                    </h2>
                    <p className="text-gray-400 text-lg leading-relaxed max-w-xl mx-auto lg:mr-0 mb-8">
                        سيرا هي مساعد شخصي داخل البرنامج. في بلاصة ما تبقا تحوس في القوائم (Menus)، أكتب برك واش راك حاب: "شحال بعنا اليوم؟"، "زيد السلعة لفلان"، وهي تجبدلك المعلومة في ثانية.
                    </p>
                    <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                        <div className="px-4 py-2 bg-[#141414] border border-white/5 rounded-lg text-xs text-brand flex items-center gap-2">
                            <Search className="w-3 h-3" />
                            بحث ذكي
                        </div>
                        <div className="px-4 py-2 bg-[#141414] border border-white/5 rounded-lg text-xs text-brand flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            تنفيذ فوري
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-1/2 order-1 lg:order-2 flex justify-center">
                    <div className="relative w-full max-w-sm">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-brand/5 blur-[80px] rounded-full pointer-events-none"></div>
                        <div className="h-[200px] flex items-end justify-center mb-4 perspective-[1000px]">
                            <AnimatePresence mode="wait">
                                {showResult && (
                                    <motion.div
                                        key={`res-${index}`}
                                        initial={{ opacity: 0, rotateX: -20, y: 20 }}
                                        animate={{ opacity: 1, rotateX: 0, y: 0 }}
                                        exit={{ opacity: 0, rotateX: 20, y: -20, transition: { duration: 0.2 } }}
                                        className="w-full transform-gpu"
                                    >
                                        {SCENARIOS[index].result}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <div className="relative bg-[#0A0A0A] border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand to-brand/50 flex items-center justify-center shrink-0 shadow-lg shadow-brand/20">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 h-6 flex items-center overflow-hidden">
                                <span className="text-sm md:text-base text-gray-200 font-medium whitespace-nowrap">
                                    {displayText}
                                    {isTyping && <span className="animate-pulse text-brand">|</span>}
                                </span>
                            </div>
                            <div className={`p-2 rounded-lg transition-colors ${displayText.length > 0 ? 'bg-brand text-white' : 'bg-white/5 text-gray-600'}`}>
                                <Send className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


// 6. REGISTERS & RECORDS SECTION
const POSRegistersSection = () => {
    const [activeTab, setActiveTab] = useState('orders');

    const registers = [
        {
            id: 'orders',
            title: "طلبيات نقطة البيع",
            icon: FileText,
            desc: "أرشيف كامل لكل عمليات البيع. تقدر ترجع لأي كوموند، تعدلها، أو تعاود تطبعها في أي وقت.",
            visual: (
                <div className="w-full bg-[#141414] rounded-xl border border-white/5 overflow-hidden flex flex-col h-64">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#1A1A1A]">
                        <span className="text-xs text-gray-500 font-bold">رقم الطلب</span>
                        <span className="text-xs text-gray-500 font-bold">الحالة</span>
                        <span className="text-xs text-gray-500 font-bold">المبلغ</span>
                    </div>
                    {[
                        { id: "#ORD-9921", status: "مكتملة", price: "12,500", color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20" },
                        { id: "#ORD-9922", status: "معلقة", price: "4,200", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
                        { id: "#ORD-9923", status: "مكتملة", price: "8,900", color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20" },
                        { id: "#ORD-9924", status: "ملغاة", price: "0", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 cursor-pointer group transition-colors">
                            <span className="text-white font-mono text-xs group-hover:text-brand transition-colors">{item.id}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.bg} ${item.color} ${item.border}`}>{item.status}</span>
                            <span className="text-white font-mono text-xs">{item.price} دج</span>
                        </div>
                    ))}
                </div>
            )
        },
        {
            id: 'customers',
            title: "سجل العملاء",
            icon: Users,
            desc: "قاعدة بيانات لزبائنك. سجل مشترياتهم، نقاط الوفاء، ومعلومات الاتصال.",
            visual: (
                <div className="w-full bg-[#141414] rounded-xl border border-white/5 p-4 flex items-center justify-center h-64 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-2xl rounded-full pointer-events-none"></div>
                    <div className="w-full max-w-[220px] bg-[#0A0A0A] rounded-xl border border-white/10 p-4 relative z-10 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">AM</div>
                            <div>
                                <div className="text-white font-bold text-sm">Ahmed M.</div>
                                <div className="text-[10px] text-gray-500">زبون مميز (VIP)</div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center py-2 border-t border-white/5">
                            <span className="text-[10px] text-gray-400">آخر زيارة</span>
                            <span className="text-[10px] text-white">منذ يومين</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-t border-white/5">
                            <span className="text-[10px] text-gray-400">نقاط الوفاء</span>
                            <span className="text-xs text-brand font-bold font-mono">1,450 pt</span>
                        </div>
                        <button className="w-full py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs rounded border border-white/5 transition-colors">
                            تعديل الملف
                        </button>
                    </div>
                </div>
            )
        },
        {
            id: 'debts',
            title: "مديونيات العملاء (Crédit)",
            icon: CreditCard,
            desc: "تبع الكريدي (الديون) بالسنتيم. شوف شحال يسالولك، وسجل الدفعات (Versements) بسهولة.",
            visual: (
                <div className="w-full bg-[#141414] rounded-xl border border-white/5 overflow-hidden flex flex-col h-64 p-4 items-center justify-center relative">
                    <div className="absolute inset-0 bg-red-500/5 pointer-events-none"></div>
                    <div className="text-center mb-6 z-10">
                        <div className="text-sm text-gray-400 mb-1">مجموع الديون المستحقة</div>
                        <div className="text-3xl font-black text-white font-mono tracking-tight">
                            452,000 <span className="text-sm text-red-500 font-bold">دج</span>
                        </div>
                    </div>
                    <div className="w-full max-w-[240px] bg-[#0A0A0A] rounded-lg border border-red-500/20 p-3 flex items-center justify-between z-10">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            <span className="text-xs text-white">Yassine B.</span>
                        </div>
                        <span className="text-xs text-red-500 font-mono font-bold">- 12,000 دج</span>
                    </div>
                    <div className="w-full max-w-[240px] bg-[#0A0A0A] rounded-lg border border-white/5 p-3 flex items-center justify-between mt-2 z-10 opacity-60">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                            <span className="text-xs text-white">Karim S.</span>
                        </div>
                        <span className="text-xs text-gray-400 font-mono font-bold">0 دج</span>
                    </div>
                </div>
            )
        },
        {
            id: 'returns',
            title: "إرجاعات المنتجات",
            icon: RotateCcw,
            desc: "سجل المرتجعات (Retour) وسبب الإرجاع. المخزون يتحدث أوتوماتيكياً.",
            visual: (
                <div className="w-full bg-[#141414] rounded-xl border border-white/5 p-4 flex flex-col h-64 relative overflow-hidden">
                    <div className="space-y-3 relative z-10 mt-auto">
                        <div className="bg-[#0A0A0A] p-3 rounded-lg border border-white/5 flex gap-3">
                            <div className="w-10 h-10 bg-[#1A1A1A] rounded flex items-center justify-center border border-white/5 shrink-0">
                                <RotateCcw className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h5 className="text-white text-xs font-bold">سماعات بلوتوث</h5>
                                    <span className="text-[10px] text-gray-500 font-mono">14:30</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">السبب: <span className="text-blue-400 bg-blue-500/10 px-1 rounded">عيب مصنعي</span></p>
                            </div>
                        </div>
                        <div className="bg-[#0A0A0A] p-3 rounded-lg border border-white/5 flex gap-3 opacity-50">
                            <div className="w-10 h-10 bg-[#1A1A1A] rounded flex items-center justify-center border border-white/5 shrink-0">
                                <RotateCcw className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h5 className="text-white text-xs font-bold">شاحن سريع</h5>
                                    <span className="text-[10px] text-gray-500 font-mono">11:15</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">السبب: <span className="text-gray-400 bg-gray-500/10 px-1 rounded">زبون غير راض</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'loss',
            title: "التصريح بالخسائر",
            icon: FileWarning,
            desc: "سلعة فسدت؟ تكسرت؟ سرقة؟ صرح بيها نقصها من الستوك وحسب الخسارة بدقة.",
            visual: (
                <div className="w-full bg-[#141414] rounded-xl border border-white/5 p-6 flex flex-col items-center justify-center h-64 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-5"></div>
                    <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 mb-4 animate-[pulse_3s_infinite]">
                        <AlertTriangle className="w-7 h-7 text-red-500" />
                    </div>
                    <h4 className="text-white font-bold mb-1">تسجيل خسارة</h4>
                    <p className="text-xs text-gray-500 mb-4 max-w-[180px]">تم نقل 5 وحدات من "ياوورت فراولة" إلى قائمة الإتلاف.</p>
                    <div className="flex gap-2 text-[10px]">
                        <span className="px-2 py-1 bg-[#0A0A0A] border border-white/10 rounded text-gray-300">منتهي الصلاحية</span>
                        <span className="px-2 py-1 bg-[#0A0A0A] border border-white/10 rounded text-gray-300">كسر أثناء النقل</span>
                    </div>
                </div>
            )
        },
        {
            id: 'invoices',
            title: "الفواتير (Factures)",
            icon: Receipt,
            desc: "حول أي عملية بيع لفاتورة رسمية بضغطة زر. تحكم في الترقيم والشكل.",
            visual: (
                <div className="w-full bg-[#141414] rounded-xl border border-white/5 p-8 flex items-center justify-center h-64 relative overflow-hidden group">
                    <div className="w-32 h-40 bg-white shadow-2xl skew-x-2 group-hover:skew-x-0 transition-transform duration-500 relative flex flex-col p-2">
                        <div className="flex justify-between items-center mb-2">
                            <div className="w-4 h-4 bg-black rounded-full"></div>
                            <div className="w-8 h-1 bg-gray-200"></div>
                        </div>
                        <div className="w-full h-px bg-gray-100 mb-2"></div>
                        <div className="space-y-1">
                            <div className="w-full h-1 bg-gray-100"></div>
                            <div className="w-2/3 h-1 bg-gray-100"></div>
                            <div className="w-full h-1 bg-gray-100"></div>
                        </div>
                        <div className="mt-auto flex justify-between items-center bg-brand/10 p-1 rounded">
                            <div className="w-8 h-2 bg-brand/50"></div>
                        </div>
                    </div>
                    <div className="absolute bottom-4 right-4 bg-brand text-black text-[10px] font-bold px-2 py-1 rounded shadow-lg">PDF Ready</div>
                </div>
            )
        }
    ];

    return (
        <div className="mb-32">
            <div className="text-center mb-16">
                <span className="text-brand font-bold text-sm tracking-widest uppercase mb-2 block">سجلات دقيقة وشاملة</span>
                <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
                    كلش مسجل. <br /><span className="text-gray-500">ما تضيعلك حتى دورو.</span>
                </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
                {/* Visual Preview (Left on Desktop) */}
                <div className="lg:col-span-7 order-2 lg:order-1">
                    <div className="h-full bg-[#0A0A0A] rounded-3xl border border-white/5 shadow-2xl p-8 relative overflow-hidden flex items-center justify-center min-h-[400px]">
                        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand/5 via-transparent to-transparent pointer-events-none"></div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 1.05, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="w-full max-w-md"
                            >
                                {registers.find(r => r.id === activeTab)?.visual}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Tabs List (Right on Desktop) */}
                <div className="lg:col-span-5 order-1 lg:order-2 flex flex-col gap-3">
                    {registers.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full text-right p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 group relative overflow-hidden ${activeTab === item.id
                                ? 'bg-[#161616] border-brand/50 shadow-[0_0_20px_rgba(255,122,0,0.1)]'
                                : 'bg-transparent border-transparent hover:bg-[#111] hover:border-white/5'
                                }`}
                        >
                            {activeTab === item.id && <div className="absolute right-0 top-0 bottom-0 w-1 bg-brand"></div>}

                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${activeTab === item.id ? 'bg-brand text-black' : 'bg-[#1A1A1A] text-gray-500 group-hover:text-gray-300'
                                }`}>
                                <item.icon className="w-5 h-5" />
                            </div>

                            <div>
                                <h3 className={`font-bold text-base transition-colors ${activeTab === item.id ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                                    {item.title}
                                </h3>
                                {activeTab === item.id && (
                                    <motion.p
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2"
                                    >
                                        {item.desc}
                                    </motion.p>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const POSPage: React.FC = () => {
    return (
        <section className="bg-dark-bg min-h-screen pt-32 pb-20 relative overflow-hidden">

            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/5 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-6">

                {/* 1. HERO SECTION */}
                <div className="text-center mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-bold mb-6"
                    >
                        <Scan className="w-4 h-4" />
                        نظام الكاشير الذكي
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight"
                    >
                        <span className="block mb-2 md:mb-4">بيع بسرعة <span className="text-brand">البرق</span></span>
                        <span className="block">حتى بلا إنترنت.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-gray-400 text-lg max-w-2xl mx-auto mb-12"
                    >
                        واجهة مخصصة للسرعة. استعمل الباركود (Code Barre)، تتبع المبيعات، وتحكم في الصندوق (La Caisse) بكل سهولة. مصمم باش ما يحبسش كامل.
                    </motion.p>
                </div>

                {/* 2. THE SIMULATOR (Visual Centerpiece) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
                    whileInView={{ opacity: 1, scale: 1, rotateX: 0 }}
                    transition={{ duration: 0.8 }}
                    className="mb-32 perspective-2000"
                >
                    <POSSimulator />
                </motion.div>

                {/* 3. POS MODES DEMO (Context Switching) */}
                <POSModesDemo />

                {/* 4. TICKET CUSTOMIZATION (New Section) */}
                <TicketCustomizationSection />

                {/* 5. ADVANCED SELLING FEATURES (New Section) */}
                <AdvancedSellingSection />

                {/* 5.5. SERA AI SECTION */}
                <POSSeraSection />

                {/* 5.6. REGISTERS SECTION */}
                <POSRegistersSection />

                {/* 6. CORE FEATURES GRID */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
                    {[
                        {
                            icon: WifiOff,
                            title: "يخدم Offline 100%",
                            desc: "ما تخممش كامل على الكونيكسيون. بيع عادي، وكي ترجع الإنترنت النظام يسنكرونيزي (Sync) وحدو.",
                            color: "text-brand"
                        },
                        {
                            icon: Zap,
                            title: "سريع جداً (Turbo Mode)",
                            desc: "مصمم باش تفوت 100 زبون في الساعة بلا ما يبلوكي. غير سكانّي و فوت.",
                            color: "text-brand"
                        },
                        {
                            icon: Printer,
                            title: "يدعم كل الأجهزة",
                            desc: "قارئ الباركود، طابعة التذاكر (Ticket)، طابعة A4، والصندوق المالي (Tiroir Caisse).",
                            color: "text-brand"
                        }
                    ].map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.15 }}
                            className="bg-[#0F0F0F] border border-white/5 p-8 rounded-3xl hover:border-white/10 transition-colors group relative overflow-hidden"
                        >
                            <div className={`w-12 h-12 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${feature.color}`}>
                                <feature.icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                            <p className="text-gray-400 leading-relaxed text-sm">{feature.desc}</p>

                            {/* Hover Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        </motion.div>
                    ))}
                </div>

                {/* 7. KEYBOARD SHORTCUTS (The 'Pro' Feel) */}
                <div className="bg-[#111] rounded-3xl border border-white/5 p-8 md:p-12 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand to-transparent opacity-50"></div>

                    <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                        <div className="flex-1">
                            <h2 className="text-3xl font-bold text-white mb-4">تحكم كامل بالكيبورد ⌨️</h2>
                            <p className="text-gray-400 mb-8">
                                لزيادة السرعة، تقدر تستعمل اختصارات الكيبورد باش تبيع بلا ما تمس الفأرة (Mouse).
                            </p>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <span className="px-3 py-1 bg-[#222] rounded border border-white/10 text-white font-mono text-xs shadow-lg">F12</span>
                                    <span className="text-gray-300 text-sm">للدفع المباشر</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="px-3 py-1 bg-[#222] rounded border border-white/10 text-white font-mono text-xs shadow-lg">Space</span>
                                    <span className="text-gray-300 text-sm">للبحث عن منتج</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="px-3 py-1 bg-[#222] rounded border border-white/10 text-white font-mono text-xs shadow-lg">Esc</span>
                                    <span className="text-gray-300 text-sm">إلغاء العملية</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 flex justify-center">
                            {/* Abstract Keyboard Illustration */}
                            <div className="grid grid-cols-3 gap-2 p-4 bg-[#0A0A0A] rounded-2xl border border-white/10 shadow-2xl skew-y-3 skew-x-3">
                                {[...Array(9)].map((_, i) => (
                                    <div key={i} className={`w-16 h-16 rounded-lg border border-white/5 flex items-center justify-center ${i === 4 ? 'bg-brand/20 border-brand/50' : 'bg-[#161616]'}`}>
                                        {i === 4 && <span className="text-brand font-bold">F12</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 8. CTA AREA */}
                <div className="mt-32 text-center">
                    <h2 className="text-3xl font-bold text-white mb-6">واش راك تستنى؟</h2>
                    <p className="text-gray-400 mb-8">ابدأ استخدم نظام الكاشير المتطور اليوم.</p>
                    <button className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-gray-100 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                        جرب مجاناً الآن
                    </button>
                    <div className="mt-12 flex items-center justify-center gap-2 text-brand cursor-pointer hover:gap-4 transition-all group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-bold">الرجوع للرئيسية</span>
                    </div>
                </div>

            </div>
        </section>
    );
};
