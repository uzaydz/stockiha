-- وظيفة لإنشاء مستخدم جديد مع تجاوز سياسات RLS
CREATE OR REPLACE FUNCTION create_user(
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  user_phone TEXT,
  user_role TEXT,
  user_permissions JSONB,
  user_is_active BOOLEAN
) RETURNS VOID AS $$
BEGIN
  INSERT INTO users (id, email, name, phone, role, permissions, is_active, created_at, updated_at)
  VALUES (
    user_id,
    user_email,
    user_name,
    user_phone,
    user_role,
    user_permissions,
    user_is_active,
    NOW(),
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- سياسة عامة للمستخدمين
-- DROP POLICY IF EXISTS "Allow admin insert users" ON users;
-- CREATE POLICY "Allow authenticated users to insert" ON users FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- CREATE POLICY "Allow users to update their own data" ON users FOR UPDATE USING (auth.uid() = id);

-- تعديل سياسات RLS لجدول المستخدمين
DROP POLICY IF EXISTS "Allow admin insert users" ON users;
DROP POLICY IF EXISTS "Allow select own user data" ON users;
DROP POLICY IF EXISTS "Allow admin select all users" ON users;
DROP POLICY IF EXISTS "Allow update own user data" ON users;
DROP POLICY IF EXISTS "Allow admin update all users" ON users;
DROP POLICY IF EXISTS "Allow admin delete users" ON users;

-- إعادة إنشاء السياسات
CREATE POLICY "Allow select own user data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow admin select all users" ON users FOR SELECT USING ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Allow user registration" ON users FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);
CREATE POLICY "Allow update own user data" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow admin update all users" ON users FOR UPDATE USING ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Allow admin delete users" ON users FOR DELETE USING ((auth.jwt() ->> 'role') = 'admin'); 