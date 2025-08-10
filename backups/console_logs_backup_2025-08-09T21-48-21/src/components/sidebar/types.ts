import { EmployeePermissions } from '@/types/employee';
import { LucideIcon } from 'lucide-react';

// اسم مفتاح التخزين للمجموعة النشطة
export const ACTIVE_GROUP_STORAGE_KEY = 'activeMenuGroup';

// تعريف نوع بيانات عنصر التنقل
export interface NavItem {
  title: string;
  icon: any;
  href: string;
  requiredPermission: string | null;
  badge: string | null;
}

// تعريف نوع بيانات مجموعة التنقل
export interface NavGroup {
  group: string;
  icon: any;
  requiredPermission: string | null;
  badge?: string | null;
  items: NavItem[];
}

// تمديد واجهة المستخدم لتشمل البيانات الشخصية
export interface User {
  id: string;
  email: string;
  displayName?: string;
  profileImage?: string;
  role?: string;
}

// تعريف خصائص مكون القائمة الجانبية
export interface SideMenuProps {
  userRole: string;
  userPermissions: Record<string, boolean> | null;
}

// تعريف خصائص عنصر التنقل
export interface NavigationItemProps {
  item: NavItem;
  isActive: boolean;
  isInPopup?: boolean;
}

// تعريف خصائص مكون مجموعة التنقل
export interface NavigationGroupProps {
  group: NavGroup;
  isAdmin: boolean;
  permissions: Record<string, boolean>;
  isGroupActive: boolean;
  hasActiveItem: boolean;
  currentPath: string;
  toggleGroup: (group: string) => void;
  isCollapsed: boolean;
}
