import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';

interface RegistrationLayoutProps {
    children: ReactNode;
    sidebar?: ReactNode;
}

const RegistrationLayout = ({ children, sidebar }: RegistrationLayoutProps) => {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] dark:bg-[#020617] font-tajawal p-4 md:p-6 relative overflow-hidden">
            {/* Premium Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-orange-400/20 to-rose-500/20 rounded-full blur-[120px] opacity-60 dark:opacity-20" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-tr from-blue-400/20 to-indigo-500/20 rounded-full blur-[120px] opacity-60 dark:opacity-20" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-white/40 dark:bg-slate-900/40 blur-[100px] rounded-full" />
            </div>

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

            {/* Main Card */}
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-[1200px] bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-2xl rounded-[32px] shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-white/50 dark:border-slate-700/50 overflow-hidden relative z-10 flex flex-col lg:flex-row min-h-[800px]"
            >
                {/* Sidebar / Stepper Section (Left) */}
                <div className="w-full lg:w-[35%] bg-slate-50/50 dark:bg-slate-900/50 border-b lg:border-b-0 lg:border-l border-slate-200/50 dark:border-slate-700/50 p-8 lg:p-12 flex flex-col justify-between relative">
                    {/* Brand */}
                    <div className="flex items-center gap-3 mb-8 lg:mb-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/25 ring-1 ring-orange-500/10">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <span className="block text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">سطوكيها</span>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide">للأعمال والشركات</span>
                        </div>
                    </div>

                    {/* Stepper Content */}
                    <div className="flex-1 flex flex-col justify-center py-8">
                        {sidebar}
                    </div>

                    {/* Footer Links */}
                    <div className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <a href="#" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">مركز المساعدة</a>
                        <a href="#" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">الشروط والأحكام</a>
                        <span className="flex-1" />
                        <span className="opacity-50">© 2025</span>
                    </div>
                </div>

                {/* Main Content Section (Right) */}
                <div className="flex-1 relative flex flex-col bg-white/50 dark:bg-slate-900/20">
                    {/* Header Actions */}
                    <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
                        <ThemeToggle />
                    </div>

                    {/* Form Container */}
                    <div className="flex-1 flex flex-col justify-center p-6 sm:p-12 lg:p-20 overflow-y-auto custom-scrollbar">
                        <div className="w-full max-w-[480px] mx-auto">
                            {children}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default RegistrationLayout;
