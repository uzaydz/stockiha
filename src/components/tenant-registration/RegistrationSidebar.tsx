import { motion } from 'framer-motion';
import { User, Building2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RegistrationSidebarProps {
    currentStep?: number;
}

export const RegistrationSidebar = ({ currentStep = 1 }: RegistrationSidebarProps) => {
    const steps = [
        {
            id: 1,
            title: 'المعلومات الشخصية',
            description: 'أدخل بياناتك الأساسية لإنشاء حساب المسؤول',
            icon: User
        },
        {
            id: 2,
            title: 'بيانات المؤسسة',
            description: 'قم بإعداد هوية متجرك ورابط الوصول',
            icon: Building2
        }
    ];

    return (
        <div className="space-y-10">
            <div className="space-y-4">
                <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 leading-tight tracking-tighter">
                    ابدأ رحلة
                    <span className="block text-brand drop-shadow-[0_0_30px_rgba(255,122,0,0.3)]">
                        نجاحك التجاري.
                    </span>
                </h2>
                <p className="text-xl text-gray-400 font-light leading-relaxed">
                    انضم إلى آلاف التجار الذين يثقون بمنصتنا لإدارة وتنمية أعمالهم بكل احترافية.
                </p>
            </div>

            <div className="relative space-y-0 py-4">
                {/* Connection Line */}
                <div className="absolute right-[22px] top-6 bottom-6 w-[2px] bg-white/10" />
                <motion.div
                    className="absolute right-[22px] top-6 w-[2px] bg-brand origin-top"
                    initial={{ height: '0%' }}
                    animate={{ height: currentStep > 1 ? '100%' : '0%' }}
                    transition={{ duration: 0.5 }}
                />

                {steps.map((step, index) => {
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;

                    return (
                        <div key={step.id} className="relative flex gap-6 items-start py-4 group">
                            {/* Icon Indicator */}
                            <motion.div
                                className={cn(
                                    "relative z-10 w-11 h-11 rounded-2xl flex items-center justify-center border transition-all duration-300 shrink-0",
                                    isActive ? "bg-brand border-brand text-white shadow-[0_0_30px_rgba(255,122,0,0.3)] scale-110" :
                                        isCompleted ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20" :
                                            "bg-[#0F0F0F] border-white/10 text-gray-500"
                                )}
                                animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                            >
                                {isCompleted ? (
                                    <CheckCircle2 className="w-6 h-6" />
                                ) : (
                                    <step.icon className="w-5 h-5" />
                                )}
                            </motion.div>

                            {/* Text Content */}
                            <div className={cn(
                                "pt-1 transition-all duration-300",
                                isActive ? "opacity-100 translate-x-0" : "opacity-60"
                            )}>
                                <h3 className={cn(
                                    "font-bold text-lg transition-colors",
                                    isActive ? "text-white" : "text-gray-500"
                                )}>
                                    {step.title}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1.5 leading-relaxed max-w-[240px]">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pro Tip Box */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-5 rounded-2xl bg-[#0F0F0F]/80 backdrop-blur-xl border border-white/10 relative overflow-hidden group"
            >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-brand to-brand-hover opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex gap-3 relative z-10">
                    <div className="w-8 h-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0 text-brand font-bold text-sm">
                        💡
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-white">نصيحة احترافية</h4>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                            يمكنك دائماً تغيير إعدادات متجرك وتخصيص هويته لاحقاً من لوحة التحكم.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default RegistrationSidebar;
