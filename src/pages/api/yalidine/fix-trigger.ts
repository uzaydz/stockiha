import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

/**
 * معالج API لإصلاح مشكلة محفز ياليدين
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // التحقق من الجلسة والتصريح
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'غير مصرح بالوصول' 
      });
    }

    // التحقق من طريقة الطلب
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        success: false, 
        message: 'طريقة الطلب غير مدعومة' 
      });
    }

    // تعطيل المحفز باستخدام RPC
    try {
      // استدعاء إجراء SQL لتعطيل المحفز
      const { data, error } = await supabase.rpc(
        'fix_yalidine_redirect_trigger'
      );

      if (error) {
        console.error('فشل في تعطيل المحفز:', error);
        
        // محاولة تنفيذ استعلام SQL مباشر (قد لا يكون مسموحاً به)
        
        try {
          const { data: directData, error: directError } = await supabase.rpc(
            'execute_sql',
            { sql: `
              DO $$
              BEGIN
                IF EXISTS (
                  SELECT 1 FROM pg_trigger t
                  JOIN pg_class c ON t.tgrelid = c.oid
                  WHERE c.relname = 'yalidine_fees'
                  AND t.tgname = 'yalidine_fees_redirect_trigger'
                ) THEN
                  EXECUTE 'ALTER TABLE yalidine_fees DISABLE TRIGGER yalidine_fees_redirect_trigger';
                END IF;
              END $$;
            `}
          );
          
          if (directError) {
            console.error('فشل الاستعلام المباشر أيضاً:', directError);
            return res.status(500).json({
              success: false,
              message: 'فشل تعطيل المحفز - تحقق من أذونات قاعدة البيانات',
              error: error.message,
              directError: directError.message
            });
          }
          
          
          return res.status(200).json({
            success: true,
            message: 'تم تعطيل المحفز بنجاح (باستخدام الاستعلام المباشر)',
            data: directData
          });
        } catch (directSqlError) {
          console.error('فشل في تنفيذ الاستعلام المباشر:', directSqlError);
          return res.status(500).json({
            success: false,
            message: 'فشل تعطيل المحفز - يرجى تنفيذ الاستعلام يدوياً في قاعدة البيانات',
            error: error.message,
            directSqlError: directSqlError instanceof Error ? directSqlError.message : String(directSqlError)
          });
        }
      }

      // التحقق من عدد السجلات
      const { count: feesCount } = await supabase
        .from('yalidine_fees')
        .select('*', { count: 'exact', head: true });

      return res.status(200).json({
        success: true,
        message: 'تم تعطيل المحفز بنجاح',
        data,
        stats: {
          feesCount
        }
      });
    } catch (error) {
      console.error('خطأ في تنفيذ إصلاح محفز ياليدين:', error);
      return res.status(500).json({
        success: false,
        message: 'خطأ في تنفيذ إصلاح المحفز',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    console.error('خطأ غير متوقع:', error);
    return res.status(500).json({
      success: false,
      message: 'خطأ غير متوقع',
      error: error instanceof Error ? error.message : String(error)
    });
  }
} 