import React, { memo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { X, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { SuperAdminSidebarItem } from './SuperAdminPureSidebar';
import { toast } from 'sonner';
import './SuperAdminMobileSidebar.css';

interface SuperAdminMobileSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    items: SuperAdminSidebarItem[];
}

// --- Premium Mobile Sidebar Item ---
const MobileSidebarItem = memo<{
    item: SuperAdminSidebarItem;
    isActive: boolean;
    onClose: () => void;
}>(({ item, isActive, onClose }) => {
    const Icon = item.icon;

    return (
        <Link
            to={item.href}
            onClick={onClose}
            className={cn(
                'group relative flex items-center gap-3 p-3 rounded-xl mb-1',
                'transition-all duration-300 ease-out',
                isActive
                    ? 'bg-gradient-to-r from-orange-500/90 to-orange-600/90 text-white shadow-lg shadow-orange-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
            )}
        >
            {/* Active State Glow */}
            {isActive && (
                <>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent opacity-50 pointer-events-none" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full shadow-md" />
                </>
            )}

            {/* Icon */}
            {Icon && (
                <div className={cn(
                    "relative z-10 transition-transform duration-300",
                    isActive ? "scale-110" : "group-hover:scale-110"
                )}>
                    <Icon className="w-5 h-5" />
                </div>
            )}

            {/* Title */}
            <span className={cn(
                "text-sm font-medium whitespace-nowrap relative z-10",
                isActive ? "font-bold" : "group-hover:translate-x-1 transition-transform duration-300"
            )}>
                {item.title}
            </span>

            {/* Badge */}
            {item.badge && (
                <span className={cn(
                    "mr-auto px-2 py-0.5 text-[10px] font-bold rounded-full relative z-10",
                    isActive ? "bg-white/20 text-white" : "bg-orange-500/20 text-orange-400 border border-orange-500/20"
                )}>
                    {item.badge}
                </span>
            )}
        </Link>
    );
});

MobileSidebarItem.displayName = 'MobileSidebarItem';

const SuperAdminMobileSidebar: React.FC<SuperAdminMobileSidebarProps> = memo(({ isOpen, onClose, items }) => {
    const location = useLocation();
    const { signOut, userProfile } = useAuth();

    const isPathActive = useCallback((href: string): boolean => {
        if (href === '/super-admin') {
            return location.pathname === '/super-admin' || location.pathname === '/super-admin/';
        }
        return location.pathname.startsWith(href);
    }, [location.pathname]);

    const handleSignOut = useCallback(async () => {
        try {
            await signOut();
            onClose();
        } catch (error) {
            toast.error('تعذر تسجيل الخروج');
        }
    }, [signOut, onClose]);

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent
                side="right"
                className="super-admin-mobile-sidebar w-[85vw] max-w-[320px] p-0 flex flex-col border-none shadow-2xl"
            >
                {/* --- Header --- */}
                <SheetHeader className="px-4 py-4 border-b border-slate-800/50 relative overflow-hidden">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 bg-gradient-to-br from-[#0d1626] to-[#050b15] rounded-xl flex items-center justify-center border border-slate-700/50 shadow-lg">
                                <img
                                    src="./images/logo-new.webp"
                                    alt="Logo"
                                    className="w-6 h-6 object-contain drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                                />
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-500/20 to-transparent opacity-60 pointer-events-none" />
                            </div>
                            <div className="flex flex-col">
                                <SheetTitle className="text-base font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                                    سطوكيها
                                </SheetTitle>
                                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                    Super Admin
                                </span>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </SheetHeader>

                {/* --- Navigation --- */}
                <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
                    {items.map((item) => (
                        <MobileSidebarItem
                            key={item.id}
                            item={item}
                            isActive={isPathActive(item.href)}
                            onClose={onClose}
                        />
                    ))}
                </nav>

                {/* --- Footer --- */}
                <div className="border-t border-slate-800/50 p-4 bg-slate-900/30 backdrop-blur-sm">
                    {userProfile && (
                        <div className="mb-3 p-3 rounded-lg bg-white/5 border border-slate-800/50">
                            <div className="text-xs text-slate-400 mb-1">مسجل الدخول كـ</div>
                            <div className="text-sm font-medium text-white truncate">
                                {userProfile.email || 'سوبر أدمين'}
                            </div>
                        </div>
                    )}

                    <Button
                        onClick={handleSignOut}
                        variant="ghost"
                        className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
                    >
                        <LogOut className="h-5 w-5" />
                        <span>تسجيل الخروج</span>
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
});

SuperAdminMobileSidebar.displayName = 'SuperAdminMobileSidebar';

export default SuperAdminMobileSidebar;
