import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DUMP_DIR = path.resolve(PROJECT_ROOT, 'supabase_dump');

// User provided credentials
const SUPABASE_URL = 'https://wrnssatuvmumsczyldth.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY';

if (!fs.existsSync(DUMP_DIR)) {
  fs.mkdirSync(DUMP_DIR);
}

// 1. Extract Table Names from types file
const typesPath = path.resolve(PROJECT_ROOT, 'src/types/database.types.ts');
const typesContent = fs.readFileSync(typesPath, 'utf-8');

const tables = [];
const views = [];

const lines = typesContent.split('\n');
let inTables = false;
let inViews = false;
let braceCount = 0;

for (const line of lines) {
  // Basic state machine to find Tables and Views sections
  if (line.includes('Tables: {')) {
    inTables = true;
    braceCount = 1;
    continue;
  }
  if (line.includes('Views: {')) {
    inViews = true;
    braceCount = 1;
    continue;
  }

  if (inTables) {
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    braceCount += openBraces - closeBraces;
    
    if (braceCount === 0) {
      inTables = false;
      continue;
    }

    // Match table name: "      tablename: {"
    // The indent is usually 6 spaces or more
    const match = line.match(/^\s{6}([a-zA-Z0-9_]+): \{/);
    if (match && braceCount === 1) {
      tables.push(match[1]);
    }
  }

  if (inViews) {
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    braceCount += openBraces - closeBraces;

    if (braceCount === 0) {
      inViews = false;
      continue;
    }

    const match = line.match(/^\s{6}([a-zA-Z0-9_]+): \{/);
    if (match && braceCount === 1) {
      views.push(match[1]);
    }
  }
}

console.log(`Found ${tables.length} tables and ${views.length} views.`);
console.log('Tables:', tables.join(', '));

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false
    }
});

async function dumpTable(tableName) {
    process.stdout.write(`Dumping ${tableName}... `);
    const allRows = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) {
            console.log('❌ Error');
            console.error(`  Error details:`, error.message);
            fs.writeFileSync(path.resolve(DUMP_DIR, `${tableName}_ERROR.json`), JSON.stringify({ error: error.message }, null, 2));
            break;
        }
        
        if (!data || data.length === 0) break;
        
        allRows.push(...data);
        if (data.length < pageSize) break;
        page++;
    }
    
    console.log(`✅ ${allRows.length} rows`);
    if (allRows.length > 0) {
        fs.writeFileSync(path.resolve(DUMP_DIR, `${tableName}.json`), JSON.stringify(allRows, null, 2));
    }
}

async function main() {
    console.log(`Starting dump to ${DUMP_DIR}`);
    
    console.log('\n--- TABLES ---');
    for (const table of tables) {
        await dumpTable(table);
    }

    console.log('\n--- VIEWS ---');
    for (const view of views) {
        await dumpTable(view);
    }
    
    console.log('\nDone!');
}

main().catch(console.error);
