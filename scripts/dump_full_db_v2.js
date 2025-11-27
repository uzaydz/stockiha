import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// Polyfill fetch for Node environment
if (!global.fetch) {
    global.fetch = fetch;
    global.Headers = fetch.Headers;
    global.Request = fetch.Request;
    global.Response = fetch.Response;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DUMP_DIR = path.resolve(PROJECT_ROOT, 'supabase_dump');

// 1. إعدادات الاتصال بالأونلاين (المصدر)
const SOURCE_URL = 'https://wrnssatuvmumsczyldth.supabase.co';
const SOURCE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY';

if (!fs.existsSync(DUMP_DIR)) {
  fs.mkdirSync(DUMP_DIR, { recursive: true });
}

// 2. استخراج أسماء الجداول من ملف Types بذكاء أكبر
const typesPath = path.resolve(PROJECT_ROOT, 'src/types/database.types.ts');
const typesContent = fs.readFileSync(typesPath, 'utf-8');

const tables = new Set(); // استخدام Set لمنع التكرار

// Regex للبحث عن أسماء الجداول داخل Tables: { ... }
// يبحث عن أي نص متبوع بـ : { ويكون داخل هيكلة Tables
const tablesSection = typesContent.match(/Tables:\s*{[\s\S]*?^\s{4}}/m);

if (tablesSection) {
    const content = tablesSection[0];
    const matches = content.matchAll(/^\s+([a-zA-Z0-9_]+):\s*{/gm);
    for (const match of matches) {
        // استثناء الجداول الداخلية للنظام إذا لزم الأمر
        if (match[1] !== '_rls_backup') {
            tables.add(match[1]);
        }
    }
}

console.log(`📦 Found ${tables.size} tables.`);
console.log('Tables:', Array.from(tables).join(', '));

const supabase = createClient(SOURCE_URL, SOURCE_KEY, {
    auth: { persistSession: false },
    global: {
        fetch: (...args) => fetch(...args)
    }
});

async function dumpTable(tableName) {
    process.stdout.write(`📥 Downloading ${tableName}... `);
    
    let allRows = [];
    let page = 0;
    const pageSize = 1000;
    let hasError = false;
    
    try {
        while (true) {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .range(page * pageSize, (page + 1) * pageSize - 1);
            
            if (error) {
                // بعض الجداول قد تكون Views أو لا نملك صلاحية قراءتها
                if (error.code === '42P01') { // Undefined table
                     process.stdout.write('⚠️ Skipped (Not a table/View)\n');
                } else {
                     process.stdout.write(`❌ Error: ${error.message}\n`);
                     fs.writeFileSync(path.resolve(DUMP_DIR, `${tableName}_ERROR.json`), JSON.stringify({ error }, null, 2));
                }
                hasError = true;
                break;
            }
            
            if (!data || data.length === 0) break;
            
            allRows.push(...data);
            if (data.length < pageSize) break;
            page++;
        }
        
        if (!hasError) {
            process.stdout.write(`✅ ${allRows.length} rows\n`);
            fs.writeFileSync(path.resolve(DUMP_DIR, `${tableName}.json`), JSON.stringify(allRows, null, 2));
        }
        
    } catch (e) {
        console.log(`❌ Exception: ${e.message}`);
    }
}

async function main() {
    console.log(`🚀 Starting Backup to: ${DUMP_DIR}`);
    console.log('-----------------------------------');
    
    for (const table of tables) {
        await dumpTable(table);
    }
    
    console.log('-----------------------------------');
    console.log('✅ Backup Complete!');
}

main().catch(console.error);
