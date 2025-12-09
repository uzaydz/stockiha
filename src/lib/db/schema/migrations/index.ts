/**
 * ⚡ Database Migrations Index
 * فهرس ترحيلات قاعدة البيانات
 */

export { migrate_v43, rollback_v43 } from './v43_unify_schema';

/**
 * ⚡ تشغيل جميع الترحيلات المطلوبة
 */
export async function runMigrations(organizationId: string): Promise<{
    success: boolean;
    appliedMigrations: number[];
    errors: string[];
}> {
    const errors: string[] = [];
    const appliedMigrations: number[] = [];

    console.log('[Migrations] 🚀 Running migrations...');

    try {
        // Migration v43: توحيد Schema مع Supabase
        const { migrate_v43 } = await import('./v43_unify_schema');
        const result43 = await migrate_v43(organizationId);
        if (result43.success) {
            appliedMigrations.push(43);
        } else {
            errors.push(...result43.errors);
        }

        // إضافة migrations مستقبلية هنا...

        console.log(`[Migrations] ✅ Applied ${appliedMigrations.length} migrations`);
        return { success: errors.length === 0, appliedMigrations, errors };

    } catch (error: any) {
        console.error('[Migrations] ❌ Migration runner failed:', error);
        errors.push(error.message);
        return { success: false, appliedMigrations, errors };
    }
}
