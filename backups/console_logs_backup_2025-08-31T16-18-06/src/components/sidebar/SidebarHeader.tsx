import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Store, 
  User, 
  Settings, 
  LogOut, 
  Sun, 
  Moon, 
  ChevronDown,
  Bell
} from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface SidebarHeaderProps {
  isDarkMode: boolean;
  userProfile: any;
  user: any;
  userRole: string;
  onToggleDarkMode: () => void;
  onLogout: () => void;
}

const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  isDarkMode,
  userProfile,
  user,
  userRole,
  onToggleDarkMode,
  onLogout
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  return (
    <div className={cn(
      "transition-all duration-300 relative sticky top-0 z-10",
      "bg-gradient-to-r from-primary/5 via-transparent to-primary/5",
      "border-b border-sidebar-border/30 backdrop-blur-sm",
      "before:absolute before:inset-0 before:bg-gradient-to-b before:from-transparent before:to-sidebar-background/20 before:pointer-events-none",
      "overflow-visible"
    )}>
      {/* القائمة دائماً موسعة */}
      <div>
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
                whileHover={{ borderColor: 'rgba(59, 130, 246, 0.4)' }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-lg transition-all duration-300"
              >
                <Store className="w-5 h-5 text-primary" />
              </motion.div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent truncate">
                  {userProfile?.store_name || 'متجر سطوكيها'}
                </h1>
                <p className="text-xs text-muted-foreground">
                  لوحة التحكم
                </p>
              </div>
            </div>
            {/* إزالة زر الطي - القائمة دائماً مفتوحة */}
          </motion.div>
          
          {/* قسم معلومات المستخدم */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="p-5 flex items-center gap-4 relative"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="relative cursor-pointer group">
              <motion.div 
                whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }}
                className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center overflow-hidden border-2 border-primary/20 shadow-lg group-hover:border-primary/40 transition-all duration-300"
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
            <div className="flex flex-col flex-1 min-w-0 cursor-pointer">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground truncate">
                  {userProfile?.full_name || user?.email || 'مستخدم المتجر'}
                </p>
                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform duration-300",
                  showUserMenu ? "transform rotate-180" : ""
                )} />
              </div>
              <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  userRole === 'admin' ? "bg-primary" : "bg-blue-500"
                )}></div>
                {userRole === 'admin' ? 'مدير المتجر' : 'موظف'}
              </span>
            </div>
            
            {/* قائمة المستخدم المنسدلة */}
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 left-0 mt-2 mx-4 p-3 bg-card rounded-xl shadow-lg border border-border z-50"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 hover:bg-accent rounded-lg transition-colors cursor-pointer">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">إعدادات الحساب</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 hover:bg-accent rounded-lg transition-colors cursor-pointer">
                      <Bell className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">الإشعارات</span>
                      <div className="ml-auto bg-primary text-primary-foreground text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1">3</div>
                    </div>
                    <div className="border-t border-border my-1"></div>
                    <div 
                      className="flex items-center gap-3 p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors cursor-pointer"
                      onClick={onLogout}
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">تسجيل الخروج</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          
          {/* إزالة زر الطي - القائمة دائماً مفتوحة */}
        </div>
      </div>
    </div>
  );
};

export default SidebarHeader;
