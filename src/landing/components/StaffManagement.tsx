import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Users, Fingerprint, ShieldCheck, Wallet, Lock, ScanLine, UserX, UserCheck } from 'lucide-react';

// --- VISUAL: SECURITY ACCESS SCANNER ---

const AccessCard = ({ name, role, status, image }: any) => (
    <div className="relative w-64 h-40 bg-[#1A1A1A] rounded-xl border border-white/10 overflow-hidden group shadow-2xl">
        {/* Holographic Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-brand/5 to-transparent opacity-50 z-10"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>

        {/* Use Scan Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-brand shadow-[0_0_15px_#FF7A00] animate-[scan_2s_linear_infinite] z-20 opacity-50 transform-gpu"></div>

        <div className="p-4 relative z-10 flex gap-4 items-center h-full">
            <div className="w-16 h-16 rounded-lg border-2 border-white/20 overflow-hidden relative">
                {/* Avatar Placeholder */}
                <div className="w-full h-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">
                    {name[0]}
                </div>
                {/* Status Indicator */}
                <div className={`absolute bottom-0 left-0 w-full h-1.5 ${status === 'GRANTED' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            <div>
                <h3 className="text-white font-bold text-lg">{name}</h3>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{role}</p>
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${status === 'GRANTED'
                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                    : 'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                    ACCESS: {status}
                </div>
            </div>
        </div>
    </div>
);

const SecurityTerminal = () => {
    const [scanState, setScanState] = useState<'IDLE' | 'SCANNING' | 'GRANTED' | 'DENIED'>('IDLE');
    const [currentUser, setCurrentUser] = useState(0);

    const USERS = [
        { name: "Yassine", role: "Manager", access: "GRANTED" },
        { name: "Unknown", role: "Guest", access: "DENIED" },
        { name: "Amine", role: "Seller", access: "GRANTED" }
    ];

    const ref = React.useRef(null);
    const isInView = useInView(ref, { margin: "-100px" });

    useEffect(() => {
        if (!isInView) return;

        const interval = setInterval(() => {
            setScanState('SCANNING');
            setTimeout(() => {
                setScanState(USERS[currentUser].access as any);
                setTimeout(() => {
                    setScanState('IDLE');
                    setCurrentUser(prev => (prev + 1) % USERS.length);
                }, 2000);
            }, 1500);
        }, 5000);
        return () => clearInterval(interval);
    }, [currentUser, isInView]);

    return (
        <div ref={ref} className="relative w-full max-w-lg mx-auto h-[400px] flex items-center justify-center">

            {/* The Gate (Background Ring) */}
            <div className={`absolute inset-0 border-[20px] rounded-full transition-colors duration-500 blur-sm opacity-20 ${scanState === 'GRANTED' ? 'border-green-500' :
                scanState === 'DENIED' ? 'border-red-500' : 'border-gray-800'
                }`}></div>
            <div className="absolute inset-4 border border-dashed border-white/10 rounded-full animate-[spin_10s_linear_infinite]"></div>

            {/* Central Display */}
            <div className="relative z-10 flex flex-col items-center">
                <AnimatePresence mode="wait">
                    {scanState === 'IDLE' && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-4"
                        >
                            <div className="w-24 h-24 bg-[#141414] rounded-2xl border border-white/10 flex items-center justify-center shadow-2xl">
                                <Fingerprint className="w-12 h-12 text-gray-600 animate-pulse" />
                            </div>
                            <span className="text-xs text-gray-500 font-mono tracking-widest">WAITING FOR ID...</span>
                        </motion.div>
                    )}

                    {scanState === 'SCANNING' && (
                        <motion.div
                            key="scanning"
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-4"
                        >
                            <div className="w-24 h-24 bg-[#141414] rounded-2xl border border-brand/50 flex items-center justify-center shadow-[0_0_30px_rgba(255,122,0,0.2)]">
                                <ScanLine className="w-10 h-10 text-brand animate-ping" />
                            </div>
                            <span className="text-xs text-brand font-mono tracking-widest">VERIFYING...</span>
                        </motion.div>
                    )}

                    {(scanState === 'GRANTED' || scanState === 'DENIED') && (
                        <motion.div
                            key="result"
                            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                        >
                            <AccessCard
                                name={USERS[currentUser].name}
                                role={USERS[currentUser].role}
                                status={scanState}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Floating Permission Nodes */}
            <div className="absolute top-10 left-10 p-3 bg-[#111] rounded-xl border border-white/5 flex items-center gap-2 transform -rotate-6 shadow-xl">
                <Lock className="w-4 h-4 text-brand" />
                <div className="text-[9px] text-gray-400">
                    <span className="block text-white font-bold">Admin Panel</span>
                    LOCKED
                </div>
            </div>
            <div className="absolute bottom-10 right-10 p-3 bg-[#111] rounded-xl border border-white/5 flex items-center gap-2 transform rotate-6 shadow-xl">
                <Wallet className="w-4 h-4 text-green-500" />
                <div className="text-[9px] text-gray-400">
                    <span className="block text-white font-bold">Cash Drawer</span>
                    AUTHORIZED
                </div>
            </div>

        </div>
    );
}

export const StaffManagement: React.FC = () => {
    return (
        <section className="py-24 md:py-32 bg-[#050505] overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">

                <div className="flex flex-col lg:flex-row items-center gap-16">

                    {/* Content */}
                    <div className="w-full lg:w-1/2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/5 border border-brand/10 text-brand text-[10px] font-bold mb-4 uppercase tracking-widest">
                            <ShieldCheck className="w-3 h-3" />
                            Security Protocol
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-[1.4]">
                            أدر فريقك (Team) <br />
                            <span className="mt-4 inline-block text-brand">بذكاء وصرامة.</span>
                        </h2>
                        <p className="text-lg md:text-xl text-gray-400 mb-8 leading-relaxed max-w-xl">
                            منع السرقة و التلاعب. النظام يعطيك تحكم كامل: كل خدام عندو  Code PIN، وعندك "عين الصقر" (Audit Log) تسجل كل صغيرة وكبيرة (شكون باع، شكون مسح، شكون بدل السعر).
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-[#111] rounded-xl border border-white/5 hover:border-brand/20 transition-colors">
                                <UserCheck className="w-6 h-6 text-green-500 mb-3" />
                                <h4 className="text-white font-bold text-sm mb-1">Droit d'accès</h4>
                                <p className="text-[10px] text-gray-500">حدد شكون يشوف الفايدة وشكون يبيع برك.</p>
                            </div>
                            <div className="p-4 bg-[#111] rounded-xl border border-white/5 hover:border-brand/20 transition-colors">
                                <UserX className="w-6 h-6 text-red-500 mb-3" />
                                <h4 className="text-white font-bold text-sm mb-1">Anti-Fraude</h4>
                                <p className="text-[10px] text-gray-500">تنبيه فوري إذا حاول أي موظف التلاعب.</p>
                            </div>
                        </div>
                    </div>

                    {/* Visual */}
                    <div className="w-full lg:w-1/2">
                        <SecurityTerminal />
                    </div>

                </div>
            </div>
        </section>
    );
};
