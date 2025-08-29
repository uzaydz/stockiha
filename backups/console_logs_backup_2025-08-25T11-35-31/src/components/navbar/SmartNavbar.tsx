import { useLocation } from 'react-router-dom';
import { memo } from 'react';
import { StoreNavbar } from './StoreNavbar';
import { AdminNavbar } from './AdminNavbar';

interface SmartNavbarProps {
  className?: string;
  toggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  isMobile?: boolean;
  organizationSettings?: any;
  hideCategories?: boolean;
}

export function SmartNavbar(props: SmartNavbarProps) {
  const location = useLocation();
  
  // تحديد نوع النافبار بناءً على المسار
  const isAdminPage = location.pathname.startsWith('/dashboard');
  
  if (isAdminPage) {
    return <AdminNavbar {...props} />;
  } else {
    return <StoreNavbar {...props} />;
  }
}

export default memo(SmartNavbar);
