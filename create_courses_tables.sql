-- جداول نظام الدورات التدريبية

-- جدول الدورات الرئيسية
CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول الأقسام
CREATE TABLE IF NOT EXISTS course_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, slug)
);

-- جدول الدروس
CREATE TABLE IF NOT EXISTS course_lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT, -- محتوى الدرس النصي
  video_url TEXT, -- رابط الفيديو (Vimeo, Vadoo, etc.)
  video_type VARCHAR(50), -- نوع الفيديو (vimeo, vadoo, youtube, etc.)
  duration INTEGER, -- مدة الدرس بالدقائق
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_free BOOLEAN DEFAULT false, -- هل الدرس مجاني
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(section_id, slug)
);

-- جدول الملفات والمرفقات
CREATE TABLE IF NOT EXISTS course_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50), -- pdf, docx, xlsx, etc.
  file_size INTEGER, -- حجم الملف بالبايت
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول تقدم المستخدمين
CREATE TABLE IF NOT EXISTS user_course_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  completed_at TIMESTAMPTZ,
  last_watched_at TIMESTAMPTZ,
  watch_time INTEGER DEFAULT 0, -- الوقت المشاهد بالثواني
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- جدول الملاحظات
CREATE TABLE IF NOT EXISTS course_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamp INTEGER, -- الوقت في الفيديو بالثواني
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول الأسئلة والتمارين
CREATE TABLE IF NOT EXISTS course_quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  questions JSONB NOT NULL, -- أسئلة الاختبار بصيغة JSON
  passing_score INTEGER DEFAULT 70,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول نتائج الاختبارات
CREATE TABLE IF NOT EXISTS user_quiz_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES course_quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  answers JSONB NOT NULL, -- إجابات المستخدم
  passed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء الفهارس
CREATE INDEX idx_course_sections_course_id ON course_sections(course_id);
CREATE INDEX idx_course_lessons_section_id ON course_lessons(section_id);
CREATE INDEX idx_course_attachments_lesson_id ON course_attachments(lesson_id);
CREATE INDEX idx_user_course_progress_user_id ON user_course_progress(user_id);
CREATE INDEX idx_user_course_progress_lesson_id ON user_course_progress(lesson_id);
CREATE INDEX idx_course_notes_user_id_lesson_id ON course_notes(user_id, lesson_id);

-- إنشاء الـ RLS policies
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_results ENABLE ROW LEVEL SECURITY;

-- سياسات للـ Super Admin فقط
CREATE POLICY "Super admins can manage courses" ON courses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_super_admin = true
    )
  );

CREATE POLICY "Super admins can manage sections" ON course_sections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_super_admin = true
    )
  );

CREATE POLICY "Super admins can manage lessons" ON course_lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_super_admin = true
    )
  );

CREATE POLICY "Super admins can manage attachments" ON course_attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_super_admin = true
    )
  );

CREATE POLICY "Super admins can manage quizzes" ON course_quizzes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_super_admin = true
    )
  );

-- سياسات للمستخدمين
CREATE POLICY "Users can view active courses" ON courses
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view active sections" ON course_sections
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view active lessons" ON course_lessons
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view attachments" ON course_attachments
  FOR SELECT USING (true);

CREATE POLICY "Users can view active quizzes" ON course_quizzes
  FOR SELECT USING (is_active = true);

-- سياسات التقدم والملاحظات
CREATE POLICY "Users can manage their own progress" ON user_course_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own notes" ON course_notes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own quiz results" ON user_quiz_results
  FOR ALL USING (auth.uid() = user_id);

-- دالة تحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء الـ triggers
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_sections_updated_at BEFORE UPDATE ON course_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_lessons_updated_at BEFORE UPDATE ON course_lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_course_progress_updated_at BEFORE UPDATE ON user_course_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_notes_updated_at BEFORE UPDATE ON course_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_quizzes_updated_at BEFORE UPDATE ON course_quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- إدراج البيانات الأولية للدورات
INSERT INTO courses (title, slug, description, icon, color, order_index) VALUES
  ('التسويق الإلكتروني', 'digital-marketing', 'دورة شاملة في التسويق الإلكتروني', 'TrendingUp', 'bg-blue-500', 1),
  ('التجارة الإلكترونية', 'ecommerce', 'دورة شاملة في التجارة الإلكترونية', 'ShoppingCart', 'bg-green-500', 2),
  ('TikTok Ads', 'tiktok-ads', 'دورة متخصصة في إعلانات TikTok', 'Video', 'bg-purple-500', 3),
  ('بناء متجر إلكتروني', 'store-building', 'دورة بناء متجر إلكتروني باستخدام ستوكيها', 'Store', 'bg-orange-500', 4);

-- دالة للحصول على إحصائيات الدورة
CREATE OR REPLACE FUNCTION get_course_stats(p_course_id UUID)
RETURNS TABLE (
  total_sections INTEGER,
  total_lessons INTEGER,
  total_duration INTEGER,
  total_students INTEGER,
  completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT cs.id)::INTEGER as total_sections,
    COUNT(DISTINCT cl.id)::INTEGER as total_lessons,
    COALESCE(SUM(cl.duration), 0)::INTEGER as total_duration,
    COUNT(DISTINCT ucp.user_id)::INTEGER as total_students,
    CASE 
      WHEN COUNT(DISTINCT cl.id) > 0 THEN
        ROUND((COUNT(DISTINCT CASE WHEN ucp.is_completed THEN ucp.lesson_id END)::NUMERIC / COUNT(DISTINCT cl.id)) * 100, 2)
      ELSE 0
    END as completion_rate
  FROM course_sections cs
  LEFT JOIN course_lessons cl ON cs.id = cl.section_id
  LEFT JOIN user_course_progress ucp ON cl.id = ucp.lesson_id
  WHERE cs.course_id = p_course_id;
END;
$$ LANGUAGE plpgsql;

-- دالة للحصول على تقدم المستخدم في الدورة
CREATE OR REPLACE FUNCTION get_user_course_progress(p_user_id UUID, p_course_id UUID)
RETURNS TABLE (
  completed_lessons INTEGER,
  total_lessons INTEGER,
  progress_percentage NUMERIC,
  last_activity TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH course_lessons_count AS (
    SELECT COUNT(DISTINCT cl.id) as total
    FROM course_sections cs
    JOIN course_lessons cl ON cs.id = cl.section_id
    WHERE cs.course_id = p_course_id
  ),
  user_progress AS (
    SELECT 
      COUNT(DISTINCT ucp.lesson_id) FILTER (WHERE ucp.is_completed) as completed,
      MAX(ucp.last_watched_at) as last_activity
    FROM course_sections cs
    JOIN course_lessons cl ON cs.id = cl.section_id
    LEFT JOIN user_course_progress ucp ON cl.id = ucp.lesson_id AND ucp.user_id = p_user_id
    WHERE cs.course_id = p_course_id
  )
  SELECT 
    COALESCE(up.completed, 0)::INTEGER,
    clc.total::INTEGER,
    CASE 
      WHEN clc.total > 0 THEN ROUND((COALESCE(up.completed, 0)::NUMERIC / clc.total) * 100, 2)
      ELSE 0
    END,
    up.last_activity
  FROM course_lessons_count clc
  CROSS JOIN user_progress up;
END;
$$ LANGUAGE plpgsql;