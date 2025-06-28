import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import fs from 'fs';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // التحقق من طريقة الطلب
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'طريقة غير مسموح بها' });
  }

  // إنشاء عميل Supabase من جانب الخادم
  const supabase = createServerSupabaseClient({ req, res });

  // التحقق من جلسة المستخدم
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({
      error: 'غير مصرح به',
      message: 'يجب تسجيل الدخول للوصول إلى هذه الواجهة',
    });
  }

  // التحقق من أن المستخدم مشرف
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .single();

  if (!userRole || userRole.role !== 'admin') {
    return res.status(403).json({
      error: 'ممنوع',
      message: 'يجب أن تكون مشرفًا للوصول إلى هذه الواجهة',
    });
  }

  try {
    // قراءة ملف SQL
    const sqlFilePath = path.join(process.cwd(), 'src', 'api', 'yalidine', 'global-tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // تقسيم التعليمات SQL وتنفيذها واحدة تلو الأخرى
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);

    const results = [];
    
    // تنفيذ كل أمر SQL على حدة
    for (const command of sqlCommands) {
      const { data, error } = await supabase.rpc('execute_sql', { sql_command: command + ';' });
      
      if (error) {
        results.push({ success: false, command, error: error.message });
      } else {
        results.push({ success: true, command });
      }
    }
    
    // التحقق مما إذا كانت هناك أي أخطاء
    const hasErrors = results.some(result => !result.success);
    
    if (hasErrors) {
      return res.status(500).json({
        success: false,
        message: 'حدثت بعض الأخطاء أثناء إعداد الجداول',
        results
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'تم إنشاء الجداول العالمية بنجاح',
      results
    });
    
  } catch (error: any) {
    
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إعداد الجداول العالمية',
      error: error.message
    });
  }
}
