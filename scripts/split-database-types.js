#!/usr/bin/env node

/**
 * 🚀 سكربت ذكي لتقسيم ملف database.types.ts الضخم
 * يقوم بتحليل الملف وتقسيمه إلى ملفات منطقية منفصلة
 */

import fs from 'fs';
import path from 'path';

const INPUT_FILE = 'src/types/database.types.ts';
const OUTPUT_DIR = 'src/types/database';

// 📋 تصنيف الجداول حسب الوظيفة
const TABLE_CATEGORIES = {
  core: [
    'organizations', 'users', 'user_settings', 'user_sessions', 'user_security_settings',
    'organization_settings', 'settings_audit_log', 'password_change_logs',
    'verification_codes', 'trusted_devices', 'privacy_settings'
  ],
  
  products: [
    'products', 'product_colors', 'product_sizes', 'product_images', 'product_categories',
    'product_subcategories', 'product_reviews', 'product_advanced_settings',
    'product_marketing_settings', 'product_media', 'product_deletion_attempts',
    'product_wholesale_tiers'
  ],
  
  orders: [
    'orders', 'order_items', 'order_cancellations', 'order_distribution_history',
    'order_distribution_settings', 'online_orders', 'online_order_items',
    'abandoned_carts', 'abandoned_cart_reminders', 'abandoned_carts_stats'
  ],
  
  customers: [
    'customers', 'guest_customers', 'customer_testimonials', 'addresses',
    'call_confirmation_statuses', 'call_logs'
  ],
  
  payments: [
    'payment_methods', 'transactions', 'invoices', 'invoice_items',
    'currency_balances', 'currency_sales', 'digital_currencies',
    'flexi_balances', 'flexi_networks', 'flexi_sales'
  ],
  
  inventory: [
    'inventory_log', 'inventory_logs', 'inventory_transactions',
    'supplier_contacts', 'supplier_payments', 'supplier_purchase_items',
    'supplier_purchases', 'supplier_ratings', 'suppliers'
  ],
  
  pos: [
    'pos_settings'
  ],
  
  shipping: [
    'shipping_orders', 'shipping_provider_clones', 'shipping_provider_settings',
    'shipping_providers', 'shipping_rates', 'shipping_clone_prices',
    'yalidine_centers', 'yalidine_centers_global', 'yalidine_fees',
    'yalidine_global_info', 'yalidine_municipalities', 'yalidine_municipalities_global',
    'yalidine_provinces', 'yalidine_provinces_global'
  ],
  
  marketing: [
    'landing_pages', 'landing_page_components', 'landing_page_submissions',
    'conversion_events', 'conversion_event_queue', 'conversion_settings_cache',
    'custom_pages', 'form_settings', 'thank_you_templates'
  ],
  
  analytics: [
    'performance_metrics', 'beforeafter_performance_metrics', 'debug_logs',
    'employee_activities', 'employee_distribution_stats', 'stats_refresh_log'
  ],
  
  subscriptions: [
    'subscription_plans', 'subscription_services', 'subscription_settings',
    'subscription_history', 'organization_subscriptions', 'activation_codes',
    'activation_code_batches'
  ],
  
  apps: [
    'courses', 'course_sections', 'course_lessons', 'course_attachments',
    'course_notes', 'course_quizzes', 'user_course_progress', 'user_quiz_results',
    'repair_orders', 'repair_images', 'repair_locations', 'repair_status_history',
    'service_bookings', 'service_progress', 'services'
  ],
  
  cms: [
    'super_pages', 'super_themes', 'super_custom_components', 'super_edit_history',
    'super_global_styles', 'super_media_library', 'super_page_analytics',
    'super_section_templates'
  ],
  
  seo: [
    'seo_cache', 'seo_crawl_log', 'seo_keywords', 'seo_page_meta',
    'seo_performance_metrics', 'seo_redirects', 'seo_robots_rules',
    'seo_settings', 'seo_sitemap_entries', 'seo_structured_data'
  ],
  
  system: [
    '_rls_backup', 'migrations_log', 'deleted_files', 'security_logs',
    'domain_verifications', 'distribution_rules', 'employee_salaries',
    'expense_categories', 'expenses', 'recurring_expenses', 'lists',
    'todos', 'whatsapp_messages', 'whatsapp_templates', 'wholesale_tiers',
    'organization_templates', 'beforeafter_images'
  ]
};

// 🔍 تحليل الملف واستخراج تعريفات الجداول
function parseTableDefinition(content, tableName) {
  const tablePattern = new RegExp(
    `(\\s+${tableName}:\\s*\\{[\\s\\S]*?\\n\\s+\\})(?=\\n\\s+[a-z_]+:\\s*\\{|\\n\\s+\\}\\s*Views:|$)`,
    'gm'
  );
  
  const match = content.match(tablePattern);
  return match ? match[0] : null;
}

// 📁 إنشاء ملف لفئة معينة
function createCategoryFile(category, tables, content) {
  const imports = `export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

`;

  let tableDefinitions = '';
  let foundTables = [];
  
  for (const tableName of tables) {
    const definition = parseTableDefinition(content, tableName);
    if (definition) {
      tableDefinitions += definition + '\n';
      foundTables.push(tableName);
    }
  }
  
  if (foundTables.length === 0) {
    return;
  }
  
  const fileContent = `${imports}
export type ${category.charAt(0).toUpperCase() + category.slice(1)}Tables = {
${tableDefinitions}
}

// 📊 الجداول المتاحة في هذه الفئة
export const ${category}TableNames = [
${foundTables.map(name => `  '${name}'`).join(',\n')}
] as const;

export type ${category.charAt(0).toUpperCase() + category.slice(1)}TableName = typeof ${category}TableNames[number];
`;

  const filePath = path.join(OUTPUT_DIR, `${category}.ts`);
  fs.writeFileSync(filePath, fileContent);
  
  return foundTables;
}

// 📋 إنشاء ملف الفهرس الرئيسي
function createIndexFile(categorizedTables) {
  const imports = Object.keys(categorizedTables)
    .map(category => `export * from './${category}';`)
    .join('\n');
    
  const allTablesExport = `
// 🔧 تجميع جميع الأنواع
export type DatabaseTables = 
${Object.keys(categorizedTables).map(category => 
  `  ${category.charAt(0).toUpperCase() + category.slice(1)}Tables`
).join(' &\n')};

// 📈 إحصائيات التقسيم
export const tableStatistics = {
${Object.entries(categorizedTables).map(([category, tables]) => 
  `  ${category}: ${tables.length}`
).join(',\n')}
};

export const totalTables = ${Object.values(categorizedTables).flat().length};
`;

  const indexContent = `${imports}
${allTablesExport}
`;

  const indexPath = path.join(OUTPUT_DIR, 'index.ts');
  fs.writeFileSync(indexPath, indexContent);
  
}

// 🚀 الدالة الرئيسية
function main() {
  
  // التحقق من وجود الملف
  if (!fs.existsSync(INPUT_FILE)) {
    process.exit(1);
  }
  
  // إنشاء مجلد الإخراج
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // قراءة محتوى الملف
  const content = fs.readFileSync(INPUT_FILE, 'utf-8');
  
  // تقسيم الجداول حسب الفئات
  const categorizedTables = {};
  let totalProcessed = 0;
  
  for (const [category, tables] of Object.entries(TABLE_CATEGORIES)) {
    const processedTables = createCategoryFile(category, tables, content);
    if (processedTables && processedTables.length > 0) {
      categorizedTables[category] = processedTables;
      totalProcessed += processedTables.length;
    }
  }
  
  // إنشاء ملف الفهرس
  createIndexFile(categorizedTables);
  
  // 📊 عرض الإحصائيات
  
  Object.entries(categorizedTables).forEach(([category, tables]) => {
  });

  const originalSize = fs.statSync(INPUT_FILE).size;
  const newTotalSize = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.endsWith('.ts'))
    .reduce((total, file) => {
      return total + fs.statSync(path.join(OUTPUT_DIR, file)).size;
    }, 0);

}

// تشغيل السكربت
main();
