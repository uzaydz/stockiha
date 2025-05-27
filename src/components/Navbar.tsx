import type { Category } from '@/api/store';
import { NavbarMain } from './navbar/NavbarMain';

export interface NavbarProps {
  className?: string;
  toggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  categories?: Category[];
  isMobile?: boolean;
}

const Navbar = ({ 
  className, 
  toggleSidebar, 
  isSidebarOpen, 
  categories, 
  isMobile 
}: NavbarProps) => {
  return (
    <NavbarMain
      className={className}
      toggleSidebar={toggleSidebar}
      isSidebarOpen={isSidebarOpen}
      categories={categories}
      isMobile={isMobile}
    />
  );
};

export default Navbar;
