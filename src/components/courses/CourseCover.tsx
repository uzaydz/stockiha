import React from 'react';
import { cn } from '@/lib/utils';
import {
    Cpu, TrendingUp, Zap, ShoppingBag, Globe,
    Briefcase, BarChart, Smartphone, Target,
    Package, Users, Layers
} from 'lucide-react';

interface CourseCoverProps {
    slug: string;
    className?: string;
}

const CourseCover: React.FC<CourseCoverProps> = ({ slug, className }) => {

    // Helper for subtle grid backgrounds
    const GridPattern = () => (
        <div className="absolute inset-0 opacity-[0.07]"
            style={{
                backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                backgroundSize: '24px 24px'
            }}
        />
    );

    const renderArt = () => {
        switch (slug) {
            case 'system-training': // "شرح النظام"
                return (
                    <div className="relative w-full h-full bg-slate-900 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/40 to-slate-900" />
                        <GridPattern />

                        {/* Visual: Dashboard Interface Abstract */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-3/4 bg-slate-800/50 rounded-lg border border-slate-700/50 backdrop-blur-sm p-4 flex flex-col gap-3 shadow-2xl transform rotate-[-5deg] group-hover:rotate-0 transition-transform duration-500">
                            {/* Mock Header */}
                            <div className="w-full h-4 bg-slate-700/50 rounded-full flex items-center px-2 gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                                <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                                <div className="w-2 h-2 rounded-full bg-green-500/50" />
                            </div>
                            {/* Mock Content */}
                            <div className="flex gap-3 h-full">
                                <div className="w-1/4 h-full bg-slate-700/30 rounded-md" />
                                <div className="w-3/4 h-full flex flex-col gap-2">
                                    <div className="w-full h-1/3 bg-orange-500/10 rounded-md border border-orange-500/20 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-orange-500/10 animate-pulse" />
                                    </div>
                                    <div className="w-full h-2/3 bg-slate-700/30 rounded-md" />
                                </div>
                            </div>
                        </div>

                        {/* Icon Badge */}
                        <div className="absolute bottom-4 right-4 w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 z-10">
                            <Cpu className="text-white w-7 h-7" />
                        </div>
                    </div>
                );

            case 'digital-marketing': // "التسويق الرقمي"
                return (
                    <div className="relative w-full h-full bg-[#0B1120] overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-bl from-blue-600/20 to-transparent" />
                        <GridPattern />

                        {/* Visual: Growing Chart & Reach */}
                        <div className="absolute bottom-0 left-0 right-0 h-3/4 flex items-end justify-center px-12 pb-12 gap-3 opacity-80">
                            <div className="w-1/4 h-[40%] bg-blue-500/20 rounded-t-lg backdrop-blur-sm border-t border-x border-blue-500/30 group-hover:h-[45%] transition-all duration-500" />
                            <div className="w-1/4 h-[60%] bg-blue-500/40 rounded-t-lg backdrop-blur-sm border-t border-x border-blue-500/30 group-hover:h-[65%] transition-all duration-500 delay-75" />
                            <div className="w-1/4 h-[85%] bg-blue-500/60 rounded-t-lg backdrop-blur-sm border-t border-x border-blue-500/30 group-hover:h-[90%] transition-all duration-500 delay-150 relative overflow-hidden">
                                <div className="absolute top-0 inset-x-0 h-full bg-gradient-to-b from-white/10 to-transparent" />
                            </div>
                        </div>

                        {/* Target Icon */}
                        <div className="absolute top-6 right-6">
                            <div className="relative">
                                <Target className="w-16 h-16 text-blue-400 opacity-20" />
                                <TrendingUp className="absolute bottom-0 -left-2 w-8 h-8 text-blue-500 drop-shadow-lg" />
                            </div>
                        </div>
                    </div>
                );

            case 'tiktok-ads': // "إعلانات تيك توك"
                return (
                    <div className="relative w-full h-full bg-black overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#00f2ea]/10 to-[#ff0050]/10" />

                        {/* Visual: Phone Screen Showing Content */}
                        <div className="absolute top-[15%] bottom-[-10%] left-1/2 -translate-x-1/2 w-1/2 bg-slate-900 border-[4px] border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden transform transition-transform duration-500 group-hover:scale-105 group-hover:-translate-y-2">
                            {/* Screen Content */}
                            <div className="w-full h-full bg-slate-800 relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-black" />
                                {/* Play Button UI */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                                    <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
                                </div>
                                {/* TikTok Colors Pulse */}
                                <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#ff0050]/20 to-transparent mix-blend-screen" />
                                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#00f2ea]/20 to-transparent mix-blend-screen" />
                            </div>
                        </div>

                        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white md:px-3 px-2 py-1 rounded-full text-[10px] font-bold border border-white/10">
                            ADS MANAGER
                        </div>
                    </div>
                );

            case 'e-commerce-store': // "إنشاء متجر إلكتروني"
                return (
                    <div className="relative w-full h-full bg-slate-900 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 to-slate-900" />
                        <GridPattern />

                        {/* Visual: 3D Shop Storefront Metaphor */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative w-32 h-32">
                                {/* Back Layer */}
                                <div className="absolute inset-0 bg-emerald-500/10 rounded-xl transform rotate-6 scale-90 border border-emerald-500/20" />
                                {/* Middle Layer */}
                                <div className="absolute inset-0 bg-emerald-500/20 rounded-xl transform -rotate-3 scale-95 border border-emerald-500/30" />
                                {/* Front Layer (Store UI) */}
                                <div className="absolute inset-0 bg-slate-800 rounded-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden transform transition-transform group-hover:scale-105 duration-500">
                                    <div className="h-2/3 bg-emerald-500/10 flex items-center justify-center relative">
                                        <ShoppingBag className="w-12 h-12 text-emerald-500" />
                                        <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-400 rounded-full" />
                                    </div>
                                    <div className="h-1/3 p-2 flex flex-col justify-center gap-1.5 bg-slate-800">
                                        <div className="w-2/3 h-2 bg-slate-700 rounded-full" />
                                        <div className="w-1/2 h-2 bg-slate-700 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'e-commerce': // "التجارة الإلكترونية" (General)
                return (
                    <div className="relative w-full h-full bg-slate-900 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-green-900/30 to-slate-900" />

                        {/* Visual: Global Logistics / Network */}
                        <div className="absolute inset-0 opacity-20">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                                {/* World Map Dots Abstract */}
                                <circle cx="20" cy="40" r="1.5" fill="white" />
                                <circle cx="25" cy="45" r="1" fill="white" />
                                <circle cx="80" cy="30" r="1.5" fill="white" />
                                <circle cx="70" cy="60" r="1.5" fill="white" />
                                <circle cx="40" cy="50" r="1" fill="white" />

                                {/* Lines connecting */}
                                <path d="M20 40 Q 50 20 80 30" stroke="white" strokeWidth="0.2" fill="none" strokeDasharray="2 2" />
                                <path d="M20 40 Q 40 80 70 60" stroke="white" strokeWidth="0.2" fill="none" strokeDasharray="2 2" />
                            </svg>
                        </div>

                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl shadow-2xl shadow-green-500/20">
                                <Globe className="w-12 h-12 text-white" />
                            </div>
                        </div>

                        <div className="absolute bottom-4 right-4 flex gap-1">
                            <Package className="w-6 h-6 text-green-500/50" />
                        </div>
                    </div>
                );

            case 'traditional-business': // "التجارة التقليدية"
                return (
                    <div className="relative w-full h-full bg-[#1c1917] overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/20 to-transparent" />
                        <div className="absolute inset-0 opacity-10"
                            style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                        />

                        {/* Visual: Building/Structure Metaphor */}
                        <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 flex items-end gap-2 opacity-80">
                            <div className="w-8 h-24 bg-amber-700/20 border border-amber-600/30 rounded-t-sm backdrop-blur-sm" />
                            <div className="w-12 h-32 bg-amber-600/20 border border-amber-500/30 rounded-t-sm backdrop-blur-sm relative">
                                {/* Window grid */}
                                <div className="absolute inset-2 grid grid-cols-2 gap-1 opacity-30">
                                    <div className="bg-amber-500 rounded-[1px]" /> <div className="bg-amber-500 rounded-[1px]" />
                                    <div className="bg-amber-500 rounded-[1px]" /> <div className="bg-amber-500 rounded-[1px]" />
                                    <div className="bg-amber-500 rounded-[1px]" /> <div className="bg-amber-500 rounded-[1px]" />
                                </div>
                            </div>
                            <div className="w-8 h-16 bg-amber-700/20 border border-amber-600/30 rounded-t-sm backdrop-blur-sm" />
                        </div>

                        <div className="absolute top-6 right-6">
                            <Briefcase className="w-10 h-10 text-amber-500" />
                        </div>
                    </div>
                );

            default:
                return (
                    <div className="relative w-full h-full bg-slate-800 flex items-center justify-center">
                        <Layers className="w-16 h-16 text-slate-600" />
                    </div>
                );
        }
    };

    return (
        <div className={cn("w-full h-full", className)}>
            {renderArt()}
        </div>
    );
};

export default CourseCover;
