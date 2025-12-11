#!/usr/bin/env python3
"""
تحليل مطابقة Sync Rules مع PowerSync Schema و Supabase
============================================================
هذا السكريبت يقارن:
1. Sync Rules (powersync-sync-rules.yaml)
2. PowerSync Schema (PowerSyncSchema.ts)
3. Supabase Schema (من supabase.ts)
"""

import re
import json
from pathlib import Path
from typing import Dict, List, Set, Tuple

# مسارات الملفات
BASE_DIR = Path(__file__).parent
SYNC_RULES_PATH = BASE_DIR / "powersync-sync-rules.yaml"
SCHEMA_PATH = BASE_DIR / "src/lib/powersync/PowerSyncSchema.ts"
SUPABASE_PATH = BASE_DIR / "src/types/supabase.ts"

def extract_sync_rules_tables(content: str) -> Dict[str, List[str]]:
    """استخراج الجداول والأعمدة من Sync Rules"""
    tables = {}
    lines = content.split('\n')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # البحث عن SELECT statements
        if line.startswith('- SELECT'):
            columns = []
            i += 1
            
            # جمع الأعمدة حتى نصل إلى FROM
            while i < len(lines):
                line = lines[i].strip()
                
                if line.startswith('FROM'):
                    # استخراج اسم الجدول
                    match = re.search(r'FROM\s+(\w+)', line)
                    if match:
                        table_name = match.group(1)
                        # تنظيف الأعمدة
                        clean_columns = []
                        for col in columns:
                            # تقسيم الأعمدة المفصولة بفواصل
                            for c in col.split(','):
                                c = c.strip()
                                if c and not c.startswith('#') and not c.startswith('--'):
                                    clean_columns.append(c)
                        tables[table_name] = clean_columns
                    break
                
                if line and not line.startswith('#') and not line.startswith('WHERE'):
                    columns.append(line)
                
                i += 1
        i += 1
    
    return tables

def extract_powersync_schema(content: str) -> Dict[str, List[str]]:
    """استخراج الجداول من PowerSync Schema"""
    tables = {}
    
    # البحث عن جميع تعريفات الجداول
    pattern = r'const\s+(\w+)\s*=\s*new\s+Table\s*\(\s*\{([^}]+)\}'
    
    matches = re.finditer(pattern, content, re.DOTALL)
    
    for match in matches:
        table_name = match.group(1)
        table_content = match.group(2)
        
        # استخراج الأعمدة
        columns = []
        column_pattern = r'(\w+):\s*column\.\w+'
        
        for col_match in re.finditer(column_pattern, table_content):
            columns.append(col_match.group(1))
        
        # تحويل اسم الجدول إلى snake_case
        snake_name = re.sub(r'(?<!^)(?=[A-Z])', '_', table_name).lower()
        tables[snake_name] = columns
        tables[table_name] = columns  # حفظ الاسم الأصلي أيضاً
    
    return tables

def extract_supabase_schema(content: str) -> Dict[str, List[str]]:
    """استخراج الجداول من Supabase Types"""
    tables = {}
    
    # البحث عن تعريفات الجداول
    pattern = r'(\w+):\s*\{[^}]*Row:\s*\{([^}]+)\}'
    
    matches = re.finditer(pattern, content, re.DOTALL)
    
    for match in matches:
        table_name = match.group(1)
        row_content = match.group(2)
        
        # استخراج الأعمدة
        columns = []
        column_pattern = r'(\w+):\s*(?:string|number|boolean|Json|\w+\s*\|\s*null|\w+\s*\[\]|\w+\s*\[\]\s*\|\s*null)'
        
        for col_match in re.finditer(column_pattern, row_content):
            columns.append(col_match.group(1))
        
        tables[table_name] = columns
    
    return tables

def normalize_column_name(col: str) -> str:
    """تطبيع اسم العمود"""
    return col.strip().lower()

def compare_schemas():
    """المقارنة الرئيسية"""
    print("🔍 بدء التحليل...\n")
    
    # قراءة الملفات
    sync_rules_content = SYNC_RULES_PATH.read_text(encoding='utf-8')
    schema_content = SCHEMA_PATH.read_text(encoding='utf-8')
    supabase_content = SUPABASE_PATH.read_text(encoding='utf-8')
    
    # استخراج البيانات
    sync_rules_tables = extract_sync_rules_tables(sync_rules_content)
    power_sync_tables = extract_powersync_schema(schema_content)
    supabase_tables = extract_supabase_schema(supabase_content)
    
    print(f"📊 إحصائيات:")
    print(f"   - Sync Rules: {len(sync_rules_tables)} جدول")
    print(f"   - PowerSync Schema: {len(power_sync_tables)} جدول")
    print(f"   - Supabase Schema: {len(supabase_tables)} جدول\n")
    
    issues = []
    warnings = []
    matches = []
    
    # مقارنة كل جدول في Sync Rules
    for table_name, sync_columns in sync_rules_tables.items():
        print(f"\n📋 جدول: {table_name}")
        print(f"   📊 عدد الأعمدة في Sync Rules: {len(sync_columns)}")
        
        # البحث عن الجدول في PowerSync Schema
        power_sync_name = None
        power_sync_columns = None
        
        # البحث بالاسم المباشر أو snake_case
        if table_name in power_sync_tables:
            power_sync_name = table_name
            power_sync_columns = power_sync_tables[table_name]
        else:
            # البحث عن تطابق في الأسماء
            for ps_name in power_sync_tables.keys():
                if ps_name.lower() == table_name.lower() or ps_name.replace('_', '') == table_name.replace('_', ''):
                    power_sync_name = ps_name
                    power_sync_columns = power_sync_tables[ps_name]
                    break
        
        # البحث عن الجدول في Supabase
        supabase_columns = supabase_tables.get(table_name)
        
        if not power_sync_name:
            issue = f"❌ الجدول '{table_name}' غير موجود في PowerSync Schema"
            issues.append(issue)
            print(f"   ⚠️  {issue}")
        else:
            print(f"   ✅ موجود في PowerSync Schema باسم: {power_sync_name}")
            
            # مقارنة الأعمدة
            sync_cols_normalized = {normalize_column_name(c): c for c in sync_columns}
            ps_cols_normalized = {normalize_column_name(c): c for c in power_sync_columns}
            
            missing_in_schema = []
            for sync_col_norm, sync_col_orig in sync_cols_normalized.items():
                if sync_col_norm not in ps_cols_normalized:
                    missing_in_schema.append(sync_col_orig)
            
            extra_in_schema = []
            for ps_col_norm, ps_col_orig in ps_cols_normalized.items():
                if ps_col_norm not in sync_cols_normalized:
                    extra_in_schema.append(ps_col_orig)
            
            if missing_in_schema:
                issue = f"❌ أعمدة مفقودة في PowerSync Schema للجدول '{table_name}': {', '.join(missing_in_schema)}"
                issues.append(issue)
                print(f"   ⚠️  {issue}")
            
            if extra_in_schema:
                warning = f"⚠️  أعمدة إضافية في PowerSync Schema للجدول '{table_name}': {', '.join(extra_in_schema)}"
                warnings.append(warning)
                print(f"   ℹ️  {warning}")
            
            print(f"   📊 عدد الأعمدة في Schema: {len(power_sync_columns)}")
        
        if not supabase_columns:
            issue = f"❌ الجدول '{table_name}' غير موجود في Supabase"
            issues.append(issue)
            print(f"   ⚠️  {issue}")
        else:
            print(f"   ✅ موجود في Supabase")
            
            # مقارنة الأعمدة مع Supabase
            sync_cols_normalized = {normalize_column_name(c): c for c in sync_columns}
            supabase_cols_normalized = {normalize_column_name(c): c for c in supabase_columns}
            
            missing_in_supabase = []
            for sync_col_norm, sync_col_orig in sync_cols_normalized.items():
                if sync_col_norm not in supabase_cols_normalized:
                    missing_in_supabase.append(sync_col_orig)
            
            if missing_in_supabase:
                issue = f"❌ أعمدة مفقودة في Supabase للجدول '{table_name}': {', '.join(missing_in_supabase)}"
                issues.append(issue)
                print(f"   ⚠️  {issue}")
            
            print(f"   📊 عدد الأعمدة في Supabase: {len(supabase_columns)}")
            
            # التحقق من المطابقة الكاملة
            if power_sync_columns and supabase_columns:
                sync_set = {normalize_column_name(c) for c in sync_columns}
                ps_set = {normalize_column_name(c) for c in power_sync_columns}
                supabase_set = {normalize_column_name(c) for c in supabase_columns}
                
                if sync_set == ps_set == supabase_set:
                    matches.append(table_name)
                    print(f"   ✅ مطابق تماماً!")
    
    # تقرير نهائي
    print('\n\n' + '=' * 80)
    print('📊 تقرير التحليل النهائي')
    print('=' * 80)
    
    if issues:
        print(f"\n❌ المشاكل ({len(issues)}):")
        for issue in issues:
            print(f"   {issue}")
    
    if warnings:
        print(f"\n⚠️  التحذيرات ({len(warnings)}):")
        for warning in warnings:
            print(f"   {warning}")
    
    if matches:
        print(f"\n✅ الجداول المطابقة تماماً ({len(matches)}):")
        for match in matches:
            print(f"   - {match}")
    
    if not issues and not warnings:
        print('\n✅ كل شيء مطابق! لا توجد مشاكل.')
    
    # حفظ التقرير
    report_lines = [
        'تقرير مطابقة Sync Rules مع PowerSync Schema و Supabase',
        '=' * 80,
        f'تاريخ التحليل: {Path(__file__).stat().st_mtime}',
        '',
        f'عدد الجداول في Sync Rules: {len(sync_rules_tables)}',
        f'عدد الجداول في PowerSync Schema: {len(power_sync_tables)}',
        f'عدد الجداول في Supabase: {len(supabase_tables)}',
        '',
    ]
    
    if issues:
        report_lines.append(f'\n❌ المشاكل ({len(issues)}):')
        report_lines.extend([f'   {issue}' for issue in issues])
    
    if warnings:
        report_lines.append(f'\n⚠️  التحذيرات ({len(warnings)}):')
        report_lines.extend([f'   {warning}' for warning in warnings])
    
    if matches:
        report_lines.append(f'\n✅ الجداول المطابقة ({len(matches)}):')
        report_lines.extend([f'   - {match}' for match in matches])
    
    report_path = BASE_DIR / 'sync_compatibility_report.txt'
    report_path.write_text('\n'.join(report_lines), encoding='utf-8')
    print(f'\n💾 تم حفظ التقرير في: {report_path}')
    
    return {
        'issues': issues,
        'warnings': warnings,
        'matches': matches,
        'sync_rules_tables': sync_rules_tables,
        'power_sync_tables': power_sync_tables,
        'supabase_tables': supabase_tables
    }

if __name__ == '__main__':
    try:
        result = compare_schemas()
    except Exception as e:
        print(f'❌ خطأ في التحليل: {e}')
        import traceback
        traceback.print_exc()
        exit(1)




















