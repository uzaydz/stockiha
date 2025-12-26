import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ShieldCheck, Zap, Database, Smartphone, HelpCircle, Store, Users, ShoppingBag, Coffee, Utensils, User, CreditCard } from 'lucide-react';

// --- DATA ---
const FEATURES_LIST = [
    { label: "الدخول 'أوفلاين' (Offline)", key: 'offline' },
    { label: "متجر إلكتروني (Site Web)", key: 'webstore' },
    { label: "تطبيق بيع (App)", key: 'app' },
    { label: "نظام الورشات (Réparation)", key: 'repair' },
    { label: "الدعم الفني (Support)", key: 'support' },
];

const PRICING_DATA = [
    {
        id: 'starter',
        name: 'البداية',
        price: 2500,
        limits: { products: '600', staff: '1', pos: '1' },
        features: { offline: true, webstore: true, app: true, repair: true },
        dailyContext: { text: "حق 3 كيسان قهوة", sub: "≈ 80 دج/يوم", icon: Coffee }
    },
    {
        id: 'growth',
        name: 'النمو',
        price: 5000,
        popular: true,
        limits: { products: '1,500', staff: '3', pos: '2' },
        features: { offline: true, webstore: true, app: true, repair: true },
        dailyContext: { text: "نص حق ساندويتش", sub: "≈ 160 دج/يوم", icon: Utensils }
    },
    {
        id: 'pro',
        name: 'احترافي',
        price: 7500,
        limits: { products: '5,000', staff: '7', pos: '5' },
        features: { offline: true, webstore: true, app: true, repair: true },
        dailyContext: { text: "أرخص من ساندويتش", sub: "≈ 250 دج/يوم", icon: Utensils }
    },
    {
        id: 'scale',
        name: 'شركات',
        price: 12500,
        limits: { products: '∞', staff: '15', pos: '10' },
        features: { offline: true, webstore: true, app: true, repair: true },
        dailyContext: { text: "نص كلفة خدام بسيط", sub: "≈ 410 دج/يوم", icon: User }
    }
];

// --- COMPONENTS ---

const FeatureRow: React.FC<{ label: string; plans: typeof PRICING_DATA; featureKey: string }> = ({ label, plans, featureKey }) => (
    <div className="grid grid-cols-5 border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
        <div className="p-4 flex items-center text-sm text-gray-400 font-medium group-hover:text-white transition-colors">
            {label}
        </div>
        {plans.map((plan) => (
            <div key={plan.id} className={`p-4 flex items-center justify-center ${plan.popular ? 'bg-brand/5' : ''}`}>
                <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                    <Check className="w-3.5 h-3.5 text-green-500" />
                </div>
            </div>
        ))}
    </div>
);

const LimitRow: React.FC<{ label: string; plans: typeof PRICING_DATA; limitKey: 'products' | 'staff' | 'pos'; icon: any }> = ({ label, plans, limitKey, icon: Icon }) => (
    <div className="grid grid-cols-5 border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
        <div className="p-4 flex items-center gap-2 text-sm text-gray-400 font-medium group-hover:text-white transition-colors">
            <Icon className="w-4 h-4 text-gray-600 group-hover:text-brand transition-colors" /> {label}
        </div>
        {plans.map((plan) => (
            <div key={plan.id} className={`p-4 flex items-center justify-center font-bold text-white font-mono ${plan.popular ? 'bg-brand/5 text-brand' : ''}`}>
                {plan.limits[limitKey]}
            </div>
        ))}
    </div>
);

export const Pricing: React.FC<{ onNavigate: (page: any) => void }> = ({ onNavigate }) => {
    const [isAnnual, setIsAnnual] = useState(true);

    return (
        <section className="py-24 md:py-32 bg-[#050505] relative overflow-hidden">

            {/* Background Glow */}
            <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-[#111] to-transparent pointer-events-none will-change-transform"></div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">

                {/* Header */}
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-6xl font-black text-white mb-6"
                    >
                        أسعار واضحة، <span className="text-brand">بلا مفاجآت</span>.
                    </motion.h2>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        سطوكيها مصمم باش ينجحك، ماشي باش يستنزفك. <br className="hidden md:block" />
                        كل الخطط فيها كل الأدوات. خلص قيس واش تحتاج.
                    </p>
                </div>

                {/* Toggle - RTL Optimized (Monthly Right, Yearly Left) */}
                <div className="flex justify-center mb-12" dir="ltr">
                    <div className="bg-[#0F0F0F] p-1.5 rounded-2xl border border-white/5 flex relative shadow-2xl w-fit mx-auto">

                        {/* Yearly (Left Side in LTR) */}
                        <button
                            onClick={() => setIsAnnual(true)}
                            className={`px-8 py-3 rounded-xl text-sm font-bold transition-all z-10 flex items-center gap-2 relative ${isAnnual ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <span className={`bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-md font-mono shadow-lg transition-opacity duration-300 ${isAnnual ? 'opacity-100' : 'opacity-60 grayscale'}`}>
                                -17%
                            </span>
                            الدفع سنوياً
                        </button>

                        {/* Monthly (Right Side in LTR) */}
                        <button
                            onClick={() => setIsAnnual(false)}
                            className={`px-8 py-3 rounded-xl text-sm font-bold transition-all z-10 relative ${!isAnnual ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            الدفع شهرياً
                        </button>

                        {/* Animated Slider */}
                        <motion.div
                            className="absolute top-1.5 bottom-1.5 rounded-xl border border-white/10 shadow-[0_0_20px_rgba(255,122,0,0.15)] bg-[#1A1A1A] will-change-transform transform-gpu"
                            initial={false}
                            animate={{
                                left: isAnnual ? '6px' : '50%',
                                right: isAnnual ? '50%' : '6px',
                                width: 'calc(50% - 6px)',
                                backgroundColor: isAnnual ? '#1A1A1A' : '#1A1A1A' // Can change color based on selection if desired
                            }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        >
                            {/* Inner Highlight for depth */}
                            <div className={`w-full h-full rounded-xl opacity-10 transition-colors duration-300 ${isAnnual ? 'bg-green-500' : 'bg-brand'}`}></div>
                        </motion.div>
                    </div>
                </div>

                {/* --- DESKTOP TABLE VIEW --- */}
                <div className="hidden lg:block bg-[#0A0A0A] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                    {/* Table Header Plans */}
                    <div className="grid grid-cols-5 bg-[#111] divide-x divide-white/5 border-b border-white/5">
                        <div className="p-6 flex flex-col justify-end">
                            <span className="text-gray-500 font-bold text-sm">مقارنة الخطط</span>
                        </div>
                        {PRICING_DATA.map((plan) => {
                            const PlanIcon = plan.dailyContext.icon;
                            return (
                                <div key={plan.id} className={`p-8 text-center relative flex flex-col items-center ${plan.popular ? 'bg-brand/5' : ''}`}>
                                    {plan.popular && <div className="absolute top-0 inset-x-0 h-1 bg-brand shadow-[0_0_15px_#FF7A00]"></div>}
                                    <h3 className="text-xl font-black text-white mb-2">{plan.name}</h3>

                                    {/* Price */}
                                    <div className="flex justify-center items-baseline gap-1 mb-2">
                                        <span className="text-3xl font-black text-white">
                                            {(isAnnual ? plan.price * 10 : plan.price).toLocaleString()}
                                        </span>
                                        <span className="text-xs text-gray-500">دج</span>
                                    </div>

                                    {/* Daily Context Badge (Desktop) */}
                                    <div className="mb-6 flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                        <PlanIcon className="w-3 h-3 text-brand" />
                                        <div className="flex flex-col items-start leading-none">
                                            <span className="text-[10px] text-white font-bold">{plan.dailyContext.text}</span>
                                            <span className="text-[9px] text-gray-500">{plan.dailyContext.sub}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => onNavigate('download')}
                                        className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all mt-auto ${plan.popular
                                            ? 'bg-brand text-white hover:bg-brand-hover shadow-lg shadow-brand/20'
                                            : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                                            }`}>
                                        ابدأ الآن
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Limits Section */}
                    <div className="bg-[#161616] p-3 pl-6 text-xs text-gray-400 font-bold uppercase tracking-widest border-b border-white/5">
                        الحدود (Limits)
                    </div>
                    <LimitRow label="عدد المنتجات" plans={PRICING_DATA} limitKey="products" icon={Store} />
                    <LimitRow label="عدد المستخدمين (الخدامة)" plans={PRICING_DATA} limitKey="staff" icon={Users} />
                    <LimitRow label="نقاط البيع (Caisse)" plans={PRICING_DATA} limitKey="pos" icon={ShoppingBag} />

                    {/* Features Section */}
                    <div className="bg-[#161616] p-3 pl-6 text-xs text-brand font-bold uppercase tracking-widest border-b border-white/5 mt-0 flex justify-between items-center group cursor-help">
                        <span>المميزات (Features)</span>
                        <span className="text-[10px] normal-case opacity-70 group-hover:opacity-100 transition-opacity">✅ كاينة في كل الخطط</span>
                    </div>
                    {FEATURES_LIST.map((f, i) => (
                        <FeatureRow key={i} label={f.label} plans={PRICING_DATA} featureKey={f.key} />
                    ))}

                </div>

                {/* --- MOBILE CARD VIEW --- */}
                <div className="lg:hidden flex flex-col gap-6">
                    {PRICING_DATA.map((plan) => {
                        const PlanIcon = plan.dailyContext.icon;
                        return (
                            <div key={plan.id} className={`rounded-2xl border p-6 bg-[#0A0A0A] ${plan.popular ? 'border-brand/50 shadow-brand/10 shadow-2xl' : 'border-white/10'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-2xl font-black text-white">{plan.name}</h3>
                                    {plan.popular && <span className="bg-brand text-white text-[10px] font-bold px-2 py-1 rounded">الأكثر طلباً</span>}
                                </div>

                                <div className="flex items-end gap-1 mb-2">
                                    <span className="text-4xl font-black text-white">
                                        {(isAnnual ? plan.price * 10 : plan.price).toLocaleString()}
                                    </span>
                                    <span className="text-sm text-gray-500">دج</span>
                                    <span className="text-xs text-gray-600 mb-1.5 ml-1">/ {isAnnual ? 'سنوياً' : 'شهرياً'}</span>
                                </div>

                                {/* Daily Context Badge (Mobile) */}
                                <div className="mb-6 inline-flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg border border-white/5 w-full">
                                    <PlanIcon className="w-4 h-4 text-brand shrink-0" />
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-xs text-white font-bold">{plan.dailyContext.text}</span>
                                        <span className="text-[10px] text-gray-500 font-mono">{plan.dailyContext.sub}</span>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between py-2 border-b border-white/5">
                                        <span className="text-gray-400 text-sm">المنتجات (Produits)</span>
                                        <span className="text-white font-bold font-mono">{plan.limits.products}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-white/5">
                                        <span className="text-gray-400 text-sm">عدد الخدامة (Staff)</span>
                                        <span className="text-white font-bold font-mono">{plan.limits.staff}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-white/5">
                                        <span className="text-gray-400 text-sm">نقاط البيع (Caisse)</span>
                                        <span className="text-white font-bold font-mono">{plan.limits.pos}</span>
                                    </div>
                                    <div className="pt-2 flex items-center gap-2 text-brand text-sm font-bold justify-center">
                                        <Check className="w-4 h-4" />
                                        كل المميزات كاينة (Tout Inclus)
                                    </div>
                                </div>

                                <button
                                    onClick={() => onNavigate('download')}
                                    className={`w-full py-3 rounded-xl font-bold transition-all ${plan.popular
                                        ? 'bg-brand text-white hover:bg-brand-hover'
                                        : 'bg-white/10 text-white hover:bg-white/20'
                                        }`}>
                                    خير خطة {plan.name}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* FAQ Preview */}
                <div className="mt-20 text-center">
                    <p className="text-gray-500 mb-4">تحتاج معاونة باش تخير؟</p>
                    <div className="inline-flex gap-4">
                        <button
                            onClick={() => onNavigate('contact')}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-white text-sm hover:bg-white/10 transition-colors">
                            <HelpCircle className="w-4 h-4" /> تواصل مع المبيعات
                        </button>
                        <button
                            onClick={() => onNavigate('download')}
                            className="flex items-center gap-2 px-4 py-2 bg-brand/10 border border-brand/20 rounded-full text-brand text-sm hover:bg-brand/20 transition-colors">
                            <CreditCard className="w-4 h-4" /> طرق الدفع
                        </button>
                    </div>
                </div>

            </div>
        </section>
    );
};
