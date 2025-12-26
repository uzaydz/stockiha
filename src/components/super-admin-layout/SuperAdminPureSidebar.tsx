import React, { memo, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    Settings,
    Users,
    CircleDollarSign,
    ShoppingCart,
    BookOpen,
    KeyRound,
    DatabaseZap,
    Search,
    GraduationCap,
    FileText,
    Gift,
    Trophy,
    History,
    Star,
    UserCheck,
    Building2,
    ChevronLeft,
    ChevronRight,
    Lightbulb
} from 'lucide-react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import './SuperAdminPureSidebar.css';

// --- Local Tooltip Implementation (with Portal) ---
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
    React.ElementRef<typeof TooltipPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
    <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
                "z-[9999] overflow-hidden rounded-lg bg-slate-900 px-3 py-2 text-sm text-white shadow-lg border border-slate-700/50 animate-in fade-in-0 zoom-in-95",
                className
            )}
            {...props}
        />
    </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export interface SuperAdminSidebarItem {
    id: string;
    title: string;
    icon?: React.ComponentType<{ className?: string }>;
    className?: string;
    href: string;
    badge?: string | number;
    category?: string;
}

// --- Premium Sidebar Item Component ---
const SidebarItem = memo<{
    item: SuperAdminSidebarItem;
    isActive: boolean;
    isExpanded: boolean;
}>(({ item, isActive, isExpanded }) => {
    const Icon = item.icon;

    const linkContent = (
        <Link
            to={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
                'group relative flex items-center rounded-xl mb-2 transition-all duration-300 ease-out',
                isExpanded ? 'px-4 py-3 gap-3' : 'p-3 justify-center',
                isActive
                    ? 'bg-gradient-to-r from-orange-500/90 to-orange-600/90 text-white shadow-lg shadow-orange-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
            )}
        >
            {/* Active State Glow & Highlight */}
            {isActive && (
                <>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent opacity-50 pointer-events-none" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full shadow-lg" />
                </>
            )}

            {/* Icon */}
            {Icon && (
                <div className={cn(
                    "relative z-10 transition-transform duration-300",
                    !isExpanded && "w-6 h-6 flex items-center justify-center",
                    isActive ? "scale-110" : "group-hover:scale-110"
                )}>
                    <Icon className={cn("transition-all duration-300", isExpanded ? "w-5 h-5" : "w-6 h-6")} />
                </div>
            )}

            {/* Title (only when expanded) */}
            {isExpanded && (
                <span className={cn(
                    "text-[13px] font-medium whitespace-nowrap relative z-10 transition-all duration-300",
                    isActive ? "font-bold tracking-wide" : "group-hover:translate-x-1"
                )}>
                    {item.title}
                </span>
            )}

            {isExpanded && item.badge && (
                <span className={cn(
                    "mr-auto px-2 py-0.5 text-[10px] font-bold rounded-full relative z-10 shadow-sm",
                    isActive ? "bg-white/20 text-white" : "bg-orange-500/20 text-orange-400 border border-orange-500/20"
                )}>
                    {item.badge}
                </span>
            )}

            {/* Badge dot in collapsed mode */}
            {!isExpanded && item.badge && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border border-[#0f1419] z-20" />
            )}
        </Link>
    );

    if (!isExpanded) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    {linkContent}
                </TooltipTrigger>
                <TooltipContent
                    side="right"
                    className="bg-slate-900 text-white border-slate-700/50 shadow-2xl"
                >
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{item.title}</span>
                        {item.badge && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-orange-500/20 text-orange-400 rounded-full border border-orange-500/30">
                                {item.badge}
                            </span>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        );
    }

    return linkContent;
});

SidebarItem.displayName = 'SidebarItem';

// --- Sidebar Items Data ---
export const superAdminSidebarItems: SuperAdminSidebarItem[] = [
    // 1. Core Dashboard
    {
        id: 'dashboard',
        title: 'لوحة التحكم',
        icon: LayoutDashboard,
        href: '/super-admin',
        category: 'main',
    },

    // 2. User & Organization Management
    {
        id: 'users',
        title: 'المستخدمون',
        icon: Users,
        href: '/super-admin/users',
        category: 'management',
    },
    {
        id: 'organizations',
        title: 'المؤسسات',
        icon: Building2,
        href: '/super-admin/organizations',
        category: 'management',
    },

    // 3. Subscription Management
    {
        id: 'subscriptions',
        title: 'الاشتراكات',
        icon: BookOpen,
        href: '/super-admin/subscriptions',
        category: 'subscriptions',
    },
    {
        id: 'subscription-requests',
        title: 'طلبات الاشتراك',
        icon: FileText,
        href: '/super-admin/subscription-requests',
        badge: 'جديد',
        category: 'subscriptions',
    },
    {
        id: 'activation-codes',
        title: 'أكواد التفعيل',
        icon: KeyRound,
        href: '/super-admin/activation-codes',
        category: 'subscriptions',
    },

    // 4. Referral System
    {
        id: 'referrals',
        title: 'نظام الإحالات',
        icon: Gift,
        href: '/super-admin/referrals',
        category: 'referrals',
    },
    {
        id: 'referrers',
        title: 'المُحيلين',
        icon: UserCheck,
        href: '/super-admin/referrals/referrers',
        category: 'referrals',
    },
    {
        id: 'rewards',
        title: 'المكافآت',
        icon: Star,
        href: '/super-admin/referrals/rewards',
        category: 'referrals',
    },
    {
        id: 'tiers',
        title: 'المستويات',
        icon: Trophy,
        href: '/super-admin/referrals/tiers',
        category: 'referrals',
    },

    // 5. Product & System
    {
        id: 'products',
        title: 'المنتجات',
        icon: ShoppingCart,
        href: '/super-admin/products',
        category: 'system',
    },
    {
        id: 'yalidine-sync',
        title: 'مزامنة ياليدين',
        icon: DatabaseZap,
        href: '/super-admin/yalidine-sync',
        category: 'system',
    },
    {
        id: 'payment-methods',
        title: 'طرق الدفع',
        icon: CircleDollarSign,
        href: '/super-admin/payment-methods',
        category: 'system',
    },

    // 6. SEO & Content
    {
        id: 'seo',
        title: 'SEO والأرشفة',
        icon: Search,
        href: '/super-admin/seo',
        category: 'content',
    },
    {
        id: 'courses',
        title: 'الدورات التدريبية',
        icon: GraduationCap,
        href: '/super-admin/courses',
        category: 'content',
    },
    {
        id: 'feature-suggestions',
        title: 'اقتراحات الميزات',
        icon: Lightbulb,
        href: '/super-admin/feature-suggestions',
        badge: 'جديد',
        category: 'content',
    },

    // 7. Settings
    {
        id: 'settings',
        title: 'الإعدادات',
        icon: Settings,
        href: '/super-admin/settings',
        category: 'settings',
    },
];

interface SuperAdminPureSidebarProps {
    className?: string;
    items?: SuperAdminSidebarItem[];
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

const SuperAdminPureSidebar: React.FC<SuperAdminPureSidebarProps> = memo(({
    className,
    items,
    isExpanded = true,
    onToggleExpand
}) => {
    const location = useLocation();

    const sidebarItems = useMemo(() => items ?? superAdminSidebarItems, [items]);

    const isPathActive = useCallback((href: string): boolean => {
        if (href === '/super-admin') {
            return location.pathname === '/super-admin' || location.pathname === '/super-admin/';
        }
        return location.pathname.startsWith(href);
    }, [location.pathname]);

    return (
        <TooltipProvider delayDuration={0}>
            <div
                className={cn(
                    "super-admin-pure-sidebar h-full flex flex-col",
                    "bg-gradient-to-b from-[#0f1419] via-[#0d1117] to-[#050b15]",
                    "border-l border-slate-800/50",
                    className
                )}
            >
                {/* Header with Toggle */}
                <div className={cn(
                    "flex items-center border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm",
                    isExpanded ? "justify-between px-4 py-3" : "justify-center py-3"
                )}>
                    {isExpanded && (
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                                <LayoutDashboard className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-bold text-white">سوبر أدمين</span>
                        </div>
                    )}
                    {onToggleExpand && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleExpand}
                            className={cn(
                                "h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg",
                                !isExpanded && "mx-auto"
                            )}
                        >
                            {isExpanded ? (
                                <ChevronRight className="h-4 w-4" />
                            ) : (
                                <ChevronLeft className="h-4 w-4" />
                            )}
                        </Button>
                    )}
                </div>

                {/* Navigation Items */}
                <nav className={cn(
                    "flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent",
                    isExpanded ? "px-3 py-4" : "px-2 py-4"
                )}>
                    {sidebarItems.map((item) => (
                        <SidebarItem
                            key={item.id}
                            item={item}
                            isActive={isPathActive(item.href)}
                            isExpanded={isExpanded}
                        />
                    ))}
                </nav>
            </div>
        </TooltipProvider>
    );
});

SuperAdminPureSidebar.displayName = 'SuperAdminPureSidebar';

export default SuperAdminPureSidebar;
