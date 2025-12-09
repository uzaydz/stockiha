import React from 'react';
import { LayoutDashboard, Settings, Users, CircleDollarSign, ShoppingCart, BookOpen, KeyRound, DatabaseZap, Search, GraduationCap, FileText, Gift, Trophy, History, Star, UserCheck } from 'lucide-react';

// تعريف نوع رابط القائمة الجانبية
export interface SidebarLink {
  name: string;
  href: string;
  icon: React.ReactNode;
}

// روابط القائمة الجانبية للمسؤول الرئيسي
export const SuperAdminSidebarLinks: SidebarLink[] = [
  {
    name: "لوحة التحكم",
    href: "/super-admin",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    name: "المستخدمون",
    href: "/super-admin/users",
    icon: <Users className="h-5 w-5" />,
  },
  {
    name: "الاشتراكات",
    href: "/super-admin/subscriptions",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    name: "طلبات الاشتراك",
    href: "/super-admin/subscription-requests",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    name: "أكواد التفعيل",
    href: "/super-admin/activation-codes",
    icon: <KeyRound className="h-5 w-5" />,
  },
  {
    name: "المنتجات",
    href: "/super-admin/products",
    icon: <ShoppingCart className="h-5 w-5" />,
  },
  {
    name: "مزامنة ياليدين",
    href: "/super-admin/yalidine-sync",
    icon: <DatabaseZap className="h-5 w-5" />,
  },
  {
    name: "طرق الدفع",
    href: "/super-admin/payment-methods",
    icon: <CircleDollarSign className="h-5 w-5" />,
  },
  {
    name: "SEO والأرشفة",
    href: "/super-admin/seo",
    icon: <Search className="h-5 w-5" />,
  },
  {
    name: "الدورات التدريبية",
    href: "/super-admin/courses",
    icon: <GraduationCap className="h-5 w-5" />,
  },
  {
    name: "الإعدادات",
    href: "/super-admin/settings",
    icon: <Settings className="h-5 w-5" />,
  }
];

// روابط نظام الإحالات للمسؤول الرئيسي
export const ReferralAdminSidebarLinks: SidebarLink[] = [
  {
    name: "لوحة الإحالات",
    href: "/super-admin/referrals",
    icon: <Gift className="h-5 w-5" />,
  },
  {
    name: "المُحيلين",
    href: "/super-admin/referrals/referrers",
    icon: <UserCheck className="h-5 w-5" />,
  },
  {
    name: "طلبات الاستبدال",
    href: "/super-admin/referrals/redemptions",
    icon: <Gift className="h-5 w-5" />,
  },
  {
    name: "المكافآت",
    href: "/super-admin/referrals/rewards",
    icon: <Star className="h-5 w-5" />,
  },
  {
    name: "المستويات",
    href: "/super-admin/referrals/tiers",
    icon: <Trophy className="h-5 w-5" />,
  },
  {
    name: "سجل المعاملات",
    href: "/super-admin/referrals/transactions",
    icon: <History className="h-5 w-5" />,
  },
];
