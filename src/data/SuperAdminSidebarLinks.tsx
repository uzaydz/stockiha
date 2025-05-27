import React from 'react';
import { LayoutDashboard, Settings, Users, CircleDollarSign, ShoppingCart, BookOpen, KeyRound, DatabaseZap } from 'lucide-react';

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
    name: "الإعدادات",
    href: "/super-admin/settings",
    icon: <Settings className="h-5 w-5" />,
  }
];
