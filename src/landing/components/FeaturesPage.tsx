
import React, { useState } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import {
    Store, Truck, PieChart, ShieldCheck, Users, Smartphone,
    Wifi, Box, Printer, Zap, Globe, Lock, Hammer,
    Fingerprint, Database, Sparkles, GraduationCap, Laptop,
    LayoutGrid, CheckCircle2, Monitor
} from 'lucide-react';

// --- SHARED VISUAL FRAMEWORK ---

const VisualFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="w-full h-[400px] md:h-[500px] bg-[#0A0A0A] rounded-3xl border border-white/5 relative overflow-hidden flex items-center justify-center shadow-2xl group transform-gpu">
        {/* Cinematic Ambient Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent opacity-30 pointer-events-none"></div>
        {/* Technical Grid Texture */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>
        {children}
    </div>
);

// --- 1. SHOP MANAGEMENT VISUAL (POS) ---
const POSBigVisual = () => (
    <div className="w-[90%] h-[80%] bg-[#141414] rounded-t-2xl border border-white/10 shadow-2xl flex flex-col relative overflow-hidden">
        <div className="h-10 border-b border-white/10 flex items-center justify-between px-4 bg-[#1A1A1A]">
            <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
            </div>
            <div className="text-[10px] text-gray-500 font-mono flex items-center gap-2">
                <Wifi className="w-3 h-3 text-green-500" /> ONLINE
            </div>
        </div>
        <div className="flex-1 flex">
            <div className="flex-1 p-4 grid grid-cols-4 gap-3 overflow-hidden">
                <div className="col-span-4 flex gap-2 mb-2">
                    <div className="px-3 py-1 bg-brand/20 text-brand text-[10px] rounded border border-brand/20">الكل</div>
                    <div className="px-3 py-1 bg-white/5 text-gray-400 text-[10px] rounded border border-white/5">هواتف</div>
                    <div className="px-3 py-1 bg-white/5 text-gray-400 text-[10px] rounded border border-white/5">اكسسوار</div>
                </div>
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="bg-[#1A1A1A] border border-white/5 rounded-lg relative group hover:border-brand/50 transition-colors cursor-pointer aspect-square">
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent"></div>
                        <div className="absolute bottom-2 left-2 w-8 h-1.5 bg-white/10 rounded-full group-hover:bg-brand/50 transition-colors"></div>
                    </div>
                ))}
            </div>
            <div className="w-64 border-l border-white/10 bg-[#111] p-4 flex flex-col">
                <div className="text-[10px] text-gray-500 mb-2">الفاتورة #9921</div>
                <div className="flex-1 space-y-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-2 items-center p-2 bg-white/5 rounded border border-white/5">
                            <div className="w-6 h-6 bg-white/5 rounded flex items-center justify-center text-[8px] text-gray-500">{i}x</div>
                            <div className="flex-1">
                                <div className="h-1.5 w-16 bg-white/20 rounded-full mb-1"></div>
                            </div>
                            <div className="h-1.5 w-8 bg-white/10 rounded-full"></div>
                        </div>
                    ))}
                </div>
                <div className="pt-4 border-t border-white/10 space-y-2">
                    <div className="flex justify-between text-gray-400 text-xs"><span>ضريبة</span><span>0%</span></div>
                    <div className="flex justify-between text-white font-bold text-lg"><span>المجموع</span><span>12,500</span></div>
                    <button className="w-full py-3 bg-brand text-white font-bold rounded-lg shadow-lg shadow-brand/20 text-xs">دفع (F12)</button>
                </div>
            </div>
        </div>
    </div>
);

// --- 2. STORE VISUAL ---
const StoreBigVisual = () => (
    <div className="relative w-full h-full flex items-center justify-center gap-8">
        {/* Mobile View */}
        <div className="w-48 h-[380px] bg-black rounded-[2rem] border-4 border-[#222] relative overflow-hidden shadow-2xl z-10">
            <div className="w-full h-full bg-[#050505] overflow-hidden flex flex-col">
                <div className="h-12 bg-[#1A1A1A] flex items-center px-4 relative z-10">
                    <div className="w-4 h-4 bg-white/10 rounded"></div>
                    <div className="mx-auto w-20 h-2 bg-white/10 rounded-full"></div>
                </div>
                <div className="p-2 grid grid-cols-2 gap-2 animate-[scrollUp_8s_linear_infinite]">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="aspect-[3/4] bg-[#1A1A1A] rounded-lg border border-white/5 relative">
                            <div className="absolute top-1 right-1 w-4 h-4 bg-brand/20 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-brand rounded-full"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        {/* Sync Arrow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 flex items-center justify-center pointer-events-none">
            <div className="w-full h-0.5 bg-brand/20"></div>
            <div className="absolute w-2 h-2 bg-brand rounded-full animate-[ping_1s_infinite]"></div>
        </div>
        {/* Dashboard View (Blurred BG) */}
        <div className="w-64 h-[300px] bg-[#141414] rounded-xl border border-white/10 shadow-xl opacity-40 blur-[2px] transform rotate-6 scale-90 p-4">
            <div className="h-4 w-24 bg-white/10 rounded-full mb-4"></div>
            <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-8 w-full bg-white/5 rounded"></div>)}
            </div>
        </div>
    </div>
);

// --- 3. LOGISTICS VISUAL ---
const LogisticsBigVisual = () => (
    <div className="w-full h-full relative">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:30px_30px] opacity-5"></div>
        {/* Central Hub */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-[#1A1A1A] rounded-full border border-brand/50 flex items-center justify-center shadow-[0_0_50px_rgba(255,122,0,0.2)] z-10">
            <Box className="w-8 h-8 text-brand" />
        </div>
        {/* Connection Lines */}
        {[0, 72, 144, 216, 288].map((deg, i) => (
            <div key={i} className="absolute top-1/2 left-1/2 w-[180px] h-[1px] bg-gradient-to-r from-brand/50 to-transparent origin-left" style={{ transform: `rotate(${deg}deg)` }}>
                <div className="absolute right-0 -top-1.5 w-3 h-3 bg-[#1A1A1A] border border-white/20 rounded-full"></div>
                <div className="absolute right-[-60px] top-[-10px] text-[8px] text-gray-500 font-mono w-20 text-center">YALIDINE</div>
            </div>
        ))}
        {/* Printer Animation */}
        <div className="absolute bottom-10 right-10 bg-white p-3 rounded shadow-xl w-40 text-black transform rotate-[-5deg]">
            <div className="flex justify-between border-b border-gray-200 pb-1 mb-1">
                <span className="text-[8px] font-bold">WAYBILL</span>
                <Printer className="w-3 h-3 text-gray-400" />
            </div>
            <div className="space-y-1">
                <div className="h-1 w-full bg-black/10 rounded"></div>
                <div className="h-1 w-2/3 bg-black/10 rounded"></div>
            </div>
            <div className="mt-2 h-6 bg-black/5 flex items-center justify-center gap-0.5">
                {[...Array(15)].map((_, i) => <div key={i} className="w-0.5 h-4 bg-black/50"></div>)}
            </div>
        </div>
    </div>
);

// --- 4. REPAIRS VISUAL ---
const RepairsBigVisual = () => (
    <div className="w-[80%] h-[70%] flex gap-6">
        {/* Ticket Side */}
        <div className="w-1/3 bg-white h-full rounded-lg shadow-2xl p-4 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-brand"></div>
            <div className="text-center border-b-2 border-dashed border-gray-200 pb-4 mb-4">
                <div className="text-2xl font-bold text-black mb-1">REPAIR</div>
                <div className="text-xs text-gray-500">TICKET #8821</div>
            </div>
            <div className="space-y-4 flex-1">
                <div>
                    <div className="text-[10px] text-gray-400 font-bold">DEVICE</div>
                    <div className="text-sm font-bold text-black">iPhone 13 Pro</div>
                </div>
                <div>
                    <div className="text-[10px] text-gray-400 font-bold">PROBLEM</div>
                    <div className="text-sm font-bold text-black">Screen Replacement</div>
                </div>
            </div>
            <div className="mt-auto pt-4 border-t-2 border-dashed border-gray-200 flex justify-center">
                <Monitor className="w-16 h-16 text-black" />
            </div>
            {/* Jagged Bottom */}
            <div className="absolute bottom-[-4px] left-0 w-full h-2 bg-[#0A0A0A]" style={{ clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)' }}></div>
        </div>

        {/* Status Side */}
        <div className="flex-1 bg-[#141414] rounded-xl border border-white/10 p-6 flex flex-col justify-center gap-6">
            {[
                { label: 'استلام الجهاز', active: true },
                { label: 'تشخيص العطل', active: true },
                { label: 'جاري الإصلاح', active: true, pulse: true },
                { label: 'جاهز للتسليم', active: false },
            ].map((step, i) => (
                <div key={i} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step.active ? 'bg-brand border-brand text-white' : 'bg-transparent border-white/20 text-gray-500'} ${step.pulse ? 'animate-pulse' : ''}`}>
                        {i + 1}
                    </div>
                    <div className={`text-sm font-bold ${step.active ? 'text-white' : 'text-gray-500'}`}>{step.label}</div>
                    {i < 3 && <div className="ml-auto w-12 h-0.5 bg-white/10 hidden md:block"></div>}
                </div>
            ))}
        </div>
    </div>
);

// --- 5. STAFF VISUAL ---
const StaffBigVisual = () => (
    <div className="w-full h-full p-8 flex flex-col items-center justify-center">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl">
            {['أحمد', 'سارة', 'كريم', 'ياسين'].map((name, i) => (
                <div key={i} className="bg-[#141414] border border-white/10 rounded-xl p-4 flex flex-col items-center gap-3 hover:border-brand/30 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-white/10 to-white/5 flex items-center justify-center text-white font-bold">
                        {name[0]}
                    </div>
                    <div className="text-center">
                        <div className="text-white font-bold text-sm">{name}</div>
                        <div className="text-[10px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full mt-1">نشط الآن</div>
                    </div>
                    <div className="w-full h-px bg-white/5 my-1"></div>
                    <div className="w-full flex justify-between text-[10px] text-gray-500">
                        <span>مبيعات:</span>
                        <span className="text-white font-mono">125k</span>
                    </div>
                </div>
            ))}
        </div>
        {/* PIN Pad Overlay */}
        <div className="absolute bottom-8 bg-[#1A1A1A] border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col items-center gap-2 backdrop-blur-md">
            <div className="flex gap-2 mb-2">
                {[...Array(4)].map((_, i) => <div key={i} className="w-3 h-3 rounded-full bg-white/20"></div>)}
            </div>
            <div className="grid grid-cols-3 gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                    <div key={n} className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-xs text-gray-400">{n}</div>
                ))}
            </div>
        </div>
    </div>
);

// --- 6. SECURITY VISUAL ---
const SecurityBigVisual = () => (
    <div className="w-[80%] bg-[#0F0F0F] rounded-xl border border-white/10 overflow-hidden font-mono text-xs">
        <div className="bg-[#1A1A1A] px-4 py-2 border-b border-white/10 flex justify-between items-center">
            <span className="text-gray-400">Security Audit Log</span>
            <Lock className="w-3 h-3 text-green-500" />
        </div>
        <div className="p-4 space-y-3">
            {[
                { time: '10:00:21', user: 'Admin', action: 'LOGIN_SUCCESS_IP_192.168.1.1', status: 'success' },
                { time: '10:15:00', user: 'Sarah', action: 'DELETE_INVOICE_#8821', status: 'danger' },
                { time: '11:20:45', user: 'Karim', action: 'PRICE_UPDATE_SKU_992', status: 'warning' },
                { time: '12:00:00', user: 'System', action: 'AUTO_BACKUP_COMPLETE', status: 'info' },
                { time: '13:45:12', user: 'Ahmed', action: 'SHIFT_END_REPORT', status: 'info' },
            ].map((log, i) => (
                <div key={i} className="flex gap-4 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                    <span className="text-gray-600">[{log.time}]</span>
                    <span className="text-blue-400 w-16">{log.user}</span>
                    <span className="text-gray-400 flex-1">{log.action}</span>
                    <span className={`
                        ${log.status === 'success' ? 'text-green-500' : ''}
                        ${log.status === 'danger' ? 'text-red-500' : ''}
                        ${log.status === 'warning' ? 'text-yellow-500' : ''}
                        ${log.status === 'info' ? 'text-blue-500' : ''}
                    `}>
                        ●
                    </span>
                </div>
            ))}
        </div>
    </div>
);

// --- 7. SUPPLIERS VISUAL ---
const SuppliersBigVisual = () => (
    <div className="w-[85%] h-[70%] bg-[#141414] rounded-xl border border-white/10 flex flex-col overflow-hidden">
        <div className="flex-1 p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-bold">قائمة الموردين</h3>
                <button className="px-3 py-1 bg-brand/20 text-brand text-xs rounded">+ مورد جديد</button>
            </div>
            <div className="space-y-3">
                {[
                    { name: 'شركة البركة للإلكترونيات', debt: '0 دج', status: 'خالص' },
                    { name: 'مؤسسة النور للاستيراد', debt: '150,000 دج', status: 'مدين' },
                    { name: 'سامسونج الجزائر', debt: '0 دج', status: 'خالص' },
                ].map((sup, i) => (
                    <div key={i} className="bg-[#1A1A1A] border border-white/5 p-3 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-gray-400 font-bold">{sup.name[0]}</div>
                            <div className="text-sm text-gray-300">{sup.name}</div>
                        </div>
                        <div className="text-right">
                            <div className={`text-xs font-bold ${sup.status === 'مدين' ? 'text-red-500' : 'text-green-500'}`}>{sup.debt}</div>
                            <div className="text-[10px] text-gray-600">{sup.status}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        <div className="h-16 bg-[#1A1A1A] border-t border-white/10 flex items-center justify-between px-6">
            <div className="text-xs text-gray-500">إجمالي ديون الموردين</div>
            <div className="text-lg font-bold text-white">150,000 دج</div>
        </div>
    </div>
);

// --- 8. CRM VISUAL ---
const CRMBigVisual = () => (
    <div className="w-full h-full flex items-center justify-center gap-6">
        <div className="w-64 h-80 bg-[#141414] rounded-2xl border border-white/10 p-6 flex flex-col items-center shadow-2xl relative z-10">
            <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-brand to-purple-600 mb-4">
                <div className="w-full h-full bg-[#111] rounded-full flex items-center justify-center overflow-hidden">
                    <Users className="w-8 h-8 text-gray-400" />
                </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">أمين محمد</h3>
            <div className="text-xs text-brand bg-brand/10 px-2 py-0.5 rounded-full mb-6">VIP Customer</div>

            <div className="w-full space-y-4">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">المجموع</span>
                    <span className="text-white font-bold">120,500 دج</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">الزيارات</span>
                    <span className="text-white font-bold">14</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">الديون</span>
                    <span className="text-green-500 font-bold">0 دج</span>
                </div>
            </div>
        </div>
        {/* Background Cards */}
        <div className="absolute w-60 h-72 bg-[#1A1A1A] rounded-2xl border border-white/5 transform translate-x-12 translate-y-4 -z-10 opacity-50"></div>
        <div className="absolute w-60 h-72 bg-[#1A1A1A] rounded-2xl border border-white/5 transform -translate-x-12 translate-y-8 -z-20 opacity-30"></div>
    </div>
);

// --- 9. SERA AI VISUAL ---
const SeraBigVisual = () => (
    <div className="w-[80%] h-[80%] bg-[#000] rounded-3xl border border-white/10 overflow-hidden flex flex-col relative shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-b from-brand/5 to-transparent pointer-events-none"></div>
        <div className="h-14 bg-[#111] border-b border-white/10 flex items-center px-6 gap-4">
            <div className="w-8 h-8 bg-gradient-to-tr from-brand to-purple-600 rounded-full p-[2px]">
                <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                </div>
            </div>
            <div>
                <div className="text-sm font-bold text-white">Sera AI Assistant</div>
                <div className="text-[10px] text-green-500 flex items-center gap-1">● Online</div>
            </div>
        </div>
        <div className="flex-1 p-6 space-y-6">
            <div className="flex justify-end">
                <div className="bg-[#222] text-white px-4 py-3 rounded-2xl rounded-tr-sm text-sm">
                    كم أرباحي هذا الأسبوع؟
                </div>
            </div>
            <div className="flex justify-start gap-3">
                <div className="w-8 h-8 bg-gradient-to-tr from-brand to-purple-600 rounded-full flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-[#1A1A1A] border border-white/10 text-gray-300 px-4 py-3 rounded-2xl rounded-tl-sm text-sm">
                    أرباحك هذا الأسبوع هي <span className="text-white font-bold">450,000 دج</span> 📈.
                    <br />هذا يمثل زيادة بـ 15% عن الأسبوع الماضي.
                </div>
            </div>
            <div className="flex justify-end">
                <div className="bg-[#222] text-white px-4 py-3 rounded-2xl rounded-tr-sm text-sm">
                    غيري سعر 'ساعة آبل' إلى 45,000
                </div>
            </div>
            <div className="flex justify-start gap-3">
                <div className="w-8 h-8 bg-gradient-to-tr from-brand to-purple-600 rounded-full flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-[#1A1A1A] border border-white/10 text-gray-300 px-4 py-3 rounded-2xl rounded-tl-sm text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    تم تعديل السعر بنجاح ✅
                </div>
            </div>
        </div>
        <div className="p-4 bg-[#111] border-t border-white/10">
            <div className="h-10 bg-[#222] rounded-full border border-white/5 flex items-center px-4 text-gray-500 text-sm">
                أكتب لسيرا...
            </div>
        </div>
    </div>
);

// --- 10. TRAINING VISUAL ---
const TrainingBigVisual = () => (
    <div className="w-full h-full p-8 grid grid-cols-2 gap-4">
        {[
            { title: 'Facebook Ads Masterclass', color: 'bg-blue-600' },
            { title: 'TikTok Viral Strategies', color: 'bg-black border border-white/20' },
            { title: 'E-commerce 101', color: 'bg-brand' },
            { title: 'Stoukiha Advanced', color: 'bg-purple-600' },
        ].map((course, i) => (
            <div key={i} className="bg-[#141414] rounded-xl border border-white/10 overflow-hidden group hover:border-brand/30 transition-all cursor-pointer">
                <div className={`h-24 ${course.color} relative flex items-center justify-center`}>
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                        <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1"></div>
                    </div>
                </div>
                <div className="p-3">
                    <div className="text-white font-bold text-sm mb-1">{course.title}</div>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 w-1/3"></div>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">35% مكتمل</div>
                </div>
            </div>
        ))}
    </div>
);

// --- 11. TECH VISUAL ---
const TechBigVisual = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        {/* Central Cloud */}
        <div className="w-32 h-32 bg-[#1A1A1A] rounded-full border border-brand/50 flex items-center justify-center shadow-[0_0_50px_rgba(255,122,0,0.2)] z-20 relative">
            <Database className="w-12 h-12 text-brand" />
            <div className="absolute inset-0 border border-dashed border-white/20 rounded-full animate-spin-slow"></div>
        </div>

        {/* Satellites */}
        {[
            { icon: Laptop, label: 'Windows', deg: 0 },
            { icon: Laptop, label: 'macOS', deg: 120 },
            { icon: Smartphone, label: 'Android (Coming Soon)', deg: 240 },
        ].map((item, i) => (
            <div key={i} className="absolute w-[240px] h-[1px] bg-gradient-to-r from-white/20 to-transparent origin-left z-10" style={{ transform: `rotate(${item.deg}deg) translateX(60px)` }}>
                <div className="absolute right-0 -top-6 flex flex-col items-center transform -rotate-[${item.deg}deg]">
                    <div className="w-12 h-12 bg-[#141414] rounded-xl border border-white/10 flex items-center justify-center mb-2 shadow-xl" style={{ transform: `rotate(-${item.deg}deg)` }}>
                        <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-xs text-gray-400 font-bold bg-[#0A0A0A] px-2 py-1 rounded" style={{ transform: `rotate(-${item.deg}deg)` }}>{item.label}</div>
                </div>
            </div>
        ))}
    </div>
);


const SECTIONS = [
    {
        id: 'pos',
        title: 'إدارة المحل',
        subtitle: 'Shop Management',
        icon: Store,
        color: 'text-brand',
        visual: <POSBigVisual />,
        features: [
            { title: "كاشير أوفلاين/أونلاين", desc: "يعمل بلا إنترنت مع مزامنة لاحقة آلية عند عودة الاتصال." },
            { title: "نقطة بيع كاملة (POS)", desc: "واجهة سريعة، فواتير احترافية قابلة للطباعة (A4/Thermal)." },
            { title: "إدارة مخزون شاملة", desc: "تتبع الكميات، أسعار الشراء والبيع، وتنبيهات نفاد المخزون." },
            { title: "إدارة المصروفات", desc: "سجل كل المصاريف اليومية والشهرية لضبط الميزانية." },
            { title: "إدارة الديون (الكريدي)", desc: "دفتر ديون رقمي لكل عميل مع تتبع المدفوعات." },
            { title: "حساب الزكاة", desc: "خوارزمية ذكية تحسب زكاة تجارتك بناءً على الأرباح والمخزون." },
            { title: "تقارير وتحليلات", desc: "لوحة تحكم مفصلة للمبيعات والأرباح (يومي/شهري)." }
        ]
    },
    {
        id: 'store',
        title: 'المتجر الإلكتروني',
        subtitle: 'Online Store & Sync',
        icon: Globe,
        color: 'text-blue-500',
        visual: <StoreBigVisual />,
        features: [
            { title: "إنشاء متجر تلقائي", desc: "متجر جاهز لكل مشترك بدون أي إعدادات تقنية معقدة." },
            { title: "مزامنة المنتجات", desc: "كل منتج تضيفه في النظام يظهر في المتجر فوراً." },
            { title: "مزامنة ثنائية", desc: "البيع في المحل ينقص من مخزون الموقع والعكس صحيح." },
            { title: "تحكم كامل في التصميم", desc: "غير الألوان، الأقسام، والبنرات لتناسب هويتك." },
            { title: "طلبيات غير محدودة", desc: "استقبل آلاف الطلبات دون أي رسوم إضافية." },
            { title: "تكامل Pixel", desc: "ربط جاهز مع Facebook Pixel و TikTok Pixel للتتبع." }
        ]
    },
    {
        id: 'logistics',
        title: 'التوصيل واللوجستيك',
        subtitle: 'Delivery Integration',
        icon: Truck,
        color: 'text-green-500',
        visual: <LogisticsBigVisual />,
        features: [
            { title: "ربط 30+ شركة توصيل", desc: "تكامل مباشر مع ياليدين، إيكوز، ZR، وغيرها." },
            { title: "إرسال الطلبات", desc: "حول الطلبية لشركة التوصيل بضغطة زر من داخل النظام." },
            { title: "طباعة البوصلات", desc: "اطبع البورديرو وملصقات التوصيل فوراً." },
            { title: "تتبع الشحنات", desc: "راقب حالة كل طرد (واصل، مرتجع) من لوحة تحكم واحدة." }
        ]
    },
    {
        id: 'repairs',
        title: 'الإصلاحات والصيانة',
        subtitle: 'Repair System',
        icon: Hammer,
        color: 'text-orange-500',
        visual: <RepairsBigVisual />,
        features: [
            { title: "ملف إصلاح لكل جهاز", desc: "سجل بيانات الجهاز، العطل، والتكلفة المتوقعة." },
            { title: "نظام الملصق المزدوج", desc: "ملصق للجهاز + وصل للعميل بنفس الكود." },
            { title: "تحديث بالسكان (Scan)", desc: "الفني يمسح الكود لتحديث الحالة (تم الإصلاح)." },
            { title: "بوابة تتبع للعميل", desc: "رابط QR يسمح للعميل بمراقبة حالة جهازه من منزله." },
            { title: "رسائل تلقائية", desc: "SMS للعميل فور جاهزية الجهاز للاستلام." }
        ]
    },
    {
        id: 'staff',
        title: 'إدارة الموظفين',
        subtitle: 'Staff & Performance',
        icon: Fingerprint,
        color: 'text-purple-500',
        visual: <StaffBigVisual />,
        features: [
            { title: "دخول بكود PIN", desc: "تسجيل دخول سريع وآمن لكل موظف." },
            { title: "جلسات مستقلة", desc: "تتبع مبيعات كل بائع ووردية عمله بدقة." },
            { title: "تقارير الأداء", desc: "اعرف من باع أكثر ومن هو الموظف المثالي." },
            { title: "توزيع الطلبيات", desc: "نظام Round Robin لتوزيع الطلبات بالعدل بين الفريق." },
            { title: "نظام العمولات", desc: "حساب تلقائي لعمولات الموظفين لتحفيزهم." }
        ]
    },
    {
        id: 'security',
        title: 'الصلاحيات والأمان',
        subtitle: 'Access Control',
        icon: ShieldCheck,
        color: 'text-red-500',
        visual: <SecurityBigVisual />,
        features: [
            { title: "حساب مدير", desc: "تحكم كامل في النظام وجميع الإعدادات." },
            { title: "صلاحيات الموظفين", desc: "حدد ما يمكن للموظف رؤيته (إخفاء سعر الشراء، التقارير)." },
            { title: "سجل النشاط (Log)", desc: "مراقبة دقيقة لأي عملية تعديل أسعار أو حذف فواتير." }
        ]
    },
    {
        id: 'suppliers',
        title: 'الموردين والمشتريات',
        subtitle: 'Supply Chain',
        icon: Truck, // Reusing Truck icon broadly
        color: 'text-yellow-500',
        visual: <SuppliersBigVisual />,
        features: [
            { title: "إدارة الموردين", desc: "قاعدة بيانات للموردين مع تفاصيل الاتصال والديون." },
            { title: "إدارة المشتريات", desc: "سجل فواتير الشراء واربطها بالمخزون مباشرة." },
            { title: "تقارير التكلفة", desc: "تحليل دقيق لتكاليف السلع وهوامش الربح." }
        ]
    },
    {
        id: 'crm',
        title: 'العملاء والعلاقات',
        subtitle: 'CRM Database',
        icon: Users,
        color: 'text-pink-500',
        visual: <CRMBigVisual />,
        features: [
            { title: "قاعدة بيانات عملاء", desc: "حفظ أرقام، عناوين، وتاريخ شراء كل عميل." },
            { title: "استهداف تسويقي", desc: "استخدم البيانات لإعادة استهداف العملاء في الحملات." },
            { title: "تتبع الديون", desc: "معرفة رصيد كل عميل وتاريخ آخر دفعة." }
        ]
    },
    {
        id: 'sera',
        title: 'المساعدة الذكية "سيرا"',
        subtitle: 'AI Assistant',
        icon: Sparkles,
        color: 'text-indigo-400',
        visual: <SeraBigVisual />,
        features: [
            { title: "مساعد نصي ذكي", desc: "تحدث مع النظام باللغة الطبيعية لتنفيذ المهام." },
            { title: "أوامر بسيطة", desc: "مثال: 'كم أرباحي اليوم؟', 'غير سعر المنتج X'." },
            { title: "تنفيذ مباشر", desc: "لا داعي للبحث في القوائم، سيرا تقوم بالعمل عنك." }
        ]
    },
    {
        id: 'training',
        title: 'التدريب والدعم',
        subtitle: 'Academy & Support',
        icon: GraduationCap,
        color: 'text-blue-400',
        visual: <TrainingBigVisual />,
        features: [
            { title: "5 دورات مجانية", desc: "فيسبوك، تيك توك، التجارة الإلكترونية، واحتراف النظام." },
            { title: "لايف أسبوعي", desc: "لقاء مباشر مع الخبراء للإجابة على أسئلتكم." },
            { title: "تطوير مستمر", desc: "نستقبل اقتراحاتكم ونضيف ميزات جديدة شهرياً." }
        ]
    },
    {
        id: 'tech',
        title: 'البنية التقنية',
        subtitle: 'Tech & Deploy',
        icon: Laptop,
        color: 'text-gray-400',
        visual: <TechBigVisual />,
        features: [
            { title: "ويندوز وماك", desc: "يعمل بكفاءة على جميع أنظمة التشغيل الحديثة." },
            { title: "تعدد الأجهزة", desc: "ادخل من اللابتوب في المنزل والكمبيوتر في المحل." },
            { title: "تطبيقات موبايل", desc: "قريباً: تطبيقات أندرويد وآيفون لإدارة محلك من جيبك." }
        ]
    }
];

export const FeaturesPage: React.FC = () => {
    const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            const offset = 100; // Sticky header height
            const elementPosition = element.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({
                top: elementPosition - offset,
                behavior: 'smooth'
            });
            setActiveSection(id);
        }
    };

    return (
        <div className="bg-[#050505] min-h-screen pb-32">

            {/* 1. HERO SECTION: "The Infinite Flow" Concept (Mobile Optimized) */}
            <section className="relative min-h-[100dvh] md:min-h-[90vh] flex flex-col items-center justify-center bg-[#050505] overflow-hidden">

                {/* Background Ambient Layers */}
                {/* Background Ambient Layers */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-[250px] md:w-[500px] h-[250px] md:h-[500px] bg-brand/10 rounded-full blur-[80px] md:blur-[120px] mix-blend-screen opacity-40 will-change-transform"></div>
                    <div className="absolute bottom-0 right-1/4 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-blue-600/10 rounded-full blur-[80px] md:blur-[120px] mix-blend-screen opacity-30 will-change-transform"></div>
                    {/* Grain Texture - Low opacity for perf */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-100 contrast-150 mix-blend-overlay"></div>
                </div>

                {/* Main Content Helper */}
                <div className="relative z-10 w-full flex flex-col gap-8 md:gap-16 pt-0 md:pt-20">

                    {/* Typography Block */}
                    <div className="text-center px-4 max-w-4xl mx-auto space-y-4 md:space-y-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-md"
                        >
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-brand animate-pulse"></span>
                            <span className="text-[9px] md:text-xs text-gray-300 font-mono tracking-wider">V3.0 SYSTEM ARCHITECTURE</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.1 }}
                            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-tight whitespace-nowrap"
                        >
                            إمكانيات
                            <span className="inline-block text-transparent bg-clip-text bg-gradient-to-br from-brand via-orange-400 to-yellow-500 mx-2 md:mx-4">
                                لا حدود
                            </span>
                            لها
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.2 }}
                            className="text-base md:text-2xl text-gray-400 font-light max-w-sm md:max-w-2xl mx-auto leading-relaxed px-2 md:px-0"
                        >
                            اكتشف القوة الكامنة في نظام واحد. من إدارة المخزون الدقيقة إلى الذكاء الاصطناعي المتطور.
                        </motion.p>
                    </div>

                    {/* Marquee Container */}
                    <div className="relative w-full overflow-hidden flex flex-col gap-4 md:gap-6 dir-ltr">
                        {/* CSS for LTR direction enforcement to ensure transform works predictably */}
                        <style>{`
                            .dir-ltr { direction: ltr; }
                        `}</style>

                        {/* Gradient Fade Overlays */}
                        <div className="absolute top-0 left-0 h-full w-8 md:w-32 bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none"></div>
                        <div className="absolute top-0 right-0 h-full w-8 md:w-32 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none"></div>

                        {/* Row 1: The Modules (Right to Left) */}
                        <div className="flex w-max animate-[scrollLeft_40s_linear_infinite] md:animate-[scrollLeft_60s_linear_infinite] hover:[animation-play-state:paused] will-change-transform transform-gpu">
                            {/* Container 1 */}
                            <div className="flex gap-3 md:gap-4 px-1.5 md:px-2">
                                {[...SECTIONS, ...SECTIONS].map((section, idx) => (
                                    <div key={`r1-c1-${idx}`} className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 bg-[#111] border border-white/5 rounded-2xl hover:border-brand/50 hover:bg-[#161616] transition-colors group cursor-default min-w-[160px] md:min-w-[200px]">
                                        <div className={`p-1.5 md:p-2 rounded-lg bg-white/5 ${section.color} group-hover:scale-110 transition-transform`}>
                                            <section.icon className="w-4 h-4 md:w-5 md:h-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs md:text-sm font-bold text-white whitespace-nowrap">{section.title}</div>
                                            <div className="text-[8px] md:text-[10px] text-gray-500 font-mono hidden md:block">{section.subtitle}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Container 2 (Identical Clone) */}
                            <div className="flex gap-3 md:gap-4 px-1.5 md:px-2">
                                {[...SECTIONS, ...SECTIONS].map((section, idx) => (
                                    <div key={`r1-c2-${idx}`} className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 bg-[#111] border border-white/5 rounded-2xl hover:border-brand/50 hover:bg-[#161616] transition-colors group cursor-default min-w-[160px] md:min-w-[200px]">
                                        <div className={`p-1.5 md:p-2 rounded-lg bg-white/5 ${section.color} group-hover:scale-110 transition-transform`}>
                                            <section.icon className="w-4 h-4 md:w-5 md:h-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs md:text-sm font-bold text-white whitespace-nowrap">{section.title}</div>
                                            <div className="text-[8px] md:text-[10px] text-gray-500 font-mono hidden md:block">{section.subtitle}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Row 2: The Features (Right to Left) */}
                        <div className="flex w-max animate-[scrollLeft_50s_linear_infinite] md:animate-[scrollLeft_90s_linear_infinite] hover:[animation-play-state:paused] will-change-transform transform-gpu">
                            {(() => {
                                // Prepare efficient subset
                                const allFeatures = SECTIONS.flatMap(s => s.features.map(f => ({ ...f, icon: s.icon, color: s.color })));
                                const subset = allFeatures.slice(0, 30); // Use 30 items
                                const renderSet = (keyPrefix: string) => (
                                    <div className="flex gap-3 md:gap-4 px-1.5 md:px-2">
                                        {subset.map((feat, idx) => (
                                            <div key={`${keyPrefix}-${idx}`} className="flex items-center gap-2 md:gap-3 px-4 md:px-5 py-2 md:py-3 bg-[#0A0A0A] border border-white/5 rounded-xl hover:border-white/20 transition-colors min-w-[150px] md:min-w-[240px]">
                                                <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-gray-600"></div>
                                                <div className="text-[10px] md:text-xs text-gray-300 whitespace-nowrap">{feat.title}</div>
                                            </div>
                                        ))}
                                    </div>
                                );

                                return (
                                    <>
                                        {renderSet('r2-c1')}
                                        {renderSet('r2-c2')}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Scroll Down Hint */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 1 }}
                    className="absolute bottom-5 md:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-500"
                >
                    <span className="text-[8px] md:text-[10px] tracking-[0.2em] font-mono uppercase">Explore Features</span>
                    <div className="w-[1px] h-8 md:h-12 bg-gradient-to-b from-brand to-transparent"></div>
                </motion.div>

                {/* Keyframes for Marquee */}
                <style>{`
                    @keyframes scrollLeft {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                    }
                `}</style>
            </section>

            {/* 2. Sticky Navigation */}
            <div className="sticky top-[80px] z-40 bg-[#050505]/80 backdrop-blur-xl border-y border-white/5 py-4 mb-20">
                <div className="max-w-7xl mx-auto px-6 overflow-x-auto no-scrollbar">
                    <div className="flex justify-center min-w-max gap-2">
                        {SECTIONS.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => scrollToSection(section.id)}
                                className={`px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all flex items-center gap-2 ${activeSection === section.id
                                    ? 'bg-white text-black'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                <section.icon className={`w-3 h-3 md:w-4 md:h-4 ${activeSection === section.id ? 'text-brand' : ''}`} />
                                {section.title}
                            </button>
                        ))}
                    </div>
                </div>
                <motion.div className="absolute bottom-0 left-0 right-0 h-[1px] bg-brand origin-left" style={{ scaleX }} />
            </div>

            {/* 3. Deep Dive Sections */}
            <div className="max-w-7xl mx-auto px-6 space-y-32">
                {SECTIONS.map((section, index) => (
                    <section
                        key={section.id}
                        id={section.id}
                        className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 lg:gap-20 items-center scroll-mt-40`}
                    >
                        {/* Text Content */}
                        <div className="lg:w-1/2">
                            <div className={`w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 ${section.color}`}>
                                <section.icon className="w-6 h-6" />
                            </div>
                            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">{section.title}</h2>
                            <p className="text-xl text-gray-400 mb-10 font-light">{section.subtitle}</p>

                            <div className="grid grid-cols-1 gap-6">
                                {section.features.map((feat, i) => (
                                    <div key={i} className="flex gap-4 group">
                                        <div className="mt-1">
                                            <div className="w-6 h-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-bold group-hover:bg-brand group-hover:text-white transition-colors">
                                                {i + 1}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-brand transition-colors">{feat.title}</h3>
                                            <p className="text-sm text-gray-500 leading-relaxed">{feat.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Visual Content */}
                        <div className="lg:w-1/2 w-full">
                            <VisualFrame>
                                {section.visual}
                            </VisualFrame>
                        </div>
                    </section>
                ))}
            </div>

            {/* 4. Bottom CTA */}
            <div className="max-w-4xl mx-auto px-6 mt-40 text-center">
                <h2 className="text-4xl font-bold text-white mb-8">هل أنت مستعد لتغيير قواعد اللعبة؟</h2>
                <button className="px-10 py-4 bg-brand text-white text-lg font-bold rounded-xl shadow-2xl shadow-brand/20 hover:scale-105 transition-transform">
                    ابدأ تجربتك المجانية الآن
                </button>
            </div>

        </div>
    );
};
