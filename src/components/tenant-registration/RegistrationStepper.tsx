import { motion } from 'framer-motion';
import { Check, User, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepInfo {
    id: number;
    title: string;
    icon: React.ElementType;
}

interface RegistrationStepperProps {
    currentStep: number;
    steps?: StepInfo[];
}

export const RegistrationStepper = ({
    currentStep,
    steps = [
        { id: 1, title: 'المعلومات الشخصية', icon: User },
        { id: 2, title: 'بيانات المؤسسة', icon: Building2 }
    ]
}: RegistrationStepperProps) => {
    return (
        <div className="w-full mb-10 px-4">
            <div className="relative flex items-center justify-between w-full max-w-xs mx-auto">
                {/* Background Line */}
                <div className="absolute left-0 top-1/2 w-full h-1 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 rounded-full" />

                {/* Active Line Progress */}
                <motion.div
                    className="absolute right-0 top-1/2 h-1 bg-orange-500 -translate-y-1/2 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: currentStep === 1 ? '0%' : '100%' }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                />

                {steps.map((step, index) => {
                    const isActive = currentStep >= step.id;
                    const isCompleted = currentStep > step.id;

                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center group cursor-default">
                            <motion.div
                                initial={false}
                                animate={{
                                    backgroundColor: isActive ? '#f97316' : '#f8fafc', // orange-500 : slate-50
                                    borderColor: isActive ? '#f97316' : '#e2e8f0', // orange-500 : slate-200
                                    scale: isActive ? 1.1 : 1,
                                    boxShadow: isActive ? "0 4px 12px rgba(249, 115, 22, 0.3)" : "none"
                                }}
                                className={cn(
                                    "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                                    isActive ? "text-white" : "text-slate-400 dark:bg-slate-800 dark:border-slate-700"
                                )}
                            >
                                {isCompleted ? (
                                    <Check className="w-6 h-6" />
                                ) : (
                                    <step.icon className="w-5 h-5" />
                                )}
                            </motion.div>

                            <motion.div
                                animate={{
                                    y: isActive ? 8 : 4,
                                    opacity: isActive ? 1 : 0.6,
                                    color: isActive ? '#0f172a' : '#94a3b8'
                                }}
                                className={cn(
                                    "absolute -bottom-8 text-sm font-bold whitespace-nowrap transition-all duration-300",
                                    isActive ? "text-slate-900 dark:text-white" : "text-slate-400"
                                )}
                            >
                                {step.title}
                            </motion.div>
                        </div>
                    );
                })}
            </div>
            <div className="h-8" /> {/* Spacer for labels */}
        </div>
    );
};

export default RegistrationStepper;
