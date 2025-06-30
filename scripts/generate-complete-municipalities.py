#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script محسن لجلب جميع بيانات البلديات من قاعدة البيانات على دفعات
"""

import json
import requests
import os
import time
from typing import List, Dict, Any

# إعدادات قاعدة البيانات
SUPABASE_URL = "https://wrnssatuvmumsczyldth.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY"

BATCH_SIZE = 1000  # حجم الدفعة

def fetch_municipalities_batch(offset: int = 0, limit: int = BATCH_SIZE) -> List[Dict[str, Any]]:
    """جلب دفعة من البلديات"""
    
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    url = f"{SUPABASE_URL}/rest/v1/yalidine_municipalities_global"
    params = {
        "select": "*",
        "order": "wilaya_id.asc,id.asc",
        "offset": offset,
        "limit": limit
    }
    
    try:
        print(f"📥 جلب الدفعة: {offset}-{offset + limit - 1}")
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        print(f"✅ تم جلب {len(data)} بلدية")
        return data
    except Exception as e:
        print(f"❌ خطأ في جلب الدفعة {offset}: {e}")
        return []

def fetch_all_municipalities() -> List[Dict[str, Any]]:
    """جلب جميع البلديات على دفعات"""
    
    all_municipalities = []
    offset = 0
    
    print("🚀 بدء جلب جميع البلديات...")
    
    while True:
        batch = fetch_municipalities_batch(offset, BATCH_SIZE)
        
        if not batch:
            print("✅ تم الانتهاء من جلب جميع البيانات")
            break
            
        all_municipalities.extend(batch)
        print(f"📊 إجمالي البلديات المجمعة: {len(all_municipalities)}")
        
        # إذا كانت الدفعة أقل من الحد المطلوب، فقد وصلنا للنهاية
        if len(batch) < BATCH_SIZE:
            print("✅ تم الوصول لآخر دفعة")
            break
            
        offset += BATCH_SIZE
        
        # تأخير قصير لتجنب الضغط على الخادم
        time.sleep(0.5)
    
    print(f"🎉 تم جلب {len(all_municipalities)} بلدية إجمالاً")
    return all_municipalities

def get_municipality_stats(municipalities: List[Dict[str, Any]]) -> Dict[str, Any]:
    """إحصائيات البلديات"""
    
    stats = {
        "total_municipalities": len(municipalities),
        "deliverable_count": len([m for m in municipalities if m.get('is_deliverable', True)]),
        "stop_desk_count": len([m for m in municipalities if m.get('has_stop_desk', False)]),
        "provinces_count": len(set(m.get('wilaya_id') for m in municipalities)),
        "provinces_with_municipalities": {}
    }
    
    # إحصائيات حسب الولاية
    for municipality in municipalities:
        wilaya_id = municipality.get('wilaya_id')
        if wilaya_id:
            if wilaya_id not in stats["provinces_with_municipalities"]:
                stats["provinces_with_municipalities"][wilaya_id] = {
                    "count": 0,
                    "name": municipality.get('wilaya_name', ''),
                    "deliverable": 0,
                    "stop_desk": 0
                }
            
            stats["provinces_with_municipalities"][wilaya_id]["count"] += 1
            
            if municipality.get('is_deliverable', True):
                stats["provinces_with_municipalities"][wilaya_id]["deliverable"] += 1
            
            if municipality.get('has_stop_desk', False):
                stats["provinces_with_municipalities"][wilaya_id]["stop_desk"] += 1
    
    return stats

def generate_typescript_file_complete(municipalities: List[Dict[str, Any]], output_path: str):
    """إنشاء ملف TypeScript للبلديات مع جميع البيانات"""
    
    print(f"📝 إنشاء ملف TypeScript: {output_path}")
    
    # بداية الملف
    ts_content = '''/**
 * بيانات البلديات الجزائرية الكاملة - مطابقة لهيكل yalidine_municipalities_global
 * تم إنشاء هذا الملف تلقائياً من قاعدة البيانات
 * 
 * إجمالي البلديات: {total_count}
 * آخر تحديث: {timestamp}
 */

export interface YalidineMunicipality {{
  id: number;
  name: string;
  wilaya_id: number;
  wilaya_name: string;
  has_stop_desk: boolean;
  is_deliverable: boolean;
  delivery_time_parcel: number | null;
  delivery_time_payment: number | null;
  name_ar: string | null;
  wilaya_name_ar: string | null;
}}

export const yalidineMunicipalities: YalidineMunicipality[] = [
'''.format(
        total_count=len(municipalities),
        timestamp=time.strftime("%Y-%m-%d %H:%M:%S")
    )
    
    # إضافة البيانات
    for i, municipality in enumerate(municipalities):
        ts_content += f'''  {{
    id: {municipality.get('id', 0)},
    name: {json.dumps(municipality.get('name', ''), ensure_ascii=False)},
    wilaya_id: {municipality.get('wilaya_id', 0)},
    wilaya_name: {json.dumps(municipality.get('wilaya_name', ''), ensure_ascii=False)},
    has_stop_desk: {str(municipality.get('has_stop_desk', False)).lower()},
    is_deliverable: {str(municipality.get('is_deliverable', True)).lower()},
    delivery_time_parcel: {municipality.get('delivery_time_parcel') or 'null'},
    delivery_time_payment: {municipality.get('delivery_time_payment') or 'null'},
    name_ar: {json.dumps(municipality.get('name_ar'), ensure_ascii=False) if municipality.get('name_ar') else 'null'},
    wilaya_name_ar: {json.dumps(municipality.get('wilaya_name_ar'), ensure_ascii=False) if municipality.get('wilaya_name_ar') else 'null'}
  }}'''
        
        # إضافة فاصلة إلا للعنصر الأخير
        if i < len(municipalities) - 1:
            ts_content += ','
        
        ts_content += '\n'
    
    # إنهاء المصفوفة وإضافة الدوال المساعدة
    ts_content += '''];

// دالة للحصول على بلدية حسب المعرف
export const getMunicipalityById = (id: number): YalidineMunicipality | undefined => {
  return yalidineMunicipalities.find(municipality => municipality.id === id);
};

// دالة للحصول على البلديات حسب معرف الولاية
export const getMunicipalitiesByWilayaId = (wilayaId: number): YalidineMunicipality[] => {
  return yalidineMunicipalities.filter(municipality => municipality.wilaya_id === wilayaId);
};

// دالة للحصول على البلديات القابلة للتسليم فقط
export const getDeliverableMunicipalities = (): YalidineMunicipality[] => {
  return yalidineMunicipalities.filter(municipality => municipality.is_deliverable);
};

// دالة للحصول على البلديات التي لديها مكتب استقبال
export const getMunicipalitiesWithStopDesk = (): YalidineMunicipality[] => {
  return yalidineMunicipalities.filter(municipality => municipality.has_stop_desk);
};

// دالة للبحث في البلديات حسب الاسم
export const searchMunicipalitiesByName = (searchTerm: string): YalidineMunicipality[] => {
  const term = searchTerm.toLowerCase();
  return yalidineMunicipalities.filter(municipality => 
    municipality.name.toLowerCase().includes(term) ||
    (municipality.name_ar && municipality.name_ar.includes(searchTerm))
  );
};

// دالة للحصول على إحصائيات البلديات حسب الولاية
export const getMunicipalityStatsByWilaya = () => {
  const stats: Record<number, { count: number; name: string; deliverable: number; stopDesk: number }> = {};
  
  yalidineMunicipalities.forEach(municipality => {
    const wilayaId = municipality.wilaya_id;
    if (!stats[wilayaId]) {
      stats[wilayaId] = {
        count: 0,
        name: municipality.wilaya_name,
        deliverable: 0,
        stopDesk: 0
      };
    }
    
    stats[wilayaId].count++;
    if (municipality.is_deliverable) stats[wilayaId].deliverable++;
    if (municipality.has_stop_desk) stats[wilayaId].stopDesk++;
  });
  
  return stats;
};

// دالة للحصول على جميع الولايات المتوفرة
export const getAvailableWilayas = () => {
  const wilayas = new Map();
  
  yalidineMunicipalities.forEach(municipality => {
    if (!wilayas.has(municipality.wilaya_id)) {
      wilayas.set(municipality.wilaya_id, {
        id: municipality.wilaya_id,
        name: municipality.wilaya_name,
        name_ar: municipality.wilaya_name_ar
      });
    }
  });
  
  return Array.from(wilayas.values()).sort((a, b) => a.id - b.id);
};

export default yalidineMunicipalities;
'''
    
    # كتابة الملف
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(ts_content)
        print(f"✅ تم إنشاء ملف البلديات الكامل: {output_path}")
        return True
    except Exception as e:
        print(f"❌ خطأ في كتابة الملف: {e}")
        return False

def main():
    """الدالة الرئيسية"""
    print("🚀 بدء جلب جميع بيانات البلديات...")
    
    # جلب جميع البلديات
    municipalities = fetch_all_municipalities()
    
    if not municipalities:
        print("❌ لم يتم جلب أي بيانات")
        return
    
    # طباعة الإحصائيات
    stats = get_municipality_stats(municipalities)
    print("\n📊 إحصائيات البيانات المجمعة:")
    print(f"• إجمالي البلديات: {stats['total_municipalities']}")
    print(f"• البلديات القابلة للتسليم: {stats['deliverable_count']}")
    print(f"• البلديات التي لها مكتب: {stats['stop_desk_count']}")
    print(f"• عدد الولايات: {stats['provinces_count']}")
    
    # طباعة أول 5 ولايات كعينة
    print("\n🏛️ عينة من الولايات:")
    for wilaya_id, info in list(stats["provinces_with_municipalities"].items())[:5]:
        print(f"• {info['name']} ({wilaya_id}): {info['count']} بلدية")
    
    # إنشاء الملف الجديد
    output_path = "src/data/yalidine-municipalities-complete.ts"
    success = generate_typescript_file_complete(municipalities, output_path)
    
    if success:
        print(f"\n✨ تم الانتهاء بنجاح!")
        print(f"📁 الملف الجديد: {output_path}")
        print(f"📊 إجمالي البلديات: {len(municipalities)}")
        print("\n🔄 لاستخدام الملف الجديد، قم بتحديث imports في ProductFormRenderer.tsx")
    else:
        print("❌ فشل في إنشاء الملف")

if __name__ == "__main__":
    main() 