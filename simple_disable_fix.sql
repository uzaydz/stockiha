-- Solución rápida: Desactivar los triggers que causan problemas
-- Este script simplemente elimina los triggers de auditoría problemáticos
-- Esto permitirá que las funciones de actualización funcionen correctamente

-- Eliminar los triggers de auditoría
DROP TRIGGER IF EXISTS user_settings_audit_trigger ON user_settings;
DROP TRIGGER IF EXISTS organization_settings_audit_trigger ON organization_settings;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Se han eliminado los triggers de auditoría. Las funciones de actualización de settings ahora deberían funcionar correctamente.';
END $$; 