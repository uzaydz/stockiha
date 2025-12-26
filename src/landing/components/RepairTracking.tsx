import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ChevronRight, Hammer, QrCode, Smartphone } from 'lucide-react';

// --- VISUALS (UNCHANGED BUT RE-USED) ---

const VisualContainer = ({ children }: { children?: React.ReactNode }) => (
    <div className="w-full h-48 bg-[#0F0F0F] rounded-t-2xl border-b border-white/5 relative overflow-hidden flex items-center justify-center group-hover:bg-[#141414] transition-colors duration-500 transform-gpu">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent opacity-20 pointer-events-none"></div>
        {children}
    </div>
);

const PrinterVisual = () => (
    <VisualContainer>
        <div className="relative flex flex-col items-center pt-8">
            <div className="w-28 h-10 bg-gradient-to-b from-[#333] to-[#222] rounded-t-xl border-t border-x border-white/10 z-20 shadow-2xl relative flex justify-center">
                <div className="w-20 h-1.5 bg-[#000] rounded-full mt-3 shadow-inner"></div>
                <div className="absolute top-2 right-3 w-1 h-1 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]"></div>
            </div>

            <div className="w-20 bg-white p-2 pt-4 text-[4px] font-mono text-gray-800 shadow-xl relative z-10 -mt-2 origin-top animate-[print_4s_ease-in-out_infinite] backface-hidden transform-gpu will-change-transform">
                <div className="flex justify-center mb-1">
                    <QrCode className="w-8 h-8 text-black opacity-90" />
                </div>
                <div className="space-y-0.5 text-center mb-2">
                    <div className="font-bold text-[5px]">STOUKIHA REPAIR</div>
                    <div className="text-gray-500">TICKET #99201</div>
                </div>
                <div className="border-t border-dashed border-gray-300 pt-1 space-y-0.5">
                    <div className="flex justify-between font-bold"><span>TELEPHONE</span><span>iPhone 13</span></div>
                    <div className="flex justify-between"><span>MOCHKIL</span><span>Ecran</span></div>
                    <div className="flex justify-between"><span>PRIX</span><span>12,000 DA</span></div>
                </div>
                <div className="absolute bottom-[-3px] left-0 w-full h-1.5 bg-white" style={{ clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)' }}></div>
            </div>
        </div>
    </VisualContainer>
);

const ScannerVisual = () => (
    <VisualContainer>
        <div className="relative w-32 h-20 bg-[#F0F0F0] rounded-lg p-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center border border-gray-300 transform rotate-[-2deg] group-hover:rotate-0 transition-transform duration-500 transform-gpu will-change-transform">
            <div className="w-full h-full border-2 border-dashed border-gray-300 rounded bg-white p-2 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="h-6 w-full bg-black flex gap-0.5 justify-center px-1">
                    {[...Array(24)].map((_, i) => <div key={i} className="w-0.5 h-full bg-white" style={{ opacity: Math.random() > 0.5 ? 1 : 0 }}></div>)}
                </div>
                <div className="mt-1 text-[5px] font-mono text-gray-500">S/N: 882910293</div>
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-600 shadow-[0_0_15px_#dc2626] animate-[scan_2s_ease-in-out_infinite] transform-gpu"></div>
            </div>
        </div>
    </VisualContainer>
);

const MobileQueueVisual = () => (
    <VisualContainer>
        <div className="w-24 h-full bg-black rounded-t-[1.5rem] border-x border-t border-gray-800 relative overflow-hidden pt-3 px-2 shadow-2xl transform translate-y-4 transform-gpu will-change-transform">
            <div className="w-8 h-1 bg-[#222] rounded-full mx-auto mb-3"></div>
            <div className="w-full h-full bg-[#111] rounded-t-xl overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-20 bg-brand/10"></div>
                <div className="p-2 relative z-10 space-y-2">
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center">
                            <Hammer className="w-3 h-3 text-white" />
                        </div>
                        <div>
                            <div className="h-1 w-8 bg-white/20 rounded-full mb-0.5"></div>
                            <div className="h-1 w-5 bg-white/10 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </VisualContainer>
);

export const RepairTracking: React.FC = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { margin: "-100px" });

    return (
        <section ref={ref} className="py-24 bg-light-bg dark:bg-dark-bg overflow-hidden relative border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6">

                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

                    {/* Text Content */}
                    <div className="lg:w-1/2 relative z-10 order-1 lg:order-2">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/5 border border-brand/10 text-brand text-xs font-bold mb-6"
                        >
                            <Hammer className="w-4 h-4" />
                            نظام الورشات
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-4xl md:text-5xl font-bold text-light-text dark:text-white mb-6 leading-tight"
                        >
                            هل لديك ورشة صيانة؟ <br />
                            <span className="mt-4 inline-block text-brand">نظمنا لك كل شيء.</span>
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-gray-500 dark:text-gray-400 text-lg mb-8 leading-relaxed"
                        >
                            تهنى من الكرانيش والورق. سيستام احترافي يخرجلك تذاكر (Tickets) فيها QR، والزبون يتبع جهازه من الدار برسالة SMS كيوصل دوره ولا يكمل التصليح.
                        </motion.p>

                        <div className="space-y-5">
                            {[
                                { title: "تذاكر فيها QR Code", desc: "مد للكليون بون احترافي يقدر يسكانيه ويشوف حالة الهاتف تاعو." },
                                { title: "تحديث بـ Scan واحد", desc: "كي تبدا تخدم، اسكاني البون برك، السيستام يبدل الحالة لـ 'قيد الصيانة' وحدو." },
                                { title: "إشعارات SMS", desc: "غير تكمل، الكليون توصله ميساج: 'جهازك راه واجد، ارواح تديه'." }
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex gap-4 group cursor-default"
                                >
                                    <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0 mt-1 group-hover:bg-brand group-hover:text-white transition-colors">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-light-text dark:text-white mb-1 group-hover:text-brand transition-colors">{item.title}</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Visual Grid - Images on the Left */}
                    <div className="lg:w-1/2 w-full grid grid-cols-1 sm:grid-cols-2 gap-4 perspective-1000 order-2 lg:order-1">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden group hover:border-brand/30 transition-colors shadow-2xl"
                        >
                            <PrinterVisual />
                            <div className="p-5 text-center">
                                <h3 className="font-bold text-light-text dark:text-white mb-1">بون QR Code</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">احترافية من أول دقيقة</p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden group hover:border-brand/30 transition-colors shadow-2xl sm:translate-y-8"
                        >
                            <ScannerVisual />
                            <div className="p-5 text-center">
                                <h3 className="font-bold text-light-text dark:text-white mb-1">تحديث سريع</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">سكانيه باش تبدل Etat</p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden group hover:border-brand/30 transition-colors shadow-2xl sm:col-span-2 sm:w-2/3 sm:mx-auto"
                        >
                            <MobileQueueVisual />
                            <div className="p-5 text-center">
                                <h3 className="font-bold text-light-text dark:text-white mb-1">رابط تتبع مباشر</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">الزبون يتبع من دارو</p>
                            </div>
                        </motion.div>
                    </div>

                </div>
            </div>
        </section>
    );
};
