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
            <div className="space-y-2">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white leading-tight">
                    ابدأ رحلة <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-rose-600">نجاحك التجاري</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
                    انضم إلى آلاف التجار الذين يثقون بمنصتنا لإدارة وتنمية أعمالهم بكل احترافية.
                </p>
            </div>

            <div className="relative space-y-0 py-4">
                {/* Connection Line */}
                <div className="absolute right-[22px] top-6 bottom-6 w-[2px] bg-slate-100 dark:bg-slate-800" />
                <motion.div 
                    className="absolute right-[22px] top-6 w-[2px] bg-orange-500 origin-top"
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
                                    isActive ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30 scale-110" :
                                        isCompleted ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20" :
                                            "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400"
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
                                    isActive ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
                                )}>
                                    {step.title}
                                </h3>
                                <p className="text-sm text-slate-400 mt-1.5 leading-relaxed max-w-[240px]">
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
                className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800/30 border border-slate-100 dark:border-slate-700 relative overflow-hidden group"
            >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-400 to-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex gap-3 relative z-10">
                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0 text-orange-600 dark:text-orange-400 font-bold text-sm">
                        💡
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">نصيحة احترافية</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            يمكنك دائماً تغيير إعدادات متجرك وتخصيص هويته لاحقاً من لوحة التحكم.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default RegistrationSidebar;
