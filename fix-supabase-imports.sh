#!/bin/bash

# إصلاح جميع imports من getSupabaseClient إلى supabase
find /Users/gherbitravel/Downloads/bazaar-console-connect-3/src -name "*.ts" -o -name "*.tsx" | while read file; do
    # استبدال import
    sed -i '' 's/import { getSupabaseClient } from /@/lib/@supabase@;/import { supabase } from @/lib/@supabase@;/g' "$file"
    
    # استبدال الاستخدامات
    sed -i '' 's/getSupabaseClient()/supabase/g' "$file"
    sed -i '' 's/await getSupabaseClient()/supabase/g' "$file"
    sed -i '' 's/const supabaseClient = await getSupabaseClient();/const supabaseClient = supabase;/g' "$file"
    sed -i '' 's/const client = getSupabaseClient();/const client = supabase;/g' "$file"
done

echo "تم إصلاح جميع الملفات!"