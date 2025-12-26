import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
    ShoppingBag,
    RefreshCw,
    Smartphone,
    Globe,
    CreditCard,
    Box,
    Check,
    Zap,
    Cloud,
    Store,
    ArrowLeftRight,
    Search,
    User,
    Menu,
    X,
    ShoppingCart,
    Heart,
    Star,
    Laptop,
    Monitor,
    MousePointer2,
    Database,
    ShieldCheck,
    ArrowLeft
} from 'lucide-react';

// --- VISUAL: DETAILED STORE MOCKUP ---
const MobileStoreMockup = () => (
    <div className="relative mx-auto w-full max-w-[320px] h-[640px] bg-[#000] rounded-[3rem] border-8 border-[#1A1A1A] ring-1 ring-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
        {/* Dynamic Island */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-50"></div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar bg-white text-black relative">

            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <Menu className="w-5 h-5 text-gray-800" />
                <span className="font-black text-lg">SHOE<span className="text-brand">STORE</span></span>
                <div className="relative">
                    <ShoppingBag className="w-5 h-5 text-gray-800" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand rounded-full text-[8px] font-bold text-white flex items-center justify-center">1</div>
                </div>
            </div>

            {/* Banner */}
            <div className="mx-4 mt-4 h-40 bg-black rounded-2xl relative overflow-hidden flex items-center p-6">
                <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-brand to-transparent opacity-50"></div>
                <div className="relative z-10 text-white">
                    <h3 className="text-2xl font-black italic leading-none mb-2">JUST<br />DROPPED</h3>
                    <button className="px-3 py-1 bg-white text-black text-xs font-bold rounded-full">Shop Now</button>
                </div>
            </div>

            {/* Categories */}
            <div className="flex gap-2 px-4 mt-6 overflow-x-auto no-scrollbar">
                {['All', 'Nike', 'Adidas', 'Puma', 'New Balance'].map((cat, i) => (
                    <button key={i} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${i === 0 ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {cat}
                    </button>
                ))}
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 gap-4 p-4">
                {[
                    { name: "Air Jordan 1", price: "24,500", img: "bg-red-500/10" },
                    { name: "Yeezy Boost", price: "32,000", img: "bg-gray-500/10" },
                    { name: "Air Max 90", price: "18,900", img: "bg-blue-500/10" },
                    { name: "Dunk Low", price: "15,400", img: "bg-green-500/10" },
                ].map((item, i) => (
                    <div key={i} className="flex flex-col gap-2">
                        <div className={`aspect-square rounded-xl ${item.img} relativegroup cursor-pointer`}>
                            <div className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-sm">
                                <Heart className="w-3 h-3 text-gray-400" />
                            </div>
                        </div>
                        <div>
                            <div className="font-bold text-sm">{item.name}</div>
                            <div className="text-brand font-bold text-xs">{item.price} DA</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Home Indicator */}
        <div className="h-1 w-1/3 bg-black/20 rounded-full mx-auto mb-2 mt-auto"></div>
    </div>
);


// --- VISUAL: REAL-TIME ARCHITECTURE DIAGRAM ---
const SyncArchitecture = () => {
    const ref = React.useRef(null);
    const isInView = useInView(ref, { margin: "-50px" });

    return (
        <div ref={ref} className="relative w-full aspect-video md:h-[500px] bg-[#0A0A0A] rounded-3xl border border-white/5 overflow-hidden flex items-center justify-center p-8">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

            <div className="flex items-center gap-8 md:gap-24 relative z-10 w-full max-w-4xl justify-center">

                {/* NODE 1: DESKTOP POS */}
                <div className="flex flex-col items-center gap-4 group">
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-[#111] rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center relative overflow-hidden group-hover:border-brand/40 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                        <Monitor className="w-10 h-10 md:w-12 md:h-12 text-gray-400 group-hover:text-white transition-colors" />

                        {/* Status Dot */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-[8px] text-gray-500 font-mono hidden md:block">ONLINE</span>
                        </div>

                        {/* Inventory Count */}
                        <div className="absolute bottom-0 inset-x-0 bg-[#1A1A1A] py-1.5 border-t border-white/5 flex flex-col items-center">
                            <span className="text-[8px] text-gray-500 uppercase tracking-widest">Stock Local</span>
                            <span className="text-sm font-mono font-bold text-white">49</span>
                        </div>
                    </div>
                    <div className="text-center">
                        <h3 className="text-white font-bold text-sm tracking-wide">نقطة البيع</h3>
                        <p className="text-xs text-gray-500">Magasin</p>
                    </div>
                </div>

                {/* CENTRAL SYNC ENGINE */}
                <div className="relative flex flex-col items-center justify-center gap-2">
                    {/* Glowing Core */}
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#111] border border-brand/30 flex items-center justify-center shadow-[0_0_30px_rgba(255,122,0,0.1)] relative z-10">
                        <Database className="w-6 h-6 text-brand" />
                        {/* Orbiting Particles - Only animate if in view (CSS animation, ideally toggle class, but simpler to rely on browser optimization for CSS. For JS motion below, we use conditional rendering) */}
                        <div className="absolute inset-0 animate-spin-slow border border-dashed border-white/10 rounded-full"></div>
                        <div className="absolute -inset-2 animate-spin-reverse border border-dashed border-white/5 rounded-full opacity-50"></div>
                    </div>

                    {/* Data Flow Lines */}
                    <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/5 -z-10 -translate-y-1/2"></div>

                    {/* Animated Packets Left -> Right */}
                    {isInView && (
                        <motion.div
                            animate={{ x: [-80, 80], opacity: [0, 1, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute top-1/2 left-1/2 w-4 h-[2px] bg-brand rounded-full -translate-y-1/2 shadow-[0_0_10px_#FF7A00]"
                        ></motion.div>
                    )}

                    {/* Animated Packets Right -> Left */}
                    {isInView && (
                        <motion.div
                            animate={{ x: [80, -80], opacity: [0, 1, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 1 }}
                            className="absolute top-1/2 left-1/2 w-4 h-[2px] bg-blue-500 rounded-full -translate-y-1/2 shadow-[0_0_10px_#3B82F6]"
                        ></motion.div>
                    )}

                    <span className="text-[10px] text-brand font-mono uppercase tracking-widest bg-[#0A0A0A] px-2 py-1 rounded relative z-10 border border-brand/10">Sync Engine</span>
                </div>

                {/* NODE 2: CLOUD STORE */}
                <div className="flex flex-col items-center gap-4 group">
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-[#111] rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center relative overflow-hidden group-hover:border-blue-500/40 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                        <Cloud className="w-10 h-10 md:w-12 md:h-12 text-gray-400 group-hover:text-white transition-colors" />

                        {/* Status Dot */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            <span className="text-[8px] text-gray-500 font-mono hidden md:block">LIVE</span>
                        </div>

                        {/* Inventory Count */}
                        <div className="absolute bottom-0 inset-x-0 bg-[#1A1A1A] py-1.5 border-t border-white/5 flex flex-col items-center">
                            <span className="text-[8px] text-gray-500 uppercase tracking-widest">Stock Cloud</span>
                            <span className="text-sm font-mono font-bold text-white">49</span>
                        </div>
                    </div>
                    <div className="text-center">
                        <h3 className="text-white font-bold text-sm tracking-wide">المتجر الإلكتروني</h3>
                        <p className="text-xs text-gray-500">E-Commerce</p>
                    </div>
                </div>

            </div>
        </div>
    );
}

const FeatureCard = ({ icon: Icon, title, desc, color }: { icon: any, title: string, desc: string, color: string }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="bg-[#111] border border-white/5 p-8 rounded-3xl hover:border-brand/20 transition-all group relative overflow-hidden"
    >
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-${color.split('-')[1]}/10 to-transparent blur-2xl rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity`}></div>

        <div className={`w-14 h-14 bg-[#1A1A1A] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-white/5 ${color}`}>
            <Icon className="w-7 h-7" />
        </div>

        <h3 className="text-white font-bold text-xl mb-3 group-hover:text-brand transition-colors">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </motion.div>
);

// --- FLOATING UI CARDS (Adapted for Ecommerce) ---
const NewOrderFloatingCard = () => (
    <div className="bg-[#111]/90 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.6)] flex items-center gap-3 w-60">
        <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-brand" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#111]"></div>
        </div>
        <div>
            <div className="text-white font-bold text-xs flex justify-between w-full gap-8">
                <span>طلب جديد #9921</span>
                <span className="text-[9px] text-gray-500 font-normal">الآن</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">تم بيع: Nike Air Jordan 1</div>
        </div>
    </div>
);

const VisitorFloatingCard = () => (
    <div className="bg-[#0A0A0F]/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.6)] w-48 flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
            <div className="relative w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                <Globe className="w-4 h-4 text-green-500" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
            </div>
            <div>
                <div className="text-[10px] text-gray-400">زوار المتجر</div>
                <div className="text-white font-bold text-sm">142 زائر</div>
            </div>
        </div>
        {/* Tiny Graph */}
        <div className="h-6 flex items-end gap-1 px-1">
            {[4, 7, 5, 9, 6, 8, 10, 8, 12, 10].map((h, i) => (
                <div key={i} className="flex-1 bg-green-500/20 rounded-t-sm" style={{ height: `${h * 8}%` }}></div>
            ))}
        </div>
    </div>
);

// --- MAIN COMPONENT ---
export const EcommercePage: React.FC = () => {
    return (
        <section className="relative min-h-screen pt-32 pb-20 overflow-hidden bg-[#050505]">
            {/* Background Effects (Exact Match with Hero.tsx) */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-brand/5 rounded-full blur-[120px] mix-blend-screen opacity-60"></div>
                <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-900/5 rounded-full blur-[150px]"></div>
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">

                <div className="flex flex-col items-center text-center">

                    {/* Badge (Exact Match) */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#111] border border-white/10 mb-8 shadow-xl backdrop-blur-md hover:border-brand/30 transition-colors cursor-default"
                    >
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
                        </span>
                        <span className="text-xs font-bold text-gray-300 tracking-wide uppercase">
                            نظام المتجر الإلكتروني الموحد
                        </span>
                    </motion.div>

                    {/* Headline */}
                    <motion.h1
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight max-w-4xl mx-auto"
                    >
                        أنشئ متجرك الإلكتروني <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-orange-400">مربوط مع الكاشير (POS).</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-base md:text-xl text-gray-400 font-normal leading-relaxed max-w-2xl mx-auto mb-10"
                    >
                        سطوكيها يجمعلك الحانوت (POS) والسيت ويب (E-commerce) في منصة وحدة. <br className="hidden md:block" />
                        تبيع هنا، ينقص لهيه. تحكم شامل من بلاصة وحدة.
                    </motion.p>

                    {/* Buttons (Exact Match) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 w-full"
                    >
                        <button className="h-14 px-8 rounded-full bg-brand text-white text-lg font-bold transition-all hover:bg-brand-hover shadow-[0_0_40px_rgba(255,122,0,0.2)] hover:shadow-[0_0_60px_rgba(255,122,0,0.4)] hover:scale-105 w-full sm:w-auto flex items-center justify-center gap-2">
                            ابدأ التجربة المجانية
                        </button>
                        <button className="h-14 px-8 rounded-full bg-[#1A1A1A] border border-white/10 text-white font-medium hover:bg-white/5 hover:border-white/20 transition-all w-full sm:w-auto flex items-center justify-center gap-2">
                            <Laptop className="w-5 h-5 text-gray-400" />
                            شوف الديمو
                        </button>
                    </motion.div>

                    {/* 3D COMPOSITION (Direct Port from Hero.tsx logic) */}
                    <div className="relative w-full max-w-7xl mx-auto mt-8 perspective-2000 px-4 md:px-0" style={{ perspective: '2000px' }}>

                        <motion.div
                            initial={{ y: 50, rotateX: 10, opacity: 0 }}
                            animate={{ y: 0, rotateX: 0, opacity: 1 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="relative z-10 group"
                            style={{ transformStyle: 'preserve-3d' }}
                        >
                            {/* 1. Main Dashboard/Store Interface */}
                            <div className="relative bg-[#0F0F0F] rounded-2xl border border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden w-full md:w-[85%] mx-auto aspect-[16/9] flex flex-col md:flex-row">
                                {/* Simulated E-commerce Dashboard UI */}
                                <div className="hidden md:flex w-64 bg-[#111] border-l border-white/5 flex-col p-4 gap-4">
                                    <div className="h-8 w-32 bg-white/5 rounded"></div>
                                    <div className="h-4 w-20 bg-white/5 rounded opacity-50"></div>
                                    <div className="mt-8 space-y-3">
                                        {[1, 2, 3, 4].map(i => <div key={i} className="h-8 w-full bg-white/5 rounded-lg"></div>)}
                                    </div>
                                </div>
                                <div className="flex-1 bg-[#0A0A0A] relative p-6">
                                    {/* Header */}
                                    <div className="flex justify-between items-center mb-8">
                                        <div className="h-8 w-48 bg-white/10 rounded"></div>
                                        <div className="flex gap-2">
                                            <div className="h-8 w-8 bg-brand rounded"></div>
                                            <div className="h-8 w-8 bg-white/10 rounded"></div>
                                        </div>
                                    </div>
                                    {/* Charts Grid */}
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-[#161616] rounded-xl border border-white/5"></div>)}
                                    </div>
                                    <div className="h-48 bg-[#161616] rounded-xl border border-white/5 w-full"></div>

                                    {/* Overlay Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-brand/5 to-transparent pointer-events-none"></div>
                                </div>
                            </div>

                            {/* 2. Floating Elements */}

                            {/* Left: New Order Notification */}
                            <motion.div
                                initial={{ x: -50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.8, duration: 0.8 }}
                                className="absolute -left-4 top-1/4 z-20 block scale-[0.8] md:scale-100"
                                style={{ transform: 'translateZ(60px)' }}
                            >
                                <NewOrderFloatingCard />
                                {/* Connecting Line */}
                                <div className="hidden md:block absolute top-1/2 -right-12 w-12 h-[1px] bg-gradient-to-l from-transparent to-brand/30"></div>
                            </motion.div>

                            {/* Right: Live Visitors */}
                            <motion.div
                                initial={{ x: 50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 1.0, duration: 0.8 }}
                                className="absolute -right-4 bottom-1/3 z-20 block scale-[0.8] md:scale-100"
                                style={{ transform: 'translateZ(80px)' }}
                            >
                                <VisitorFloatingCard />
                                {/* Connecting Line */}
                                <div className="hidden md:block absolute top-1/2 -left-12 w-12 h-[1px] bg-gradient-to-r from-transparent to-green-500/30"></div>
                            </motion.div>

                        </motion.div>

                        {/* Glow effect under the whole assembly */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[50%] bg-brand/10 blur-[150px] rounded-full pointer-events-none z-0"></div>
                    </div>

                </div>

                {/* 3. SYNC ARCHITECTURE */}
                <div className="my-40">
                    <div className="text-center mb-16">
                        <span className="text-brand font-bold text-sm tracking-widest uppercase mb-2 block">كيفاش تمشي الحالة؟</span>
                        <h2 className="text-3xl md:text-5xl font-black text-white">تزامن لحظي للمخزون والمبيعات</h2>
                    </div>
                    <SyncArchitecture />
                </div>

                {/* 4. KEY FEATURES GRID */}
                <div className="mb-32">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FeatureCard
                            icon={RefreshCw}
                            title="تزامن المخزون"
                            desc="بيع حبة في المحل، تنقص أوتوماتيك من السيت. ما تزيدش تحشم مع الزبائن كي خلاص الستوك."
                            color="text-brand"
                        />
                        <FeatureCard
                            icon={User}
                            title="قاعدة بيانات موحدة"
                            desc="نفس الزبون، نفس المعلومات. عرف شحال شرى عليك من السيت وشحال من المحل."
                            color="text-blue-500"
                        />
                        <FeatureCard
                            icon={ArrowLeftRight}
                            title="إدارة الطلبيات"
                            desc="الكوموند تجيك في السيستم ديركت. فاليدي، طبع البون، وبعث لليفرايزون بضغطة زر."
                            color="text-green-500"
                        />
                        <FeatureCard
                            icon={CreditCard}
                            title="الدفع الإلكتروني"
                            desc="ندعم الدفع عند الاستلام (COD) وقريباً الدفع بالبطاقة الذهبية و CIB."
                            color="text-yellow-500"
                        />
                        <FeatureCard
                            icon={Zap}
                            title="سرعة خيالية"
                            desc="استضافة (Hosting) قوية وسريعة جداً. السيت يطير، والزبون ما يقارعش."
                            color="text-purple-500"
                        />
                        <FeatureCard
                            icon={ShieldCheck}
                            title="حماية وأمان"
                            desc="شهادة SSL مجانية وحماية ضد الهجمات. بياناتك وبيانات زبائنك في أمان."
                            color="text-red-500"
                        />
                    </div>
                </div>

                {/* 5. FINAL CTA (Styled exactly like others) */}
                <div className="bg-[#111] border border-white/5 rounded-3xl p-12 md:p-24 text-center relative overflow-hidden group mb-20">
                    <div className="absolute inset-0 bg-brand/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div className="relative z-10">
                        <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">
                            واش راك تستنى؟
                        </h2>
                        <p className="text-gray-400 text-xl mb-12 max-w-2xl mx-auto">
                            انضم لمئات التجار الأذكياء لي خيروا سطوكيها باش يسيروا حوانيتهم ومتاجرهم الإلكترونية.
                        </p>
                        <button className="px-12 py-5 bg-white text-black text-lg font-bold rounded-2xl hover:scale-105 transition-transform shadow-[0_0_50px_rgba(255,255,255,0.2)]">
                            احصل على متجرك الآن
                        </button>
                    </div>
                </div>

            </div>
        </section>
    );
};
