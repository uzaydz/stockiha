import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  User,
  Palette,
  ShieldCheck,
  Bell,
  Building,
  CreditCard,
  Link2,
  Settings2,
  BookOpen,
  Globe
} from 'lucide-react';

// تعريف نوع البيانات للعلامات التبويب
export interface SettingsTab {
  id: string;
  label: string;
  icon: string;
  description?: string;
}

interface SettingsNavProps {
  tabs: SettingsTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
  enhanced?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  User: <User className="h-4 w-4" />,
  Palette: <Palette className="h-4 w-4" />,
  ShieldCheck: <ShieldCheck className="h-4 w-4" />,
  Bell: <Bell className="h-4 w-4" />,
  Building: <Building className="h-4 w-4" />,
  CreditCard: <CreditCard className="h-4 w-4" />,
  Link2: <Link2 className="h-4 w-4" />,
  Settings2: <Settings2 className="h-4 w-4" />,
  BookOpen: <BookOpen className="h-4 w-4" />,
  Globe: <Globe className="h-4 w-4" />
};

// متغيرات الحركة
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 }
};

const SettingsNav: React.FC<SettingsNavProps> = ({
  tabs,
  activeTab,
  onTabChange,
  enhanced = false
}) => {
  const getTabBadge = (tabId: string) => {
    switch (tabId) {
      case 'advanced':
        return <Badge variant="secondary" className="text-xs mr-1 scale-75">متقدم</Badge>;
      case 'billing':
        return <Badge variant="outline" className="text-xs mr-1 scale-75">جديد</Badge>;
      default:
        return null;
    }
  };

  return (
    <motion.div 
      className="w-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* التصميم الأفقي للهاتف والتابلت */}
      <div className="block lg:hidden">
        <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            
            return (
              <motion.div key={tab.id} variants={itemVariants}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'relative flex-shrink-0 px-3 py-2 h-auto min-w-fit transition-all duration-300',
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                      : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => onTabChange(tab.id)}
                  asChild
                >
                  <Link to={`/dashboard/settings/${tab.id}`}>
                    {/* مؤشر نشط */}
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent rounded-md"
                        layoutId="activeMobileTab"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    
                    <div className="flex items-center gap-1.5 relative z-10">
                      <div className={cn(
                        'transition-all duration-300',
                        isActive ? 'text-primary scale-110' : 'group-hover:scale-105'
                      )}>
                        {iconMap[tab.icon]}
                      </div>
                      
                      <span className={cn(
                        'text-xs font-medium whitespace-nowrap transition-colors duration-300',
                        isActive ? 'text-primary' : ''
                      )}>
                        {tab.label}
                      </span>
                      
                      {getTabBadge(tab.id)}
                    </div>
                    
                    {/* مؤشر سفلي للعنصر النشط */}
                    {isActive && (
                      <motion.div
                        className="absolute bottom-0 left-1/2 w-8 h-0.5 bg-primary rounded-t-full"
                        initial={{ scale: 0, x: "-50%" }}
                        animate={{ scale: 1, x: "-50%" }}
                        transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
                      />
                    )}
                  </Link>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* التصميم الشبكي للحاسوب */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            
            return (
              <motion.div key={tab.id} variants={itemVariants}>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full h-auto p-4 flex flex-col items-start group relative overflow-hidden transition-all duration-300',
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-md'
                      : 'hover:bg-muted/50 hover:shadow-sm text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => onTabChange(tab.id)}
                  asChild
                >
                  <Link to={`/dashboard/settings/${tab.id}`}>
                    {/* خلفية متحركة للعنصر النشط */}
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent"
                        layoutId="activeDesktopTab"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    
                    <div className="w-full relative z-10">
                      {/* الرأس مع الأيقونة والشارات */}
                      <div className="flex items-center justify-between w-full mb-2">
                        <div className={cn(
                          'p-2 rounded-lg transition-all duration-300',
                          isActive 
                            ? 'bg-primary/10 text-primary scale-110' 
                            : 'bg-muted/50 group-hover:bg-muted group-hover:scale-105'
                        )}>
                          {iconMap[tab.icon]}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {getTabBadge(tab.id)}
                        </div>
                      </div>
                      
                      {/* العنوان */}
                      <h3 className={cn(
                        'font-semibold text-sm mb-1 transition-colors duration-300',
                        isActive ? 'text-primary' : 'group-hover:text-foreground'
                      )}>
                        {tab.label}
                      </h3>
                      
                      {/* الوصف */}
                      {tab.description && (
                        <p className={cn(
                          'text-xs leading-relaxed transition-colors duration-300',
                          isActive ? 'text-primary/70' : 'text-muted-foreground'
                        )}>
                          {tab.description}
                        </p>
                      )}
                    </div>
                    
                    {/* مؤشر بصري للعنصر النشط */}
                    {isActive && (
                      <motion.div
                        className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", bounce: 0.6, duration: 0.8 }}
                      />
                    )}
                  </Link>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default SettingsNav;
