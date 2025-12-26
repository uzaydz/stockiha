import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface Action {
    label: string;
    action: string;
    icon?: React.ReactNode;
    payload?: any;
}

interface ActionChipsProps {
    actions?: Action[];
    onAction?: (action: string, payload?: any) => void;
}

export const ActionChips: React.FC<ActionChipsProps> = ({ actions, onAction }) => {
    if (!actions?.length) return null;

    return (
        <div className="flex flex-wrap gap-2 mt-3 w-full">
            {actions.map((act, idx) => (
                <motion.button
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => onAction?.(act.action, act.payload)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-white hover:shadow-md hover:border-orange-200 border border-transparent dark:hover:border-white/10 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 transition-all active:scale-95 group"
                >
                    {act.label}
                    <ArrowRight className="w-3 h-3 opacity-50 -ml-0.5 group-hover:translate-x-[-2px] transition-transform rtl:rotate-180" />
                </motion.button>
            ))}
        </div>
    );
};
