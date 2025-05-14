-- Actualización de la base de datos para añadir soporte para la provincia de origen en Yalidine
-- Este script modifica la tabla shipping_provider_settings para que incluya la provincia de origen
-- en el campo JSONB settings

-- Crear una función que añade el campo origin_wilaya_id al campo settings si no existe
CREATE OR REPLACE FUNCTION add_origin_wilaya_to_yalidine_settings()
RETURNS void AS $$
DECLARE
    yalidine_id INTEGER;
BEGIN
    -- Obtener el ID del proveedor Yalidine
    SELECT id INTO yalidine_id FROM shipping_providers WHERE code = 'yalidine';
    
    -- Crea la función que actualiza el campo settings si no existe
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_origin_wilaya_id_to_settings') THEN
        EXECUTE format('
        CREATE OR REPLACE FUNCTION add_origin_wilaya_id_to_settings()
        RETURNS trigger AS $inner_func$
        DECLARE
            yalidine_provider_id INTEGER := %s;
        BEGIN
            -- Verificar si el proveedor es Yalidine
            IF NEW.provider_id = yalidine_provider_id THEN
                -- Si settings es NULL, inicializa como un objeto vacío
                IF NEW.settings IS NULL THEN
                    NEW.settings := ''{}'':jsonb;
                END IF;
            END IF;
            
            -- Devolver el registro actualizado
            RETURN NEW;
        END;
        $inner_func$ LANGUAGE plpgsql;
        ', yalidine_id);
    END IF;

    -- Crear el trigger que se ejecuta antes de insertar o actualizar
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'ensure_yalidine_settings_has_origin_wilaya') THEN
        EXECUTE '
            CREATE TRIGGER ensure_yalidine_settings_has_origin_wilaya
            BEFORE INSERT OR UPDATE ON shipping_provider_settings
            FOR EACH ROW
            EXECUTE FUNCTION add_origin_wilaya_id_to_settings()
        ';
    END IF;

    -- Añadir documentación sobre el campo origin_wilaya_id en el esquema
    COMMENT ON COLUMN shipping_provider_settings.settings IS 'JSON con configuraciones adicionales. Para Yalidine, incluye origin_wilaya_id (ID de la provincia de origen)';
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la función principal
SELECT add_origin_wilaya_to_yalidine_settings();

-- Si ya existen registros en la tabla, actualizar para añadir el campo settings si es NULL
UPDATE shipping_provider_settings 
SET settings = '{}'::jsonb 
WHERE settings IS NULL 
  AND provider_id = (SELECT id FROM shipping_providers WHERE code = 'yalidine');

-- Crear vista para facilitar la consulta de configuraciones de Yalidine con la provincia de origen
CREATE OR REPLACE VIEW yalidine_settings_with_origin AS
SELECT 
    s.id,
    s.organization_id,
    s.is_enabled,
    s.api_token,
    s.api_key,
    s.auto_shipping,
    s.track_updates,
    s.settings,
    (s.settings->>'origin_wilaya_id')::integer as origin_wilaya_id,
    p.name as origin_wilaya_name,
    p.zone as origin_wilaya_zone
FROM 
    shipping_provider_settings s
LEFT JOIN 
    yalidine_provinces p ON (s.settings->>'origin_wilaya_id')::integer = p.id AND p.organization_id = s.organization_id
WHERE 
    s.provider_id = (SELECT id FROM shipping_providers WHERE code = 'yalidine');

-- Crear función para calcular el costo de envío entre provincias
-- Basado en la zona de origen y destino
CREATE OR REPLACE FUNCTION calculate_yalidine_shipping_cost(
    org_id UUID,
    origin_province_id INTEGER,
    destination_province_id INTEGER,
    parcel_weight DECIMAL DEFAULT 1.0
)
RETURNS DECIMAL AS $$
DECLARE
    origin_zone INTEGER;
    destination_zone INTEGER;
    base_cost DECIMAL := 500.0; -- Costo base en dinares argelinos
    zone_multiplier DECIMAL := 1.0;
    weight_multiplier DECIMAL := 1.0;
BEGIN
    -- Obtener zonas de las provincias
    SELECT zone INTO origin_zone 
    FROM yalidine_provinces 
    WHERE organization_id = org_id AND id = origin_province_id;
    
    SELECT zone INTO destination_zone 
    FROM yalidine_provinces 
    WHERE organization_id = org_id AND id = destination_province_id;
    
    -- Verificar si se encontraron las zonas
    IF origin_zone IS NULL OR destination_zone IS NULL THEN
        RETURN NULL; -- No se pueden encontrar las provincias
    END IF;
    
    -- Calcular multiplicador basado en las zonas
    IF origin_zone = destination_zone THEN
        zone_multiplier := 1.0; -- Misma zona
    ELSIF ABS(origin_zone - destination_zone) = 1 THEN
        zone_multiplier := 1.5; -- Zonas adyacentes
    ELSE
        zone_multiplier := 2.0; -- Zonas distantes
    END IF;
    
    -- Ajustar por peso
    IF parcel_weight > 1.0 THEN
        weight_multiplier := parcel_weight;
    END IF;
    
    -- Calcular costo final
    RETURN ROUND(base_cost * zone_multiplier * weight_multiplier);
END;
$$ LANGUAGE plpgsql; 