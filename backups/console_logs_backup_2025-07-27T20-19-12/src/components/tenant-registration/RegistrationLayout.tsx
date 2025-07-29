import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';

interface RegistrationLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
}

const RegistrationLayout = ({ children, sidebar }: RegistrationLayoutProps) => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-white dark:from-gray-900 via-[#fc5d41]/5 to-white dark:to-gray-900 flex flex-col py-8 md:py-12">
      {/* Logo and Theme Toggle */}
      <div className="container mb-6 flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2"
        >
          <div className="h-8 w-8 rounded-lg bg-[#fc5d41]/20 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" className="text-[#fc5d41]" />
              <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" className="text-[#fc5d41]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">سطوكيها</span>
        </motion.div>

        <ThemeToggle />
      </div>

      {/* Main Content */}
      <div className="container flex-1 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"
        >
          {/* Main Form */}
          <Card className="w-full col-span-1 lg:col-span-2 overflow-hidden shadow-lg border-[#fc5d41]/10">
            <CardContent className="p-0">
              <div className="p-6 md:p-8">
                {children}
              </div>
            </CardContent>
          </Card>

          {/* Sidebar */}
          {sidebar && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:sticky lg:top-8 space-y-6"
            >
              {sidebar}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="container mt-10">
        <div className="text-sm text-gray-600 dark:text-gray-300 text-center">
          <p>© {new Date().getFullYear()} سطوكيها. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationLayout;
