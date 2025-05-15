/**
 * سكريبت لتنفيذ استخراج هيكل قاعدة البيانات واستيراد البيانات
 * 
 * يمكن تشغيل هذا السكريبت من سطر الأوامر:
 * ts-node src/scripts/execute-schema-extractor.ts
 */
import { getSupabaseAdmin } from '../lib/supabase-admin';
import * as fs from 'fs';
import * as path from 'path';

// تحديد القاعدة الرئيسية
const MAIN_TABLES = [
  'users',
  'products',
  'product_categories',
  'customers',
  'orders',
  'order_items',
  'transactions',
  'inventory_status',
  'inventory_log',
  'organizations'
];

async function exportDatabaseSchema() {
  try {
    
    
    // التحقق من وجود الدوال المطلوبة
    const supabase = getSupabaseAdmin();
    
    // التحقق مما إذا كانت وظيفة get_complete_db_schema موجودة
    
    const { data: functionExists, error: functionError } = await supabase.rpc('check_function_exists', {
      function_name: 'get_complete_db_schema'
    });
    
    if (functionError) {
      console.error('خطأ في التحقق من وجود الدالة:', functionError);
      
      
      // قراءة ملف SQL وتنفيذه
      const sqlFilePath = path.join(__dirname, '../sql/create_complete_schema_extractor.sql');
      
      if (fs.existsSync(sqlFilePath)) {
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        
        // تنفيذ الاستعلام مباشرة
        const { error: createError } = await supabase.rpc('exec_sql', {
          sql_query: sqlContent
        });
        
        if (createError) {
          console.error('خطأ في إنشاء الدالة:', createError);
          return;
        }
        
        
      } else {
        console.error(`ملف SQL غير موجود: ${sqlFilePath}`);
        return;
      }
    } else {
      
    }
    
    // التحقق من وجود دالة get_available_tables
    
    const { data: tablesFunction, error: tablesError } = await supabase.rpc('check_function_exists', {
      function_name: 'get_available_tables'
    });
    
    if (tablesError || !tablesFunction) {
      
      
      const sqlFilePath = path.join(__dirname, '../sql/create_get_available_tables_function.sql');
      
      if (fs.existsSync(sqlFilePath)) {
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        
        // تنفيذ الاستعلام مباشرة
        const { error: createError } = await supabase.rpc('exec_sql', {
          sql_query: sqlContent
        });
        
        if (createError) {
          console.error('خطأ في إنشاء الدالة:', createError);
        } else {
          
        }
      } else {
        console.error(`ملف SQL غير موجود: ${sqlFilePath}`);
      }
    } else {
      
    }
    
    // استخراج هيكل قاعدة البيانات
    
    const { data: schema, error: schemaError } = await supabase.rpc('get_complete_db_schema');
    
    if (schemaError) {
      console.error('خطأ في استخراج هيكل قاعدة البيانات:', schemaError);
      return;
    }
    
    // حفظ هيكل قاعدة البيانات في ملف
    const outputDir = path.join(__dirname, '../../exports');
    
    // التأكد من وجود المجلد
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const schemaFilePath = path.join(outputDir, 'db-schema.sql');
    fs.writeFileSync(schemaFilePath, schema, 'utf8');
    
    // استخراج البيانات من الجداول المحددة
    
    
    for (const table of MAIN_TABLES) {
      
      const { data, error } = await supabase.from(table).select('*');
      
      if (error) {
        console.error(`خطأ في استخراج بيانات جدول ${table}:`, error);
        continue;
      }
      
      if (data && data.length > 0) {
        const dataFilePath = path.join(outputDir, `${table}-data.json`);
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
        
      } else {
        
      }
    }
    
    
    
    
    return { success: true };
  } catch (error) {
    console.error('حدث خطأ أثناء استخراج هيكل قاعدة البيانات:', error);
    return { success: false, error };
  }
}

// تنفيذ الوظيفة الرئيسية
exportDatabaseSchema()
  .then(result => {
    if (result.success) {
      
    } else {
      console.error('فشل التنفيذ');
    }
  })
  .catch(err => console.error('فشل التنفيذ بسبب خطأ:', err)); 