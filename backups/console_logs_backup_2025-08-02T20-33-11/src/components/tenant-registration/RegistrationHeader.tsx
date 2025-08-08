import { motion } from 'framer-motion';
import { BuildingIcon, UserPlus, Sparkles } from 'lucide-react';

interface RegistrationHeaderProps {
  currentStep?: number;
  totalSteps?: number;
}

export const RegistrationHeader = ({ 
  currentStep = 1, 
  totalSteps = 2 
}: RegistrationHeaderProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center mb-8"
    >
      <div className="inline-flex items-center justify-center gap-2 mb-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <BuildingIcon className="w-6 h-6 text-primary" />
        </div>
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <UserPlus className="w-6 h-6 text-primary" />
        </div>
      </div>
      
      <motion.h1 
        className="text-3xl font-bold mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        إنشاء حساب مسؤول ونطاق فرعي
      </motion.h1>
      
      <motion.p
        className="text-muted-foreground max-w-md mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <span className="inline-flex items-center gap-1 text-primary font-medium">
          <Sparkles className="h-3.5 w-3.5" />
          خطوة {currentStep} من {totalSteps}
        </span>
        {' - '}
        قم بإدخال البيانات اللازمة لإنشاء حساب مسؤول ومتجر إلكتروني خاص بمؤسستك
      </motion.p>
    </motion.div>
  );
};

export default RegistrationHeader;
