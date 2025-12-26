import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';

interface RegistrationLayoutProps {
    children: ReactNode;
    sidebar?: ReactNode;
}

const RegistrationLayout = ({ children, sidebar }: RegistrationLayoutProps) => {
    return (
        <div className="min-h-screen w-full flex bg-[#020202] font-tajawal selection:bg-brand selection:text-white">
            {/* Left Side - Visual & Brand (Desktop Only) */}
            <div className="hidden lg:flex w-1/2 relative bg-[#050505] flex-col justify-between p-12 overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150 brightness-100"></div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-brand/5 rounded-full blur-[120px] mix-blend-screen opacity-60"></div>
                    <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-900/5 rounded-full blur-[150px]"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] opacity-30"></div>
                </div>

                {/* Brand Logo */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="relative z-10 flex items-center gap-3"
                >
                    <div className="w-12 h-12 bg-[#0A0A0A] rounded-2xl border border-white/10 flex items-center justify-center shadow-2xl shadow-black/50 relative overflow-hidden">
                        <div className="absolute inset-0 bg-brand/5 blur-xl"></div>
                        <img src="/logo-new.ico" alt="Logo" className="w-6 h-6 object-contain relative z-10" />
                    </div>
                    <span className="text-2xl font-bold text-white tracking-tight">سطوكيها</span>
                </motion.div>

                {/* Sidebar Content */}
                <div className="relative z-10 flex-1 flex flex-col justify-center">
                    {sidebar}
                </div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="relative z-10"
                >
                    <div className="flex items-center gap-6 text-xs font-medium text-gray-500">
                        <a href="#" className="hover:text-brand transition-colors">مركز المساعدة</a>
                        <a href="#" className="hover:text-brand transition-colors">الشروط والأحكام</a>
                        <span className="flex-1" />
                        <span className="opacity-50">© 2025 Stockiha</span>
                    </div>
                </motion.div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-24 relative bg-[#020202]">
                {/* Mobile Header */}
                <div className="lg:hidden absolute top-6 left-6 right-6 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-[#0A0A0A] rounded-xl border border-white/10 flex items-center justify-center shadow-md relative overflow-hidden">
                            <div className="absolute inset-0 bg-brand/5 blur-xl"></div>
                            <img src="/logo-new.ico" alt="Logo" className="w-5 h-5 object-contain relative z-10" />
                        </div>
                        <span className="text-xl font-bold text-white">سطوكيها</span>
                    </div>
                </div>

                {/* Form Container */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    {children}
                </motion.div>

                <div className="absolute bottom-6 text-center">
                    <p className="text-xs text-gray-600">
                        © 2025 Stockiha. جميع الحقوق محفوظة.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegistrationLayout;
