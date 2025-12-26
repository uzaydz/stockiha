import React, { useEffect, useState, useCallback, memo, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTitlebar } from '@/context/TitlebarContext';
import { cn } from '@/lib/utils';
import { RotateCw } from 'lucide-react';
import SuperAdminPureSidebar, { SuperAdminSidebarItem, superAdminSidebarItems } from './SuperAdminPureSidebar';
import SuperAdminMobileSidebar from './SuperAdminMobileSidebar';

interface SuperAdminPureLayoutProps {
    children: React.ReactNode;
    onRefresh?: () => void;
    isRefreshing?: boolean;
    executionTime?: number;
    connectionStatus?: 'connected' | 'disconnected' | 'reconnecting';
    sidebarItems?: SuperAdminSidebarItem[];
    disableScroll?: boolean;
}

const SuperAdminPureLayout = memo(function SuperAdminPureLayout({
    children,
    onRefresh,
    isRefreshing = false,
    executionTime,
    connectionStatus = 'connected',
    sidebarItems,
    disableScroll = false
}: SuperAdminPureLayoutProps) {
    const { userProfile } = useAuth();
    const { setActions } = useTitlebar();

    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
        const saved = localStorage.getItem('superAdminSidebarExpanded');
        return saved !== null ? saved === 'true' : true;
    });

    const userRole = userProfile?.role || null;
    const isSuperAdmin = userProfile?.is_super_admin || false;

    // كشف حجم الشاشة
    useEffect(() => {
        const checkScreenSize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) {
                setIsSidebarExpanded(false);
            }
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);

        return () => {
            window.removeEventListener('resize', checkScreenSize);
        };
    }, []);

    // إضافة زر التحديث إلى titlebar actions
    useEffect(() => {
        if (onRefresh) {
            setActions([
                {
                    label: 'تحديث',
                    icon: RotateCw,
                    onClick: onRefresh,
                    variant: 'ghost',
                    isLoading: isRefreshing,
                }
            ]);
        }

        return () => {
            setActions([]);
        };
    }, [onRefresh, isRefreshing, setActions]);

    // معالج فتح/إغلاق السايدبار للجوال
    const toggleMobileSidebar = useCallback(() => {
        setIsMobileSidebarOpen(prev => !prev);
    }, []);

    // معالج توسيع/تصغير القائمة الجانبية
    const toggleSidebarExpand = useCallback(() => {
        setIsSidebarExpanded(prev => {
            const newValue = !prev;
            localStorage.setItem('superAdminSidebarExpanded', String(newValue));
            return newValue;
        });
    }, []);

    // تخطيط الخلفية
    const layoutBackground = 'linear-gradient(135deg, #0f1419 0%, #0d1117 50%, #050b15 100%)';

    // عرض القائمة الجانبية والمحتوى
    const sidebarWidth = isSidebarExpanded ? 'w-64' : 'w-20';
    const contentMargin = isSidebarExpanded ? 'mr-[17rem]' : 'mr-24';

    // عناصر السايدبار
    const gatedSidebarItems = useMemo(() => {
        return sidebarItems ?? superAdminSidebarItems;
    }, [sidebarItems]);

    // تحديد إزاحة السايدبار بناءً على وجود titlebar
    const sidebarOffset = 'var(--titlebar-height, 48px)';

    return (
        <div dir="rtl" className="relative" style={{
            background: layoutBackground,
            height: 'calc(100vh - var(--titlebar-height, 48px))',
            overflow: 'hidden'
        }}>
            <div className="relative h-full w-full" style={{ background: layoutBackground, overflow: 'hidden' }}>
                <div className={cn("relative flex w-full h-full")} style={{ background: layoutBackground }}>

                    {/* القائمة الجانبية للشاشات الكبيرة */}
                    {!isMobile && isSuperAdmin && (
                        <aside
                            className={cn(
                                "fixed z-40 transition-all duration-300 ease-in-out h-full",
                                sidebarWidth
                            )}
                            style={{ top: sidebarOffset, bottom: '1rem' }}
                        >
                            <SuperAdminPureSidebar
                                items={gatedSidebarItems}
                                isExpanded={isSidebarExpanded}
                                onToggleExpand={toggleSidebarExpand}
                            />
                        </aside>
                    )}

                    {/* المحتوى الرئيسي */}
                    <main
                        className={cn(
                            "flex-1 transition-all duration-300 ease-in-out h-full",
                            !isMobile ? contentMargin : "mr-0",
                            disableScroll ? "overflow-hidden" : "overflow-y-auto"
                        )}
                        style={{
                            background: 'transparent',
                            maxHeight: 'calc(100vh - var(--titlebar-height, 48px))'
                        }}
                    >
                        {/* Container أبيض بحواف مدورة */}
                        <div className="relative w-full h-full p-6">
                            <div className="relative w-full h-full bg-white rounded-3xl shadow-2xl border border-slate-200/50 overflow-hidden">
                                {/* Decorative gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-transparent to-orange-50/30 pointer-events-none" />

                                {/* المحتوى */}
                                <div className="relative z-10 w-full h-full overflow-y-auto p-6">
                                    {children}
                                </div>
                            </div>
                        </div>
                    </main>

                    {/* القائمة الجانبية للموبايل */}
                    {isMobile && isSuperAdmin && (
                        <>
                            <SuperAdminMobileSidebar
                                isOpen={isMobileSidebarOpen}
                                onClose={() => setIsMobileSidebarOpen(false)}
                                items={gatedSidebarItems}
                            />

                            {/* زر فتح القائمة للموبايل */}
                            {!isMobileSidebarOpen && (
                                <button
                                    onClick={toggleMobileSidebar}
                                    className="fixed bottom-6 right-6 z-30 bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300"
                                    aria-label="فتح القائمة"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="currentColor"
                                        className="w-6 h-6"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                                        />
                                    </svg>
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* شريط الحالة (اختياري) */}
            {(connectionStatus !== 'connected' || executionTime) && (
                <div className="fixed bottom-4 left-4 z-50 bg-slate-900/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg border border-slate-700/50 shadow-xl">
                    <div className="flex items-center gap-3 text-sm">
                        {connectionStatus !== 'connected' && (
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    connectionStatus === 'reconnecting' ? "bg-yellow-500 animate-pulse" : "bg-red-500"
                                )} />
                                <span className="text-xs">
                                    {connectionStatus === 'reconnecting' ? 'جاري إعادة الاتصال...' : 'غير متصل'}
                                </span>
                            </div>
                        )}
                        {executionTime && (
                            <div className="text-xs text-slate-400">
                                {executionTime.toFixed(0)}ms
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});

SuperAdminPureLayout.displayName = 'SuperAdminPureLayout';

export default SuperAdminPureLayout;
