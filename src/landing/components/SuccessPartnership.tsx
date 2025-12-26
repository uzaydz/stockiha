
import React from 'react';
import { motion } from 'framer-motion';
import { Heart, ShieldCheck, TrendingUp, Users, Zap, Infinity, Coffee, Handshake } from 'lucide-react';

export const SuccessPartnership: React.FC<{ onNavigate: (page: any) => void }> = ({ onNavigate }) => {
    return (
        <section className="relative py-32 bg-[#050505] overflow-hidden">

            {/* Background Ambience */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full mix-blend-screen opacity-20 pointer-events-none">
                <div className="absolute top-[20%] right-[10%] w-[600px] h-[600px] bg-brand/10 rounded-full blur-[80px] md:blur-[120px] animate-pulse will-change-transform"></div>
                <div className="absolute bottom-[10%] left-[10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[60px] md:blur-[100px] will-change-transform"></div>
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">

                {/* Header */}
                <div className="text-center mb-20">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight leading-tight"
                    >
                        ماشي غير لوجيسيال وخلاص.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand via-orange-300 to-brand">هذا شريكك الصحيح في النجاح.</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-xl text-gray-400 font-light max-w-2xl mx-auto"
                    >
                        في سطوكيها، ما نبيعولكش ونهربو. حنا رانا هنا باش نبنو معاك علاقة صحيحة وطويلة.
                        نعطولك الصح: القوة، الأمان، والربح.
                    </motion.p>
                </div>

                {/* The Genius Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(250px,auto)]">

                    {/* Card 1: Absolute Stability (Large Vertical) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="bg-[#0A0A0A] border border-white/5 rounded-[32px] p-8 md:p-10 relative overflow-hidden group hover:border-brand/20 transition-all duration-500 row-span-2 md:col-span-1 flex flex-col justify-between transform-gpu will-change-transform"
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-brand/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-[#151515] border border-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                <Zap className="w-7 h-7 text-white" />
                            </div>
                            <h3 className="text-3xl font-black text-white mb-4">الخدمة جامي تحبس</h3>
                            <p className="text-gray-400 leading-relaxed">
                                انسى مشاكل الكونيكسيون (Internet) وانقطاع النظام. سطوكيها مخدوم بتكنولوجيا <span className="text-white font-bold">Offline-First</span> الهربة.
                                يخدم 24/7 بلا أنترنت، وكي تجي الكونيكسيون يبعث كلش وحدو. تهنى من "الريزو طايح".
                            </p>
                        </div>
                        <div className="mt-8 relative h-32 w-full opacity-50 grayscale group-hover:grayscale-0 transition-all duration-700">
                            {/* Abstract Visualization of Stability */}
                            <div className="absolute bottom-0 left-0 right-0 h-px bg-white/20"></div>
                            <div className="absolute bottom-0 left-[20%] w-px h-[60%] bg-white/20"></div>
                            <div className="absolute bottom-0 left-[40%] w-px h-[80%] bg-brand/50 shadow-[0_0_15px_rgba(255,122,0,0.5)]"></div>
                            <div className="absolute bottom-0 left-[60%] w-px h-[100%] bg-white/20"></div>
                            <div className="absolute bottom-0 left-[80%] w-px h-[50%] bg-white/20"></div>
                        </div>
                    </motion.div>

                    {/* Card 2: Human Partnership (Horizontal) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="bg-[#0A0A0A] border border-white/5 rounded-[32px] p-8 md:col-span-2 relative overflow-hidden group hover:border-blue-500/20 transition-all duration-500 flex flex-col md:flex-row items-center gap-8 transform-gpu will-change-transform"
                    >
                        <div className="flex-1 relative z-10 text-center md:text-right">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-4">
                                <Handshake className="w-3 h-3" />
                                <span>دعم ولاد البلاد</span>
                            </div>
                            <h3 className="text-2xl font-black text-white mb-3">رانا هنا.. عباد ماشي روبوات</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                فريق دعم فني جزائري 100% يفهم لهجتك ومشاكل تجارتك. ما تهدرش مع آلة، تهدر مع ناس صحاح يعاونوك من التثبيت حتى تولي طير في البرنامج.
                            </p>
                        </div>
                        <div className="w-full md:w-1/3 flex justify-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse"></div>
                                <div className="relative bg-[#111] p-4 rounded-2xl border border-white/10 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Support" />
                                        </div>
                                        <div>
                                            <div className="h-2 w-20 bg-gray-600 rounded mb-1"></div>
                                            <div className="h-2 w-12 bg-gray-800 rounded"></div>
                                        </div>
                                    </div>
                                    <div className="mt-3 h-2 w-full bg-gray-800 rounded"></div>
                                    <div className="mt-2 h-2 w-3/4 bg-gray-800 rounded"></div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Card 3: Continuous Evolution (Square) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="bg-[#0A0A0A] border border-white/5 rounded-[32px] p-8 relative overflow-hidden group hover:border-green-500/20 transition-all duration-500 transform-gpu will-change-transform"
                    >
                        <div className="w-12 h-12 bg-[#151515] border border-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform">
                            <Infinity className="w-6 h-6 text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">ديما الجديد (Mise à jour)</h3>
                        <p className="text-gray-400 text-sm">
                            اللوجيسيال راهو يطور كل يوم. واش تخلص اليوم راهو استثمار، التحديثات والميزات الجديدة تجيك باطل.
                        </p>
                    </motion.div>

                    {/* Card 4: Peace of Mind (Square) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="bg-brand border border-brand rounded-[32px] p-8 relative overflow-hidden group hover:bg-brand-hover transition-colors flex flex-col items-center justify-center text-center cursor-pointer transform-gpu will-change-transform"
                    >
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                        <Coffee className="w-12 h-12 text-white mb-4 drop-shadow-lg" />
                        <h3 className="text-2xl font-black text-white mb-2">ريّح راسك وخدم</h3>
                        <p className="text-white/90 text-sm font-medium mb-6">
                            انت ركز كيفاش تدخل الدراهم، والباقي علينا.
                        </p>
                        <button
                            onClick={() => onNavigate('download')}
                            className="bg-white text-black px-6 py-2 rounded-xl text-sm font-bold shadow-lg hover:scale-105 transition-transform"
                        >
                            ابدأ التجربة درك
                        </button>
                    </motion.div>

                </div>

            </div>
        </section>
    );
};
