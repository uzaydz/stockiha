
import { ReactNode } from 'react';
import Navbar from './Navbar';
import SideMenu from './SideMenu';
import { useShop } from '@/context/ShopContext';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { currentUser } = useShop();
  const isAdmin = currentUser?.role === 'admin';
  const isEmployee = currentUser?.role === 'employee';
  const isStaff = isAdmin || isEmployee;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen flex-col w-full">
        <Navbar />
        <div className="flex flex-1">
          {isStaff && <SideMenu />}
          <SidebarInset className="p-4 md:p-6">
            <div className="flex items-center mb-4">
              <SidebarTrigger className="md:hidden" />
            </div>
            {children}
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
