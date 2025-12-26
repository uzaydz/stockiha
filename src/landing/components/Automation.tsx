import React from 'react';
import { motion, useInView } from 'framer-motion';
import { Zap, Database, Smartphone, Monitor, ShoppingBag, Globe, Share2, CheckCircle2, ArrowLeft } from 'lucide-react';

// --- VISUAL COMPONENTS ---

// 1. INPUT VISUAL: Product Entry
const InputVisual = () => (
    <div className="w-[200px] h-[140px] bg-[#141414] rounded-xl border border-white/10 p-3 relative shadow-2xl group flex flex-col gap-2 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="text-[8px] font-bold text-gray-400">إضافة منتج جديد</span>
            <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"></div>
        </div>

        {/* Form Fields */}
        <div className="space-y-1.5">
            <div className="flex gap-2">
                <div className="w-10 h-10 bg-[#222] rounded border border-dashed border-white/10 flex items-center justify-center">
                    <div className="w-4 h-4 text-gray-600">+</div>
                </div>
                <div className="flex-1 space-y-1">
                    <div className="h-1.5 w-full bg-[#222] rounded border border-white/5"></div> {/* Title Input */}
                    <div className="flex gap-1">
                        <div className="h-1.5 w-1/2 bg-[#222] rounded border border-white/5"></div> {/* Price Input */}
                        <div className="h-1.5 w-1/2 bg-[#222] rounded border border-white/5"></div> {/* Stock Input */}
                    </div>
                </div>
            </div>
            {/* Description */}
            <div className="h-1.5 w-full bg-[#222] rounded border border-white/5"></div>
            <div className="h-1.5 w-2/3 bg-[#222] rounded border border-white/5"></div>
        </div>

        {/* Submit Button (Animated) */}
        <div className="mt-auto self-end">
            <div className="px-3 py-1 bg-brand text-white text-[7px] font-bold rounded flex items-center gap-1 shadow-lg shadow-brand/20 group-hover:scale-105 transition-transform cursor-default">
                <span>Enregistrer</span>
                <CheckCircle2 className="w-2 h-2" />
            </div>
        </div>

        {/* Success Overlay on Hover */}
        <div className="absolute inset-0 bg-brand/90 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm z-10">
            <CheckCircle2 className="w-8 h-8 text-white mb-1" />
            <span className="text-[8px] font-bold text-white">Product Saved!</span>
        </div>
    </div>
);

// 2. CORE VISUAL: The Central Brain
const CoreVisual = () => (
    <div className="w-[160px] h-[160px] relative flex items-center justify-center">
        {/* Outer Rings */}
        <div className="absolute inset-0 rounded-full border border-dashed border-white/10 animate-[spin_10s_linear_infinite]"></div>
        <div className="absolute inset-4 rounded-full border border-white/5 animate-[spin_15s_linear_infinite_reverse]"></div>

        {/* Core Octagon */}
        <div className="w-20 h-20 bg-[#141414] rounded-2xl rotate-45 border border-brand/30 flex items-center justify-center relative shadow-[0_0_30px_rgba(255,122,0,0.15)] z-10 transform-gpu will-change-transform">
            <div className="w-full h-full absolute inset-0 bg-brand/5 blur-xl animate-pulse"></div>
            {/* Inner Icon */}
            <div className="-rotate-45">
                <Database className="w-8 h-8 text-brand" />
            </div>
        </div>

        {/* Orbiting Data Packets */}
        <div className="absolute inset-0 animate-[spin_4s_linear_infinite]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]"></div>
        </div>
        <div className="absolute inset-0 animate-[spin_4s_linear_infinite_reverse]">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-brand rounded-full shadow-[0_0_10px_orange]"></div>
        </div>
    </div>
);

// 3. OUTPUT VISUAL: Multi-Channel Update
const OutputVisual = () => (
    <div className="w-[220px] h-[140px] relative">
        {/* Websites / Marketplace */}
        <div className="absolute top-0 right-0 w-28 h-20 bg-[#1A1A1A] rounded-lg border border-white/10 shadow-xl z-20 overflow-hidden group-hover:-translate-y-2 transition-transform duration-500">
            <div className="h-4 bg-[#111] border-b border-white/5 flex items-center px-2 gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                <span className="text-[6px] text-gray-500 ml-1">stoukiha.shop</span>
            </div>
            <div className="p-2 flex gap-2">
                <div className="w-8 h-8 bg-gray-800 rounded"></div>
                <div>
                    <div className="h-1.5 w-12 bg-gray-700 rounded mb-1"></div>
                    <div className="h-1.5 w-8 bg-brand rounded"></div>
                </div>
            </div>
        </div>

        {/* POS Screen */}
        <div className="absolute bottom-0 left-0 w-28 h-20 bg-[#1A1A1A] rounded-lg border border-white/10 shadow-xl z-30 group-hover:translate-x-2 transition-transform duration-500 flex flex-col">
            <div className="h-4 bg-brand flex items-center justify-between px-2">
                <span className="text-[6px] text-white font-bold">POS TERMINAL</span>
                <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
            </div>
            <div className="flex-1 p-1 grid grid-cols-3 gap-0.5">
                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="bg-[#222] rounded-sm"></div>)}
            </div>
        </div>

        {/* Connection Lines (Decor) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
            <Share2 className="w-12 h-12 text-gray-600" />
        </div>
    </div>
);

// --- PIPELINE NODE ---

const PipelineNode = ({
    title,
    desc,
    visual,
    step
}: {
    title: string,
    desc: string,
    visual: React.ReactNode,
    step: string
}) => (
    <div className="flex flex-col items-center gap-6 relative z-10 w-full md:w-auto group">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#111] border border-white/10 rounded-full text-[10px] text-brand font-bold backdrop-blur-md z-20 shadow-lg will-change-transform transform-gpu">
            خطوة {step}
        </div>

        <div className="w-full md:w-56 h-48 md:h-56 bg-[#0F0F0F] rounded-[2rem] border border-white/5 flex items-center justify-center relative group-hover:border-brand/30 transition-all duration-500 shadow-2xl overflow-hidden group-hover:shadow-[0_0_30px_rgba(255,122,0,0.1)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative flex items-center justify-center transform group-hover:scale-105 transition-transform duration-500">
                {visual}
            </div>
        </div>

        <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <p className="text-sm text-gray-400 font-light max-w-[200px] leading-relaxed mx-auto">{desc}</p>
        </div>
    </div>
);

// --- CONNECTING BEAM ---

const DataBeam = () => {
    const ref = React.useRef(null);
    const isInView = useInView(ref, { margin: "-50px" });

    return (
        <div ref={ref} className="contents">
            {/* Desktop Beam (Horizontal) */}
            <div className="hidden md:flex flex-1 h-[2px] bg-[#1A1A1A] relative self-center -mt-24 mx-4 overflow-hidden rounded-full transform-gpu">
                <div className="absolute top-1/2 -translate-y-1/2 w-full h-[1px] bg-white/5"></div>
                {isInView && (
                    <motion.div
                        animate={{ x: [-200, 400] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        className="w-1/3 h-full bg-gradient-to-r from-transparent via-brand to-transparent blur-[2px] will-change-transform transform-gpu opacity-70"
                    ></motion.div>
                )}
                {/* Particles */}
                {isInView && (
                    <motion.div
                        animate={{ left: ["0%", "100%"] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear", delay: 0.2 }}
                        className="absolute top-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full"
                    ></motion.div>
                )}
            </div>

            {/* Mobile Beam (Vertical) */}
            <div className="md:hidden w-[2px] h-20 bg-[#1A1A1A] relative mx-auto my-6 overflow-hidden rounded-full transform-gpu">
                {isInView && (
                    <motion.div
                        animate={{ y: [-50, 100] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        className="w-full h-1/2 bg-gradient-to-b from-transparent via-brand to-transparent blur-[2px] will-change-transform"
                    ></motion.div>
                )}
            </div>
        </div>
    );
};

export const Automation: React.FC = () => {
    return (
        <section className="py-24 md:py-32 bg-[#050505] relative overflow-hidden border-t border-white/5">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none opacity-50 will-change-transform"></div>
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#050505] to-transparent z-10"></div>
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#050505] to-transparent z-10"></div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">

                {/* Section Header */}
                <div className="text-center mb-16 md:mb-24">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/5 border border-brand/10 text-brand text-[10px] font-bold mb-4 uppercase tracking-widest"
                    >
                        <Zap className="w-3 h-3" />
                        Automation Engine
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-black text-white mb-6 leading-[1.4] md:leading-[1.5]"
                    >
                        كيف يعمل <span className="text-brand">النظام الآلي</span>؟
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed"
                    >
                        مبدأ "دخلها مرة وحدة، تخرج في كل بلاصة". <br className="hidden md:inline" />
                        نحي عليك تكسار الراس تاع التكرار وخلي السيستام يخدم في بلاصتك.
                    </motion.p>
                </div>

                {/* The Pipeline */}
                <div className="flex flex-col md:flex-row justify-between relative max-w-6xl mx-auto items-center">

                    <PipelineNode
                        step="01"
                        title="دخل السلعة (Input)"
                        desc="أدخل المنتج، السعر، والتصاور مرة واحدة برك في لوحة التحكم."
                        visual={<InputVisual />}
                    />

                    <DataBeam />

                    <div className="flex flex-col items-center gap-6 relative z-10 md:-mt-8">
                        <div className="relative transform hover:scale-110 transition-transform duration-500 cursor-pointer transform-gpu will-change-transform">
                            <CoreVisual />
                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                <h3 className="text-sm font-bold text-white mb-0.5 text-center">المحرك الذكي</h3>
                                <p className="text-[9px] text-brand font-mono text-center">SYNC PROCESSING...</p>
                            </div>
                        </div>
                    </div>

                    <DataBeam />

                    <PipelineNode
                        step="02"
                        title="تخرج وين تحب (Output)"
                        desc="تظهر فوراً في سيت الويب، تطبيق الكاشير، وعند شركات التوصيل."
                        visual={<OutputVisual />}
                    />

                </div>

                {/* Bottom Call to Action */}
                <div className="mt-24 text-center">
                    <button className="px-8 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white font-bold hover:bg-white/10 transition-all hover:scale-105 flex items-center gap-3 mx-auto shadow-2xl group">
                        <span>جرب الأتمتة بنفسك</span>
                        <ArrowLeft className="w-4 h-4 text-brand group-hover:-translate-x-1 transition-transform" />
                    </button>
                </div>

            </div>
        </section>
    );
}
