
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, MessageSquare, ArrowRight, CheckCircle2, User, Building, MessagesSquare } from 'lucide-react';

export const ContactPage = () => {
    const [formState, setFormState] = useState<'idle' | 'submitting' | 'success'>('idle');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormState('submitting');
        // Simulate sending
        setTimeout(() => setFormState('success'), 1500);
    };

    return (
        <div className="min-h-screen bg-[#050505] pt-32 pb-20 relative overflow-hidden font-sans">

            {/* Background Effects */}
            {/* Background Ambient Layers (Match Features Page) */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[250px] md:w-[500px] h-[250px] md:h-[500px] bg-brand/10 rounded-full blur-[80px] md:blur-[120px] mix-blend-screen opacity-40"></div>
                <div className="absolute bottom-0 right-1/4 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-blue-600/10 rounded-full blur-[80px] md:blur-[120px] mix-blend-screen opacity-30"></div>
                {/* Grain Texture */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">

                {/* Header */}
                <div className="text-center mb-20 space-y-4 md:space-y-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-md"
                    >
                        <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-brand animate-pulse"></span>
                        <span className="text-[9px] md:text-xs text-gray-300 font-mono tracking-wider">24/7 PREMIUM SUPPORT</span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.1 }}
                        className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-tight"
                    >
                        تواصل مع
                        <span className="inline-block text-transparent bg-clip-text bg-gradient-to-br from-brand via-orange-400 to-yellow-500 mx-2 md:mx-4">
                            فريق سطوكيها
                        </span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                        className="text-base md:text-2xl text-gray-400 font-light max-w-sm md:max-w-2xl mx-auto leading-relaxed px-2 md:px-0"
                    >
                        عندك سؤال؟ حاب تبدا مشروعك؟ ولا عندك اقتراح؟
                        <br className="hidden md:block" />
                        فريقنا واجد باش يعاونك في كل وقت.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">

                    {/* Left Column: Contact Info Cards (2 columns span) */}
                    <div className="lg:col-span-2 flex flex-col gap-6">

                        {/* Instant Support Card */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-[#0A0A0A] border border-white/10 p-8 rounded-[32px] relative overflow-hidden group hover:border-brand/30 transition-all duration-300"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Phone className="w-24 h-24 text-brand rotate-12" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">عيطلنا ديركت</h3>
                            <p className="text-gray-400 mb-8 text-sm">مستشارين جاهزين يجاوبوك من 9:00 لـ 18:00</p>

                            <div className="flex flex-col gap-3">
                                <a href="tel:+213555555555" className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group/btn">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-xs text-gray-500 font-bold">خدمة الزبائن</span>
                                            <span className="block text-white font-mono dir-ltr font-bold text-lg">0550 00 00 00</span>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-gray-500 group-hover/btn:text-white group-hover/btn:-translate-x-1 transition-all" />
                                </a>

                                <a href="mailto:contact@stoukiha.com" className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group/btn">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-xs text-gray-500 font-bold">البريد الإلكتروني</span>
                                            <span className="block text-white font-mono font-bold">contact@stoukiha.com</span>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-gray-500 group-hover/btn:text-white group-hover/btn:-translate-x-1 transition-all" />
                                </a>
                            </div>
                        </motion.div>

                        {/* Location Card */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-[#0A0A0A] border border-white/10 p-8 rounded-[32px] flex items-center gap-6 group hover:border-white/20 transition-colors"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-[#151515] flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                                <MapPin className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-lg mb-1">المقر الرئيسي</h4>
                                <p className="text-gray-400 text-sm">الجزائر العاصمة، بئر مراد رايس</p>
                            </div>
                        </motion.div>

                        {/* Social Proof */}
                        <div className="p-6 rounded-[24px] bg-gradient-to-br from-brand to-orange-600 text-white flex items-center justify-between shadow-lg shadow-brand/10">
                            <div>
                                <div className="text-3xl font-black mb-1">+5000</div>
                                <div className="text-sm font-medium opacity-90">تاجر يثق فينا</div>
                            </div>
                            <div className="flex -space-x-3 space-x-reverse">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-brand bg-gray-800 overflow-hidden">
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="user" />
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Right Column: The Genius Form (3 columns span) */}
                    <div className="lg:col-span-3">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-[#0F0F0F] border border-white/10 rounded-[40px] p-8 md:p-12 relative shadow-2xl"
                        >
                            {formState === 'success' ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 bg-[#0F0F0F] rounded-[40px] z-20"
                                >
                                    <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                                        <CheckCircle2 className="w-12 h-12 text-green-500" />
                                    </div>
                                    <h3 className="text-3xl font-bold text-white mb-4">وصلتنا رسالتك!</h3>
                                    <p className="text-gray-400 text-lg">يعطيك الصحة.. فريقنا راهو يقرأ فيها دوكا وراح نجاوبوك في أقرب وقت.</p>
                                    <button
                                        onClick={() => setFormState('idle')}
                                        className="mt-8 px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors"
                                    >
                                        بعث رسالة أخرى
                                    </button>
                                </motion.div>
                            ) : null}

                            <div className="mb-10">
                                <h3 className="text-2xl font-bold text-white mb-2">ابعثلنا رسالة</h3>
                                <p className="text-gray-500">عمر الاستمارة هذي، وحنا نتكفلو بالباقي.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-400 mr-1">الاسم الكامل</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                required
                                                className="w-full bg-[#1A1A1A] border border-white/5 rounded-2xl px-5 py-4 pl-12 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all placeholder:text-gray-600"
                                                placeholder="محمد الأمين"
                                            />
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-400 mr-1">رقم الهاتف</label>
                                        <div className="relative">
                                            <input
                                                type="tel"
                                                required
                                                className="w-full bg-[#1A1A1A] border border-white/5 rounded-2xl px-5 py-4 pl-12 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all placeholder:text-gray-600 dir-rtl"
                                                placeholder="05 XX XX XX XX"
                                            />
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-400 mr-1">نوع النشاط (اختياري)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="w-full bg-[#1A1A1A] border border-white/5 rounded-2xl px-5 py-4 pl-12 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all placeholder:text-gray-600"
                                            placeholder="سوبيرات، كوسميتيك، ملابس..."
                                        />
                                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-400 mr-1">الرسالة تاعك</label>
                                    <div className="relative">
                                        <textarea
                                            required
                                            rows={5}
                                            className="w-full bg-[#1A1A1A] border border-white/5 rounded-2xl px-5 py-4 pl-12 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all placeholder:text-gray-600 resize-none"
                                            placeholder="احكيلنا واش خصك ولا واش راك حاب تستفسر..."
                                        />
                                        <MessagesSquare className="absolute left-4 top-6 w-5 h-5 text-gray-600" />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={formState === 'submitting'}
                                    className="w-full bg-white text-black text-lg font-black py-4 rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group"
                                >
                                    {formState === 'submitting' ? (
                                        <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>أبعث الرسالة</span>
                                            <Send className="w-5 h-5 group-hover:-translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                </div>

            </div>
        </div>
    );
};
