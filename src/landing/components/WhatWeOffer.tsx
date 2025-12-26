import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Wifi, WifiOff, Store, ShoppingBag, Box, Monitor, Layers, ArrowRight } from 'lucide-react';

// --- VISUALS ---

const VisualContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="w-full h-48 bg-[#0F0F0F] relative overflow-hidden flex items-center justify-center border-b border-white/5 group-hover:bg-[#141414] transition-colors duration-500">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand/5 to-transparent opacity-20 pointer-events-none"></div>
        {children}
    </div>
);

// 1. OFFLINE VISUAL: Connection cuts, but sale continues
const OfflineVisual = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { margin: "-20px" });

    return (
        <div ref={ref} className="relative flex flex-col items-center">
            {/* The Signal Waves */}
            {isInView && (
                <div className="absolute -top-8 w-24 h-24 rounded-full border border-red-500/20 animate-ping opacity-20"></div>
            )}

            <div className="relative z-10 w-32 h-20 bg-[#1A1A1A] border border-white/10 rounded-xl p-3 flex flex-col justify-between shadow-2xl backdrop-blur-md">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[8px] text-gray-400">STATUS</span>
                    <div className="flex items-center gap-1 bg-green-500/10 px-1.5 py-0.5 rounded-full border border-green-500/20">
                        {isInView && <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>}
                        <span className="text-[8px] text-green-500 font-bold">WORKING</span>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <WifiOff className="w-5 h-5 text-red-500" />
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] text-gray-500">Internet</span>
                        <span className="text-[8px] text-red-500 font-bold">DISCONNECTED</span>
                    </div>
                </div>
            </div>

            {/* Sync Pending Badge */}
            <div className="absolute -bottom-3 bg-brand text-white text-[8px] px-2 py-0.5 rounded-full shadow-lg border border-white/10 flex items-center gap-1">
                <div className="w-1 h-1 bg-white rounded-full"></div>
                5 Sales Saved
            </div>
        </div>
    );
};

// 2. STORE VISUAL: Phone showing local shop
const StoreVisual = () => (
    <div className="relative">
        <div className="absolute inset-0 bg-brand/20 blur-[50px] rounded-full"></div>
        <div className="relative w-24 bg-black border-[3px] border-[#333] rounded-[1.5rem] p-1 shadow-2xl overflow-hidden">
            {/* Notch */}
            <div className="w-8 h-3 bg-black absolute top-0 left-1/2 -translate-x-1/2 rounded-b-lg z-20"></div>

            {/* Screen Content */}
            <div className="bg-[#111] w-full h-36 rounded-[1.2rem] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="h-10 bg-gradient-to-br from-brand to-orange-600 w-full flex items-end p-2 pb-1">
                    <div className="w-8 h-8 bg-white rounded-full shadow-lg border-2 border-[#111] translate-y-3"></div>
                </div>
                {/* Products */}
                <div className="mt-5 px-2 grid grid-cols-2 gap-1.5">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="aspect-[3/4] bg-[#222] rounded-md border border-white/5 p-1 flex flex-col gap-1">
                            <div className="w-full h-full bg-white/5 rounded-sm"></div>
                            <div className="w-2/3 h-1 bg-white/10 rounded-full"></div>
                            <div className="w-1/2 h-1 bg-brand/50 rounded-full"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

// 3. UNITS VISUAL: Box splitting into pieces
const UnitsVisual = () => (
    <div className="flex items-center gap-6">
        {/* Carton */}
        <div className="w-16 h-16 bg-[#222] border border-white/10 rounded-lg flex flex-col items-center justify-center relative group-hover:-translate-x-2 transition-transform">
            <Box className="w-6 h-6 text-brand mb-1" />
            <span className="text-[8px] text-gray-400">كرطونة</span>
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-white text-black text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#111]">
                x12
            </div>
        </div>

        {/* Arrow */}
        <div className="text-gray-600">
            <ArrowRight className="w-4 h-4" />
        </div>

        {/* Pieces */}
        <div className="grid grid-cols-2 gap-1 group-hover:translate-x-2 transition-transform">
            <div className="w-7 h-9 bg-[#1A1A1A] border border-white/10 rounded flex items-center justify-center">
                <div className="w-2 h-5 rounded-sm bg-brand/20"></div>
            </div>
            <div className="w-7 h-9 bg-[#1A1A1A] border border-white/10 rounded flex items-center justify-center">
                <div className="w-2 h-5 rounded-sm bg-brand/20"></div>
            </div>
            <div className="w-7 h-9 bg-[#1A1A1A] border border-white/10 rounded flex items-center justify-center">
                <div className="w-2 h-5 rounded-sm bg-brand/20"></div>
            </div>
            <div className="w-7 h-9 bg-[#1A1A1A] border border-white/10 rounded flex items-center justify-center">
                <div className="w-2 h-5 rounded-sm bg-brand/20"></div>
            </div>
        </div>
    </div>
);

// 4. RECEIPT VISUAL: Thermal printer effect
const ReceiptVisual = () => (
    <div className="relative w-32 group">
        {/* Printer Slot */}
        <div className="w-36 h-4 bg-[#222] rounded-full border border-white/10 absolute -top-2 left-1/2 -translate-x-1/2 z-20 shadow-xl"></div>

        {/* The Paper */}
        <div className="w-full bg-white text-black p-3 pt-4 rounded-b-lg shadow-xl text-[5px] font-mono leading-tight transform origin-top transition-transform duration-700 group-hover:translate-y-2">
            <div className="text-center font-bold text-[7px] mb-2 border-b border-black/10 pb-1">STOUKIHA MARKET</div>
            <div className="flex justify-between mb-0.5"><span>2x COFFEE</span><span>150.00</span></div>
            <div className="flex justify-between mb-0.5"><span>1x WATER</span><span>50.00</span></div>
            <div className="flex justify-between mb-0.5"><span>1x SNACK</span><span>100.00</span></div>
            <div className="border-t border-black/10 my-1"></div>
            <div className="flex justify-between font-bold text-[6px]"><span>TOTAL</span><span>300.00 DA</span></div>

            {/* Barcode */}
            <div className="mt-2 h-4 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Code_128_bar_code_for_Wikipedia.svg/1200px-Code_128_bar_code_for_Wikipedia.svg.png')] bg-cover opacity-60 grayscale"></div>

            {/* Ticket Cut SVG */}
            <div className="absolute bottom-[-4px] left-0 w-full h-1 bg-white" style={{ clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)' }}></div>
        </div>
    </div>
);

// 5. DUAL MODE VISUAL: Slider
const DualModeVisual = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { margin: "-20px" });

    return (
        <div ref={ref} className="w-64 h-16 bg-[#000] border border-white/10 rounded-full flex relative p-1">
            {/* Background Text */}
            <div className="w-1/2 h-full flex items-center justify-center gap-2 text-gray-500">
                <Store className="w-4 h-4" />
                <span className="text-xs font-bold">MODE CAISSE</span>
            </div>
            <div className="w-1/2 h-full flex items-center justify-center gap-2 text-gray-500">
                <Monitor className="w-4 h-4" />
                <span className="text-xs font-bold">MODE ADMIN</span>
            </div>

            {/* The Sliding Knob */}
            <div className="absolute top-1 left-1 w-[calc(50%-4px)] h-[calc(100%-8px)] bg-[#1A1A1A] border border-white/10 rounded-full shadow-lg flex items-center justify-center gap-2 text-white z-10 group-hover:translate-x-[100%] group-hover:w-[calc(50%)] transition-all duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275)">
                {isInView && <div className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse"></div>}
                <span className="text-[10px] font-bold tracking-widest uppercase group-hover:hidden">Vendeur</span>
                <span className="text-[10px] font-bold tracking-widest uppercase hidden group-hover:block">Moul Chi</span>
            </div>
        </div>
    );
};


const OfferCard = ({ title, desc, visual, colSpan = 1 }: { title: string, desc: string, visual: React.ReactNode, colSpan?: number }) => (
    <motion.div
        variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
        }}
        className={`group bg-[#0A0A0A] rounded-2xl border border-white/5 overflow-hidden hover:border-brand/30 transition-all duration-300 flex flex-col will-change-transform transform-gpu ${colSpan === 2 ? 'md:col-span-2' : 'col-span-1'}`}
    >
        <VisualContainer>
            {visual}
        </VisualContainer>
        <div className="p-6 flex-1 bg-[#141414] border-t border-white/5">
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-brand transition-colors">{title}</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
        </div>
    </motion.div>
);

export const WhatWeOffer: React.FC<{ onNavigate: (page: any) => void }> = ({ onNavigate }) => {
    return (
        <section className="py-24 bg-[#050505]">
            <div className="max-w-7xl mx-auto px-6">

                {/* Header */}
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/5 border border-brand/10 text-brand text-[10px] font-bold mb-4 uppercase tracking-widest"
                    >
                        <Layers className="w-3 h-3" />
                        كلش موفرينهولك
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-bold text-white mb-4"
                    >
                        واش تقدر تدير بـ <span className="text-brand">سطوكيها</span>؟
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-gray-400 text-lg"
                    >
                        أنسى المشاكل التقنية وركز في تجارتك و دراهمك.
                    </motion.p>
                </div>

                {/* Grid */}
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
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    <OfferCard
                        title="ما يهمش إذا راحت الكونيكسيون"
                        desc="تخيل تخدم نهار كامل بلا إنترنت، وكي ترجع يتسجل كلش أوتوماتيك. ما تحبسش الخدمة، وما تخسرش الكليون."
                        visual={<OfflineVisual />}
                    />
                    <OfferCard
                        title="حانوتك يولي سيت web بـ Clic"
                        desc="علاش تخلص ومطورين؟ كليكي زر واحد، السلعة لي في المحل تولي في سيت شباب، و رابط خاص بيك تبارتاجيه."
                        visual={<StoreVisual />}
                    />
                    <OfferCard
                        title="بيع بالقرعة، بالكرطونة، ولا بالمتر"
                        desc="ما تكسرش راسك مع الحسابات. سطوكيها يفهم الوحدات، يحسبلك المخزون تاع الكرطونة و الحبة بلا غلطة."
                        visual={<UnitsVisual />}
                    />
                    <OfferCard
                        title="بونات و فواتير مريقلة"
                        desc="خرج بونات (Receipt) احترافية للكليون، فيها اللوغو تاعك والكود بار. هكذا تبان محترف و منظم قدام الغاشي."
                        visual={<ReceiptVisual />}
                        colSpan={1}
                    />
                    <OfferCard
                        title="مول الشيء ماهوش كيما الخدام"
                        desc="عندك واجهة خاصة بيك (Admin) تشوف فيها الدراهم والربح، وواجهة بسيطة للكاشير (Vendeur) باش يبيع برك. أمان وراحة بال."
                        visual={<DualModeVisual />}
                        colSpan={2}
                    />
                </motion.div>

                {/* Bottom CTA */}
                <div className="mt-20 text-center">
                    <button
                        onClick={() => onNavigate('download')}
                        className="px-8 py-3.5 bg-brand hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-brand/20 transition-all transform hover:-translate-y-1"
                    >
                        اكتشف كل المميزات مجاناً
                    </button>
                </div>

            </div>
        </section>
    );
};
