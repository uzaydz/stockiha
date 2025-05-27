import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import isAdmin from '@/lib/is-admin';
import DatabaseMigrationTool from '@/components/admin/DatabaseMigrationTool';

export const metadata: Metadata = {
  title: 'أدوات قاعدة البيانات | بازار',
  description: 'أدوات إدارة وترحيل قاعدة البيانات',
};

export default async function DatabaseToolsPage() {
  const supabase = createServerComponentClient({ cookies });
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }

  // التحقق من أن المستخدم مسؤول
  const isAdminUser = await isAdmin(supabase);
  
  if (!isAdminUser) {
    redirect('/dashboard');
  }

  return (
    <>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <DatabaseMigrationTool />
      </div>
    </>
  );
}
