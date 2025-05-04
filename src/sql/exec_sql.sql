-- دالة SQL لتنفيذ استعلامات SQL مباشرة
-- هذه الدالة يجب أن تستخدم فقط من قبل المسؤولين وفي بيئة آمنة
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS void AS $$
BEGIN
  -- التحقق من صلاحيات المستخدم
  -- يجب أن يكون المستخدم له دور admin
  IF NOT has_role('authenticated') THEN
    RAISE EXCEPTION 'غير مصرح: يجب أن تكون مسجل الدخول';
  END IF;
  
  -- تنفيذ الاستعلام
  EXECUTE sql_query;
  
  RETURN;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'خطأ في تنفيذ الاستعلام: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 