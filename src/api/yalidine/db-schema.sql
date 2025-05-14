-- إنشاء جدول للولايات
CREATE TABLE IF NOT EXISTS yalidine_provinces (
  id INTEGER NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR NOT NULL,
  zone INTEGER,
  is_deliverable BOOLEAN DEFAULT TRUE,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, organization_id)
);

-- إنشاء فهرس للولايات
CREATE INDEX IF NOT EXISTS idx_yalidine_provinces_org ON yalidine_provinces(organization_id);

-- إنشاء جدول للبلديات
CREATE TABLE IF NOT EXISTS yalidine_municipalities (
  id INTEGER NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR NOT NULL,
  wilaya_id INTEGER NOT NULL,
  wilaya_name VARCHAR,
  has_stop_desk BOOLEAN DEFAULT FALSE,
  is_deliverable BOOLEAN DEFAULT TRUE,
  delivery_time_parcel INTEGER,
  delivery_time_payment INTEGER,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, organization_id)
);

-- إنشاء فهرس للبلديات
CREATE INDEX IF NOT EXISTS idx_yalidine_municipalities_org ON yalidine_municipalities(organization_id);
CREATE INDEX IF NOT EXISTS idx_yalidine_municipalities_wilaya ON yalidine_municipalities(wilaya_id, organization_id);

-- إنشاء جدول لمكاتب التوصيل
CREATE TABLE IF NOT EXISTS yalidine_centers (
  center_id INTEGER NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR NOT NULL,
  address VARCHAR,
  gps VARCHAR,
  commune_id INTEGER NOT NULL,
  commune_name VARCHAR,
  wilaya_id INTEGER NOT NULL,
  wilaya_name VARCHAR,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (center_id, organization_id)
);

-- إنشاء فهرس لمكاتب التوصيل
CREATE INDEX IF NOT EXISTS idx_yalidine_centers_org ON yalidine_centers(organization_id);
CREATE INDEX IF NOT EXISTS idx_yalidine_centers_commune ON yalidine_centers(commune_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_yalidine_centers_wilaya ON yalidine_centers(wilaya_id, organization_id);

-- إنشاء جدول لأسعار التوصيل
CREATE TABLE IF NOT EXISTS yalidine_fees (
  id SERIAL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  from_wilaya_id INTEGER NOT NULL,
  to_wilaya_id INTEGER NOT NULL,
  commune_id INTEGER NOT NULL,
  from_wilaya_name VARCHAR,
  to_wilaya_name VARCHAR,
  commune_name VARCHAR,
  zone INTEGER,
  retour_fee INTEGER,
  cod_percentage FLOAT,
  insurance_percentage FLOAT,
  oversize_fee INTEGER,
  express_home INTEGER,
  express_desk INTEGER,
  economic_home INTEGER,
  economic_desk INTEGER,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (organization_id, from_wilaya_id, to_wilaya_id, commune_id)
);

-- إنشاء فهرس لأسعار التوصيل
CREATE INDEX IF NOT EXISTS idx_yalidine_fees_org ON yalidine_fees(organization_id);
CREATE INDEX IF NOT EXISTS idx_yalidine_fees_route ON yalidine_fees(from_wilaya_id, to_wilaya_id, organization_id); 