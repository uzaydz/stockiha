import { motion } from 'framer-motion';
import { CheckIcon, UserIcon, BuildingIcon } from 'lucide-react';
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
    { id: 1, title: 'المعلومات الشخصية', icon: UserIcon },
    { id: 2, title: 'معلومات المؤسسة', icon: BuildingIcon }
  ] 
}: RegistrationStepperProps) => {
  return (
    <div className="mb-8">
      <div className="flex justify-between">
        {steps.map((step, index) => (
          <div 
            key={step.id} 
            className="relative flex flex-col items-center"
            style={{ width: `${100 / steps.length}%` }}
          >
            {/* خط الاتصال بين الخطوات */}
            {index < steps.length - 1 && (
              <div 
                className={cn(
                  "absolute top-5 left-1/2 w-full h-0.5 -translate-y-1/2",
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                )}
              />
            )}

            {/* دائرة الخطوة */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ 
                scale: currentStep === step.id ? 1.1 : 1,
                opacity: 1,
              }}
              className={cn(
                "relative z-10 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
                currentStep === step.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : currentStep > step.id
                  ? "bg-primary/90 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {currentStep > step.id ? (
                <CheckIcon className="w-5 h-5" />
              ) : (
                <step.icon className="w-5 h-5" />
              )}
            </motion.div>
            
            {/* عنوان الخطوة */}
            <div className="mt-2 text-sm font-medium text-center">
              {step.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RegistrationStepper; 