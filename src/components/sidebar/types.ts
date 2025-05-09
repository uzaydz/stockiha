import { EmployeePermissions } from '@/types/employee';
import { LucideIcon } from 'lucide-react';

// تعريف خصائص العنصر في القائمة
export interface NavItem {
  title: string;
  icon: LucideIcon;
  href: string;
  requiredPermission: string | null;
  badge: string | null;
}

// تعريف خصائص المجموعة في القائمة
export interface NavGroup {
  group: string;
  icon: LucideIcon;
  requiredPermission: string | null;
  items: NavItem[];
}

// تعريف خصائص مكون SideMenu
export interface SideMenuProps {
  userRole: string | null;
  userPermissions?: EmployeePermissions | null;
}

// خريطة لتصحيح أسماء الصلاحيات
export const ACTIVE_GROUP_STORAGE_KEY = 'bazaar_active_sidebar_group'; 