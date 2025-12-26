import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

export const ScrollToTop = () => {
    const [showScroll, setShowScroll] = useState(false);

    useEffect(() => {
        const checkScroll = () => {
            if (!showScroll && window.scrollY > 400) {
                setShowScroll(true);
            } else if (showScroll && window.scrollY <= 400) {
                setShowScroll(false);
            }
        };

        window.addEventListener('scroll', checkScroll);
        return () => window.removeEventListener('scroll', checkScroll);
    }, [showScroll]);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <AnimatePresence>
            {showScroll && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: 20 }}
                    transition={{ duration: 0.3 }}
                    onClick={scrollToTop}
                    className="fixed bottom-8 left-8 z-[9999] p-3.5 rounded-full bg-brand/90 backdrop-blur-sm text-white shadow-[0_4px_20px_rgba(255,122,0,0.3)] hover:bg-white hover:text-brand hover:shadow-[0_4px_25px_rgba(255,255,255,0.4)] border border-white/10 transition-all duration-300 group"
                    aria-label="Scroll to top"
                >
                    <ArrowUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform stroke-[3px]" />
                </motion.button>
            )}
        </AnimatePresence>
    );
};
