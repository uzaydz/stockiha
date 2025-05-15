ALTER TABLE public.yalidine_centers_global
DROP COLUMN IF EXISTS gps;

ALTER TABLE public.yalidine_centers_global
ADD COLUMN lat double precision,
ADD COLUMN lng double precision;

-- Optional: Add a comment to describe the new columns
COMMENT ON COLUMN public.yalidine_centers_global.lat IS 'Latitude of the Yalidine center.';
COMMENT ON COLUMN public.yalidine_centers_global.lng IS 'Longitude of the Yalidine center.'; 