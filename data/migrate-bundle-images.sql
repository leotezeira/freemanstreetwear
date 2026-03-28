-- ============================================
-- MIGRACIÓN: Corregir image_path en bundles
-- ============================================
-- Este script convierte las URLs firmadas guardadas en image_path
-- a filePaths puros para el nuevo sistema de imágenes.
--
-- ANTES: https://xyz.supabase.co/storage/v1/object/sign/bundle-images/bundles/abc123.webp?token=...
-- DESPUÉS: bundles/abc123.webp
-- ============================================

-- Actualizar bundles que tienen URLs firmadas guardadas
UPDATE bundles
SET image_path = CONCAT(
  'bundles/',
  -- Extraer el filename desde la URL firmada
  SPLIT_PART(
    SPLIT_PART(image_path, '/bundles/', 2),  -- Obtener todo después de '/bundles/'
    '?', 1  -- Obtener solo la parte antes del '?' (quitar token)
  )
)
WHERE image_path LIKE '%/bundles/%' 
  AND image_path NOT LIKE 'bundles/%';

-- Verificar resultados
SELECT 
  id,
  name,
  image_path,
  CASE 
    WHEN image_path LIKE 'bundles/%.webp' THEN '✓ Correcto'
    WHEN image_path LIKE '%supabase.co%' THEN '✗ Todavía tiene URL'
    ELSE '? Otro formato'
  END as estado
FROM bundles
ORDER BY created_at DESC;

-- ============================================
-- NOTA: Después de ejecutar este script:
-- 1. Verificar que todas las imágenes tengan el formato 'bundles/xxx.webp'
-- 2. Las imágenes se generarán correctamente con createSignedBundleImageUrl()
-- ============================================
