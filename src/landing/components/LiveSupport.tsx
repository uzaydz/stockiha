import React, { useRef } from 'react';
import { Users, ArrowUp, MessageCircle, Mic, Calendar, Play, CheckCircle2, ThumbsUp, Send } from 'lucide-react';
import { motion, useInView } from 'framer-motion';

// --- VISUALS ---

const VisualContainer = ({ children }: { children?: React.ReactNode }) => (
    <div className="w-full h-48 bg-[#0F0F0F] relative overflow-hidden flex items-center justify-center border-b border-white/5 group-hover:bg-[#111] transition-colors duration-500">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent opacity-20 pointer-events-none"></div>
        {children}
    </div>
);

const LiveSessionVisual = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { margin: "-20px" });

    return (
        <div ref={ref} className="w-[280px] bg-[#1A1A1A] rounded-xl border border-white/5 overflow-hidden shadow-2xl relative group-hover:scale-105 transition-transform duration-500">
            {/* Meet Header */}
            <div className="h-8 bg-[#111] border-b border-white/5 flex items-center justify-between px-3">
                <div className="flex items-center gap-2">
                    {isInView && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                    <span className="text-[8px] text-white font-bold">LIVE: أسرار التسعير</span>
                </div>
                <div className="px-1.5 py-0.5 bg-white/10 rounded text-[7px] text-gray-400">124 watching</div>
            </div>

            {/* Video Grid */}
            <div className="grid grid-cols-2 p-1 gap-1 h-28 bg-[#000]">
                <div className="bg-[#181818] rounded relative overflow-hidden flex items-center justify-center">
                    <div className="absolute bottom-1 left-1 bg-black/50 px-1 rounded text-[6px] text-white">المدرب يسين</div>
                    <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white"><Mic className="w-4 h-4" /></div>
                </div>
                <div className="bg-[#181818] rounded relative overflow-hidden flex items-center justify-center">
                    <div className="absolute bottom-1 left-1 bg-black/50 px-1 rounded text-[6px] text-white">تجار سطوكيها</div>
                    <div className="grid grid-cols-3 gap-0.5 opacity-50">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => <div key={i} className="w-4 h-4 bg-gray-600 rounded-sm"></div>)}
                    </div>
                </div>
            </div>

            {/* Chat Overlay */}
            <div className="absolute bottom-2 left-2 right-2 h-8 bg-[#1A1A1A]/90 backdrop-blur-sm border border-white/10 rounded px-2 flex flex-col justify-center gap-1 shadow-lg">
                {isInView && (
                    <div className="flex gap-1 items-center animate-pulse">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <div className="h-1 w-20 bg-gray-500 rounded"></div>
                    </div>
                )}
                <div className="flex gap-1 items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <div className="h-1 w-16 bg-gray-500 rounded"></div>
                </div>
            </div>
        </div>
    );
};

const FeatureRequestVisual = () => (
    <div className="w-[240px] bg-[#161616] rounded-xl border border-white/5 p-3 relative shadow-2xl flex flex-col gap-2 group-hover:-translate-y-1 transition-transform">
        {/* Header */}
        <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] text-gray-400 font-bold uppercase">Feedback Board</span>
            <div className="text-[8px] text-brand bg-brand/10 px-1.5 py-0.5 rounded border border-brand/20">Roadmap</div>
        </div>

        {/* Request Item (Voted) */}
        <div className="bg-[#222] rounded border border-brand/30 p-2 relative overflow-hidden">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-1 mb-1">
                        <h4 className="text-[9px] font-bold text-white">Dark Mode Mobile</h4>
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                    </div>
                    <p className="text-[7px] text-gray-500">ديرولنا مود نوي في التيليفون تعيشو...</p>
                </div>
                <div className="flex flex-col items-center bg-brand text-white rounded px-1.5 py-1 min-w-[24px]">
                    <ArrowUp className="w-3 h-3" />
                    <span className="text-[8px] font-bold">428</span>
                </div>
            </div>
            {/* Progress */}
            <div className="mt-2 h-0.5 w-full bg-gray-700 rounded-full">
                <div className="h-full w-3/4 bg-brand rounded-full"></div>
            </div>
        </div>

        {/* Request Item (Normal) */}
        <div className="bg-[#1A1A1A] rounded border border-white/5 p-2 opacity-60">
            <div className="flex justify-between items-center">
                <h4 className="text-[9px] font-bold text-gray-400">Yalidine API V2</h4>
                <div className="bg-[#222] border border-white/10 w-6 h-6 rounded flex items-center justify-center text-[8px] text-gray-500">12</div>
            </div>
        </div>
    </div>
);

const SupportChatVisual = () => (
    <div className="w-[220px] bg-[#0F0F0F] rounded-[1.5rem] border border-[#333] p-1 relative shadow-2xl group-hover:rotate-1 transition-transform">
        <div className="bg-[#111] rounded-[1.2rem] h-full overflow-hidden flex flex-col relative w-full aspect-[9/14] border border-white/5">
            {/* Header */}
            <div className="h-10 bg-[#1A1A1A] border-b border-white/5 flex items-center px-3 gap-2">
                <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-white text-[8px] font-bold">S</div>
                <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-white">دعم سطوكيها</span>
                    <span className="text-[6px] text-green-500">En ligne</span>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-3 flex flex-col gap-2 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-50">
                {/* User */}
                <div className="self-end bg-brand text-white p-2 rounded-2xl rounded-tr-none max-w-[85%] text-[8px] leading-relaxed shadow-lg">
                    خويا، كيفاش نقدر نبدل سعر التوصيل لولاية وهران؟
                </div>
                {/* Support */}
                <div className="self-start bg-[#222] text-gray-200 border border-white/10 p-2 rounded-2xl rounded-tl-none max-w-[85%] text-[8px] leading-relaxed shadow-lg">
                    سهلة بزاف! أدخل للإعدادات ⚙️ {'>'} التوصيل {'>'} خير "وهران" وبدل السعر.
                    <br />
                    راني بعثتلك فيديو قصير يشرحلك 👇
                </div>
                {/* Video Attachment */}
                <div className="self-start w-32 h-16 bg-[#000] rounded-lg border border-white/10 flex items-center justify-center relative group/vid cursor-pointer">
                    <Play className="w-4 h-4 text-white fill-current opacity-70" />
                </div>
            </div>

            {/* Input Area */}
            <div className="h-8 bg-[#1A1A1A] border-t border-white/5 mx-1 mb-1 rounded-full flex items-center px-2 justify-between">
                <div className="h-1 w-16 bg-white/10 rounded-full"></div>
                <div className="w-5 h-5 bg-brand rounded-full flex items-center justify-center">
                    <Send className="w-2.5 h-2.5 text-white ml-0.5" />
                </div>
            </div>
        </div>
    </div>
);

// --- MAIN COMPONENT ---

const FeatureCard = ({
    title,
    description,
    visual
}: {
    title: string,
    description: string,
    visual: React.ReactNode
}) => (
    <motion.div
        variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
        }}
        className="group relative bg-[#0A0A0A] rounded-2xl border border-white/5 overflow-hidden hover:border-brand/30 transition-all duration-300 flex flex-col"
    >
        {visual}
        <div className="p-6 bg-[#141414] border-t border-white/5 flex-1 relative z-10">
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-brand transition-colors">
                {title}
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed font-light">
                {description}
            </p>
        </div>
        {/* Hover Glow */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-brand/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </motion.div>
);

export const LiveSupport: React.FC = () => {
    return (
        <section className="py-24 bg-[#050505]">
            <div className="max-w-7xl mx-auto px-6">

                <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-16">
                    <div className="max-w-3xl">
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/5 border border-brand/10 text-brand text-[10px] font-bold mb-4 uppercase tracking-widest"
                        >
                            <Users className="w-3 h-3" />
                            مجتمع التجار (Community)
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-3xl md:text-5xl font-bold text-white mb-4 leading-[1.4] md:leading-[1.5]"
                        >
                            ماناش مجرد "برنامج"، <br />
                            <span className="inline-block mt-2 text-brand">حنا شريكك في النجاح.</span>
                        </motion.h2>
                        <p className="text-gray-400 text-lg max-w-2xl leading-relaxed">
                            كي تشري سطوكيها، راك تدخل لعائلة فيها آلاف التجار الجزائريين. <br className="hidden md:inline" />
                            نسمعوا لمشاكلك، نجاوبوك في دقيقة، ونطوروا السيستام على حساب واش تحتاج أنت.
                        </p>
                    </div>
                </div>

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: { staggerChildren: 0.15 }
                        }
                    }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                    <FeatureCard
                        title="لايف كل سمانة (Weekly Live)"
                        description="كل أسبوع نتلاقاو أونلاين. نجاوبو على أسئلتكم، نعطوكم نصائح في التجارة، ونشرحو التحديثات الجديدة مباشر."
                        visual={<VisualContainer><LiveSessionVisual /></VisualContainer>}
                    />
                    <FeatureCard
                        title="أنت تأمر، وحنا نخدمو (Roadmap)"
                        description="عندك فكرة؟ خاصك ميزة جديدة؟ حطها في منصة الاقتراحات. إذا صوتوا عليها التجار، نخدموها في التحديث الجاي."
                        visual={<VisualContainer><FeatureRequestVisual /></VisualContainer>}
                    />
                    <FeatureCard
                        title="دعم فني يفهم عقليتك"
                        description="ماشي روبوت يجاوبك. فريق جزائري 100% يريقلّك المشكل تاعك سير بلاس (عبر الهاتف، واتساب، أو الماسنجر)."
                        visual={<VisualContainer><SupportChatVisual /></VisualContainer>}
                    />
                </motion.div>

            </div>
        </section>
    );
};