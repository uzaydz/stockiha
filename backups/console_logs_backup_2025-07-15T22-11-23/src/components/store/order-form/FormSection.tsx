import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FormSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  icon,
  children,
  defaultOpen = true,
  className = '',
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className={`mb-8 border border-border rounded-xl overflow-hidden shadow-sm ${className}`}>
      <div
        className="bg-gradient-to-r from-primary/10 to-card p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          {icon && <div className="ml-3 text-primary">{icon}</div>}
          <h3 className="text-lg font-medium text-foreground">{title}</h3>
        </div>
        <button
          type="button"
          className="p-1 rounded-full hover:bg-background/80 text-muted-foreground transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>
      
      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="p-5 bg-card">{children}</div>
      </motion.div>
    </div>
  );
};
