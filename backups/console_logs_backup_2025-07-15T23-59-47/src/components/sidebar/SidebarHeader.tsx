import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Store, 
  User, 
  Settings, 
  LogOut, 
  Sun, 
  Moon, 
  ArrowRightToLine, 
  ArrowLeftToLine 
} from 'lucide-react';

interface SidebarHeaderProps {
  isCollapsed: boolean;
  isDarkMode: boolean;
  isInPOSPage: boolean;
  userProfile: any;
  user: any;
  userRole: string;
  onToggleCollapse: () => void;
  onToggleDarkMode: () => void;
  onLogout: () => void;
}

const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  isCollapsed,
  isDarkMode,
  isInPOSPage,
  userProfile,
  user,
  userRole,
  onToggleCollapse,
  onToggleDarkMode,
  onLogout
}) => {
  return (
    <div className={cn(
      "transition-all duration-300 relative sticky top-0 z-10",
      "bg-gradient-to-r from-primary/5 via-transparent to-primary/5",
      "border-b border-sidebar-border/30 backdrop-blur-sm",
      "before:absolute before:inset-0 before:bg-gradient-to-b before:from-transparent before:to-sidebar-background/20 before:pointer-events-none"
    )}>
      {!isCollapsed ? (
        <div className="flex flex-col relative z-10">
          {/* القسم العلوي مع اسم المتجر والشعار */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="py-5 px-5 flex items-center justify-between border-b border-sidebar-border/20"
          >
            <div className="flex items-center gap-3">
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-lg"
              >
                <Store className="w-5 h-5 text-primary" />
              </motion.div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent truncate">
                  {userProfile?.store_name || 'متجر بازار'}
                </h1>
                <p className="text-xs text-muted-foreground">
                  لوحة التحكم
                </p>
              </div>
            </div>
            {!isInPOSPage && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggleCollapse}
                className={cn(
                  "p-2.5 rounded-xl transition-all duration-300 group",
                  "bg-primary/5 hover:bg-primary/10 border border-primary/10 hover:border-primary/20",
                  "text-primary hover:text-primary hover:scale-105 shadow-sm hover:shadow-md"
                )}
                aria-label="طي القائمة"
              >
                <ArrowRightToLine className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </motion.button>
            )}
          </motion.div>
          
          {/* قسم معلومات المستخدم */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="p-5 flex items-center gap-4"
          >
            <div className="relative">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center overflow-hidden border-2 border-primary/20 shadow-lg"
              >
                {userProfile?.avatar_url ? (
                  <img 
                    src={userProfile.avatar_url} 
                    alt={userProfile?.full_name || 'المستخدم'} 
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <User className="w-7 h-7 text-primary" />
                )}
              </motion.div>
              <motion.span 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -bottom-1 -left-1 w-5 h-5 bg-gradient-to-r from-green-400 to-green-500 border-2 border-sidebar-background rounded-full shadow-sm"
              />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {userProfile?.full_name || user?.email || 'مستخدم المتجر'}
              </p>
              <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  userRole === 'admin' ? "bg-primary" : "bg-blue-500"
                )}></div>
                {userRole === 'admin' ? 'مدير المتجر' : 'موظف'}
              </span>
            </div>
          </motion.div>
          
          {/* شريط أدوات مع أيقونات الوضع المظلم والإعدادات */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="px-5 pb-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggleDarkMode}
                className={cn(
                  "p-2.5 rounded-xl transition-all duration-300 group",
                  "bg-muted/50 hover:bg-accent border border-muted hover:border-accent",
                  "text-muted-foreground hover:text-foreground hover:scale-105 shadow-sm hover:shadow-md"
                )}
                aria-label={isDarkMode ? "وضع الضوء" : "وضع الظلام"}
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 transition-transform group-hover:rotate-180" />
                ) : (
                  <Moon className="w-4 h-4 transition-transform group-hover:-rotate-12" />
                )}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.href = '/dashboard/settings'}
                className={cn(
                  "p-2.5 rounded-xl transition-all duration-300 group",
                  "bg-muted/50 hover:bg-accent border border-muted hover:border-accent",
                  "text-muted-foreground hover:text-foreground hover:scale-105 shadow-sm hover:shadow-md"
                )}
                aria-label="الإعدادات"
              >
                <Settings className="w-4 h-4 transition-transform group-hover:rotate-90" />
              </motion.button>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLogout}
              className={cn(
                "p-2.5 rounded-xl transition-all duration-300 group",
                "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30",
                "border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700",
                "text-red-500 hover:text-red-600 hover:scale-105 shadow-sm hover:shadow-md"
              )}
              aria-label="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </motion.button>
          </motion.div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="p-4 flex flex-col items-center space-y-4"
        >
          <motion.div 
            whileHover={{ scale: 1.1 }}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shadow-lg border-2 border-primary/20"
          >
            {userProfile?.avatar_url ? (
              <img 
                src={userProfile.avatar_url} 
                alt={userProfile?.full_name || 'المستخدم'} 
                className="w-12 h-12 rounded-xl object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-primary" />
            )}
          </motion.div>
          
          <div className="flex flex-row justify-center space-x-2 space-x-reverse">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onToggleDarkMode}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300 group",
                "bg-muted/50 hover:bg-accent border border-muted hover:border-accent",
                "text-muted-foreground hover:text-foreground hover:scale-110 shadow-sm hover:shadow-md"
              )}
              aria-label={isDarkMode ? "وضع الضوء" : "وضع الظلام"}
            >
              {isDarkMode ? (
                <Sun className="w-3.5 h-3.5 transition-transform group-hover:rotate-180" />
              ) : (
                <Moon className="w-3.5 h-3.5 transition-transform group-hover:-rotate-12" />
              )}
            </motion.button>
            
            {!isInPOSPage && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onToggleCollapse}
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300 group",
                  "bg-primary/10 hover:bg-primary/15 border border-primary/20 hover:border-primary/30",
                  "text-primary hover:text-primary hover:scale-110 shadow-sm hover:shadow-md"
                )}
                aria-label="توسيع القائمة"
              >
                <ArrowLeftToLine className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SidebarHeader;
