-- جداول البيانات العالمية لياليدين
-- هذه البيانات مشتركة بين جميع المؤسسات

-- جدول الولايات العالمي (ثابت لجميع المؤسسات)
CREATE TABLE IF NOT EXISTS yalidine_provinces_global (
  id INT PRIMARY KEY,
  name TEXT NOT NULL,
  zone INT,
  is_deliverable BOOLEAN DEFAULT TRUE
);

-- جدول البلديات العالمي (ثابت لجميع المؤسسات)
CREATE TABLE IF NOT EXISTS yalidine_municipalities_global (
  id INT PRIMARY KEY,
  name TEXT NOT NULL,
  wilaya_id INT NOT NULL REFERENCES yalidine_provinces_global(id),
  wilaya_name TEXT NOT NULL,
  has_stop_desk BOOLEAN DEFAULT FALSE,
  is_deliverable BOOLEAN DEFAULT TRUE,
  delivery_time_parcel INT,
  delivery_time_payment INT
);

-- جدول مكاتب التوصيل العالمي (ثابت لجميع المؤسسات)
CREATE TABLE IF NOT EXISTS yalidine_centers_global (
  center_id INT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  gps TEXT,
  commune_id INT NOT NULL REFERENCES yalidine_municipalities_global(id),
  commune_name TEXT NOT NULL,
  wilaya_id INT NOT NULL REFERENCES yalidine_provinces_global(id),
  wilaya_name TEXT NOT NULL
);

-- جدول معلومات المزامنة العالمية
CREATE TABLE IF NOT EXISTS yalidine_global_info (
  id SERIAL PRIMARY KEY,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إضافة فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_municipalities_global_wilaya_id ON yalidine_municipalities_global(wilaya_id);
CREATE INDEX IF NOT EXISTS idx_centers_global_wilaya_id ON yalidine_centers_global(wilaya_id);
CREATE INDEX IF NOT EXISTS idx_centers_global_commune_id ON yalidine_centers_global(commune_id); 