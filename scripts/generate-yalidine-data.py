#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script لجلب بيانات البلديات من قاعدة البيانات Supabase وإنشاء ملف TypeScript
"""

import json
import requests
import os
from typing import List, Dict, Any

# إعدادات قاعدة البيانات
SUPABASE_URL = "https://wrnssatuvmumsczyldth.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY"

def fetch_municipalities_data() -> List[Dict[str, Any]]:
    """جلب جميع بيانات البلديات من قاعدة البيانات"""
    
    # محاولة الاتصال بقاعدة البيانات
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    # جلب البيانات - بدون حد أقصى للحصول على جميع البلديات
    url = f"{SUPABASE_URL}/rest/v1/yalidine_municipalities_global"
    params = {
        "select": "*",
        "order": "wilaya_id.asc,id.asc",
        "limit": "2000"  # حد أقصى عالي للتأكد من جلب جميع البيانات
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"خطأ في جلب البيانات: {e}")
        return []

def generate_typescript_file(municipalities: List[Dict[str, Any]], output_path: str):
    """إنشاء ملف TypeScript للبلديات"""
    
    # بداية الملف
    ts_content = '''/**
 * بيانات البلديات الجزائرية - مطابقة لهيكل yalidine_municipalities_global
 * تم إنشاء هذا الملف تلقائياً من قاعدة البيانات
 */

export interface YalidineMunicipality {
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
}

export const yalidineMunicipalities: YalidineMunicipality[] = [
'''
    
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

export default yalidineMunicipalities;
'''
    
    # كتابة الملف
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(ts_content)
        print(f"✅ تم إنشاء ملف البلديات بنجاح: {output_path}")
        print(f"📊 عدد البلديات المضافة: {len(municipalities)}")
    except Exception as e:
        print(f"❌ خطأ في كتابة الملف: {e}")

def generate_from_manual_data():
    """إنشاء ملف البلديات من البيانات المجمعة يدوياً (في حالة عدم توفر اتصال قاعدة البيانات)"""
    
    # البيانات التي جمعناها سابقاً (500 الأولى)
    sample_municipalities = [
        {
            "id": 101,
            "name": "Adrar",
            "wilaya_id": 1,
            "wilaya_name": "Adrar",
            "has_stop_desk": True,
            "is_deliverable": True,
            "delivery_time_parcel": 15,
            "delivery_time_payment": 5,
            "name_ar": None,
            "wilaya_name_ar": None
        },
        {
            "id": 102,
            "name": "Tamest",
            "wilaya_id": 1,
            "wilaya_name": "Adrar",
            "has_stop_desk": False,
            "is_deliverable": True,
            "delivery_time_parcel": 15,
            "delivery_time_payment": 5,
            "name_ar": None,
            "wilaya_name_ar": None
        },
        # يمكن إضافة باقي البيانات هنا...
    ]
    
    print("⚠️  استخدام البيانات النموذجية...")
    print("❗ للحصول على البيانات الكاملة، يرجى تحديث إعدادات قاعدة البيانات في السكريبت")
    
    return sample_municipalities

def main():
    """الدالة الرئيسية"""
    print("🚀 بدء جلب بيانات البلديات...")
    
    # تحديد مسار الملف
    output_path = "src/data/yalidine-municipalities.ts"
    
    # محاولة جلب البيانات من قاعدة البيانات
    if SUPABASE_URL != "YOUR_SUPABASE_URL" and SUPABASE_ANON_KEY != "YOUR_SUPABASE_ANON_KEY":
        municipalities = fetch_municipalities_data()
        if not municipalities:
            print("❌ فشل في جلب البيانات من قاعدة البيانات")
            municipalities = generate_from_manual_data()
    else:
        print("⚠️  لم يتم تحديد إعدادات قاعدة البيانات")
        municipalities = generate_from_manual_data()
    
    # إنشاء الملف
    if municipalities:
        generate_typescript_file(municipalities, output_path)
        print("✨ تم الانتهاء بنجاح!")
    else:
        print("❌ لا توجد بيانات لإنشاء الملف")

if __name__ == "__main__":
    main() 