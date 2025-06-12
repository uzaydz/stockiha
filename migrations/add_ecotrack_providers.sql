-- إضافة شركات التوصيل التي تستخدم تكامل Ecotrack في CourierDZ
-- Migration to add Ecotrack-integrated delivery providers

-- إضافة شركات التوصيل الجديدة
INSERT INTO shipping_providers (code, name, base_url, is_active)
VALUES 
  ('anderson_delivery', 'Anderson Delivery', 'https://anderson.ecotrack.dz/', true),
  ('areex', 'أريكس', 'https://areex.ecotrack.dz/', true),
  ('ba_consult', 'BA Consult', 'https://baconsult.ecotrack.dz/', true),
  ('conexlog', 'كونكسلوغ', 'https://conexlog.ecotrack.dz/', true),
  ('coyote_express', 'Coyote Express', 'https://coyote.ecotrack.dz/', true),
  ('dhd', 'DHD', 'https://dhd.ecotrack.dz/', true),
  ('distazero', 'ديستازيرو', 'https://distazero.ecotrack.dz/', true),
  ('e48hr_livraison', 'E48HR Livraison', 'https://e48hr.ecotrack.dz/', true),
  ('fretdirect', 'فريت دايركت', 'https://fretdirect.ecotrack.dz/', true),
  ('golivri', 'غوليفري', 'https://golivri.ecotrack.dz/', true),
  ('mono_hub', 'Mono Hub', 'https://monohub.ecotrack.dz/', true),
  ('msm_go', 'MSM Go', 'https://msmgo.ecotrack.dz/', true),
  ('imir_express', 'إمير إكسبرس', 'https://imir.ecotrack.dz/', true),
  ('packers', 'باكرز', 'https://packers.ecotrack.dz/', true),
  ('prest', 'بريست', 'https://prest.ecotrack.dz/', true),
  ('rb_livraison', 'RB Livraison', 'https://rb.ecotrack.dz/', true),
  ('rex_livraison', 'ريكس ليفريزون', 'https://rex.ecotrack.dz/', true),
  ('rocket_delivery', 'Rocket Delivery', 'https://rocket.ecotrack.dz/', true),
  ('salva_delivery', 'سالفا ديليفري', 'https://salva.ecotrack.dz/', true),
  ('speed_delivery', 'سبيد ديليفري', 'https://speed.ecotrack.dz/', true),
  ('tsl_express', 'TSL Express', 'https://tsl.ecotrack.dz/', true),
  ('worldexpress', 'ورلد إكسبرس', 'https://worldexpress.ecotrack.dz/', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- تحديث الوقت للتأكد من صحة البيانات
UPDATE shipping_providers 
SET updated_at = NOW() 
WHERE code IN (
  'anderson_delivery', 'areex', 'ba_consult', 'conexlog', 'coyote_express', 
  'dhd', 'distazero', 'e48hr_livraison', 'fretdirect', 'golivri', 
  'mono_hub', 'msm_go', 'imir_express', 'packers', 'prest', 
  'rb_livraison', 'rex_livraison', 'rocket_delivery', 'salva_delivery', 
  'speed_delivery', 'tsl_express', 'worldexpress'
);

-- تسجيل رسالة في السجل
DO $$
BEGIN
  RAISE LOG 'تم إضافة 22 شركة توصيل جديدة تستخدم تكامل Ecotrack بنجاح';
END $$; 