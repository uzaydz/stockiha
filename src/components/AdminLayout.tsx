/**
 * قالب الصفحة الخاص بصفحات المسؤول
 */
import React, { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from './Navbar';
import SideMenu from './sidebar/SideMenu';
import { useAuth } from '@/context/AuthContext';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title = 'لوحة التحكم',
}) => {
  const { user } = useAuth();
  
  // تحديد دور المستخدم
  const userRole = user?.user_metadata?.role || 'admin';

  return (
    <>
      <Helmet>
        <title>{title} | stockiha</title>
      </Helmet>

      <div className="flex h-screen overflow-hidden">
        {/* القائمة الجانبية */}
        <SideMenu userRole={userRole} />

        {/* المحتوى الرئيسي */}
        <div className="flex flex-col flex-1 overflow-x-hidden">
          {/* شريط التنقل العلوي */}
          <Navbar />

          {/* محتوى الصفحة */}
          <main className="flex-1 overflow-y-auto pb-10">
            {children}
          </main>
        </div>
      </div>
    </>
  );
};

export default AdminLayout;
