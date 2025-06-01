-- إعادة ضبط بيانات محرر المتجر المرئي

-- حذف بيانات الصفحات والقوالب
TRUNCATE TABLE super_pages CASCADE;
TRUNCATE TABLE super_section_templates CASCADE;
TRUNCATE TABLE super_themes CASCADE;
TRUNCATE TABLE super_global_styles CASCADE;
TRUNCATE TABLE super_edit_history CASCADE;
TRUNCATE TABLE super_media_library CASCADE;
TRUNCATE TABLE super_custom_components CASCADE;
TRUNCATE TABLE super_page_analytics CASCADE;

-- تأكيد اكتمال العملية
SELECT 'تم إعادة ضبط بيانات محرر المتجر المرئي بنجاح!' AS result; 