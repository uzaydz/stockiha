-- ==========================================
-- 💡 نظام اقتراح الميزات والتصويت
-- ==========================================
-- تاريخ الإنشاء: 2025-01-15
-- الوصف: نظام شامل لإقتراح الميزات والتصويت عليها والتعليق عليها

-- ==========================================
-- 📊 جدول الاقتراحات الرئيسي
-- ==========================================
CREATE TABLE IF NOT EXISTS feature_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- معلومات المؤسسة والمستخدم
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_email TEXT,

    -- معلومات الاقتراح
    title TEXT NOT NULL CHECK (char_length(title) >= 5 AND char_length(title) <= 200),
    description TEXT NOT NULL CHECK (char_length(description) >= 10),
    category TEXT NOT NULL CHECK (category IN ('pos', 'inventory', 'analytics', 'customers', 'products', 'settings', 'other')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

    -- الحالة
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'planned', 'in_progress', 'completed', 'rejected', 'duplicate')),
    status_updated_at TIMESTAMPTZ,
    status_updated_by UUID REFERENCES auth.users(id),
    admin_response TEXT,

    -- إحصائيات التصويت
    votes_count INT DEFAULT 0 CHECK (votes_count >= 0),
    comments_count INT DEFAULT 0 CHECK (comments_count >= 0),

    -- التوقيتات
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- فهرس نصي للبحث
    search_vector tsvector,

    -- صورة اختيارية للتوضيح
    image_url TEXT,

    -- معرّف عام للمشاركة
    public_id TEXT UNIQUE
);

-- ==========================================
-- 🗳️ جدول التصويت
-- ==========================================
CREATE TABLE IF NOT EXISTS feature_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    suggestion_id UUID NOT NULL REFERENCES feature_suggestions(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- نوع التصويت (إيجابي فقط في هذا النظام)
    vote_type TEXT DEFAULT 'upvote' CHECK (vote_type IN ('upvote')),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- ضمان تصويت واحد لكل مستخدم على كل اقتراح
    UNIQUE(suggestion_id, user_id)
);

-- ==========================================
-- 💬 جدول التعليقات
-- ==========================================
CREATE TABLE IF NOT EXISTS feature_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    suggestion_id UUID NOT NULL REFERENCES feature_suggestions(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,

    -- محتوى التعليق
    comment TEXT NOT NULL CHECK (char_length(comment) >= 1 AND char_length(comment) <= 1000),

    -- الردود (تعليق على تعليق)
    parent_comment_id UUID REFERENCES feature_comments(id) ON DELETE CASCADE,

    -- التوقيتات
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- تعديل التعليق
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMPTZ
);

-- ==========================================
-- 📈 جدول الإحصائيات
-- ==========================================
CREATE TABLE IF NOT EXISTS feature_suggestion_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- إحصائيات يومية
    date DATE NOT NULL,

    -- الأعداد
    total_suggestions INT DEFAULT 0,
    pending_suggestions INT DEFAULT 0,
    completed_suggestions INT DEFAULT 0,
    rejected_suggestions INT DEFAULT 0,
    total_votes INT DEFAULT 0,
    total_comments INT DEFAULT 0,
    active_users INT DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, date)
);

-- ==========================================
-- 🔍 الفهارس لتحسين الأداء
-- ==========================================

-- فهارس للبحث السريع
CREATE INDEX idx_suggestions_org ON feature_suggestions(organization_id);
CREATE INDEX idx_suggestions_user ON feature_suggestions(user_id);
CREATE INDEX idx_suggestions_status ON feature_suggestions(status);
CREATE INDEX idx_suggestions_category ON feature_suggestions(category);
CREATE INDEX idx_suggestions_created ON feature_suggestions(created_at DESC);
CREATE INDEX idx_suggestions_votes ON feature_suggestions(votes_count DESC);
CREATE INDEX idx_suggestions_public ON feature_suggestions(public_id) WHERE public_id IS NOT NULL;

-- فهارس التصويت
CREATE INDEX idx_votes_suggestion ON feature_votes(suggestion_id);
CREATE INDEX idx_votes_user ON feature_votes(user_id);
CREATE INDEX idx_votes_org ON feature_votes(organization_id);

-- فهارس التعليقات
CREATE INDEX idx_comments_suggestion ON feature_comments(suggestion_id);
CREATE INDEX idx_comments_user ON feature_comments(user_id);
CREATE INDEX idx_comments_parent ON feature_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_comments_created ON feature_comments(created_at DESC);

-- فهرس البحث النصي
CREATE INDEX idx_suggestions_search ON feature_suggestions USING GIN(search_vector);

-- ==========================================
-- 🔄 Triggers للتحديث التلقائي
-- ==========================================

-- تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_suggestions_updated_at BEFORE UPDATE ON feature_suggestions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON feature_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- تحديث عدد التصويتات تلقائياً
-- ==========================================
CREATE OR REPLACE FUNCTION update_votes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE feature_suggestions
        SET votes_count = votes_count + 1
        WHERE id = NEW.suggestion_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE feature_suggestions
        SET votes_count = GREATEST(0, votes_count - 1)
        WHERE id = OLD.suggestion_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_votes_count_insert AFTER INSERT ON feature_votes
    FOR EACH ROW EXECUTE FUNCTION update_votes_count();

CREATE TRIGGER trigger_votes_count_delete AFTER DELETE ON feature_votes
    FOR EACH ROW EXECUTE FUNCTION update_votes_count();

-- ==========================================
-- تحديث عدد التعليقات تلقائياً
-- ==========================================
CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE feature_suggestions
        SET comments_count = comments_count + 1
        WHERE id = NEW.suggestion_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE feature_suggestions
        SET comments_count = GREATEST(0, comments_count - 1)
        WHERE id = OLD.suggestion_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_comments_count_insert AFTER INSERT ON feature_comments
    FOR EACH ROW EXECUTE FUNCTION update_comments_count();

CREATE TRIGGER trigger_comments_count_delete AFTER DELETE ON feature_comments
    FOR EACH ROW EXECUTE FUNCTION update_comments_count();

-- ==========================================
-- تحديث البحث النصي
-- ==========================================
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('arabic', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('arabic', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.category, '')), 'C');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_search_vector
BEFORE INSERT OR UPDATE ON feature_suggestions
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- ==========================================
-- توليد معرّف عام عشوائي
-- ==========================================
CREATE OR REPLACE FUNCTION generate_public_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.public_id IS NULL THEN
        NEW.public_id := 'FS-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_generate_public_id
BEFORE INSERT ON feature_suggestions
    FOR EACH ROW EXECUTE FUNCTION generate_public_id();

-- ==========================================
-- 🔒 Row Level Security (RLS)
-- ==========================================

-- تفعيل RLS
ALTER TABLE feature_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_suggestion_stats ENABLE ROW LEVEL SECURITY;

-- سياسات الاقتراحات
CREATE POLICY "يمكن للجميع قراءة الاقتراحات في مؤسستهم"
    ON feature_suggestions FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "يمكن للأعضاء إنشاء اقتراحات"
    ON feature_suggestions FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        ) AND user_id = auth.uid()
    );

CREATE POLICY "يمكن للمستخدم تحديث اقتراحاته فقط"
    ON feature_suggestions FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "يمكن للمستخدم حذف اقتراحاته فقط"
    ON feature_suggestions FOR DELETE
    USING (user_id = auth.uid());

-- سياسات التصويت
CREATE POLICY "يمكن للجميع قراءة التصويتات"
    ON feature_votes FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "يمكن للأعضاء التصويت"
    ON feature_votes FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        ) AND user_id = auth.uid()
    );

CREATE POLICY "يمكن للمستخدم إلغاء تصويته"
    ON feature_votes FOR DELETE
    USING (user_id = auth.uid());

-- سياسات التعليقات
CREATE POLICY "يمكن للجميع قراءة التعليقات"
    ON feature_comments FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "يمكن للأعضاء التعليق"
    ON feature_comments FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        ) AND user_id = auth.uid()
    );

CREATE POLICY "يمكن للمستخدم تحديث تعليقاته"
    ON feature_comments FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "يمكن للمستخدم حذف تعليقاته"
    ON feature_comments FOR DELETE
    USING (user_id = auth.uid());

-- سياسات الإحصائيات (قراءة فقط للأعضاء)
CREATE POLICY "يمكن للأعضاء قراءة الإحصائيات"
    ON feature_suggestion_stats FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
    ));

-- ==========================================
-- 📊 Views مفيدة
-- ==========================================

-- عرض الاقتراحات مع معلومات إضافية
CREATE OR REPLACE VIEW feature_suggestions_detailed AS
SELECT
    s.*,
    u.raw_user_meta_data->>'full_name' as user_full_name,
    CASE
        WHEN s.status = 'completed' THEN 5
        WHEN s.status = 'in_progress' THEN 4
        WHEN s.status = 'planned' THEN 3
        WHEN s.status = 'under_review' THEN 2
        ELSE 1
    END as status_order,
    EXISTS(
        SELECT 1 FROM feature_votes
        WHERE suggestion_id = s.id AND user_id = auth.uid()
    ) as user_has_voted
FROM feature_suggestions s
LEFT JOIN auth.users u ON s.user_id = u.id;

-- عرض أفضل الاقتراحات
CREATE OR REPLACE VIEW top_feature_suggestions AS
SELECT * FROM feature_suggestions_detailed
WHERE status IN ('pending', 'under_review', 'planned', 'in_progress')
ORDER BY votes_count DESC, created_at DESC
LIMIT 10;

-- ==========================================
-- ✅ اكتمل إنشاء قاعدة البيانات
-- ==========================================
