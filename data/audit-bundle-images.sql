-- ============================================
-- AUDITORÍA: Imágenes de Bundles Faltantes
-- ============================================
-- Este script identifica bundles cuyo image_path NO existe en el bucket
-- y los marca para corrección.
--
-- EJECUCIÓN EN SUPERBASE:
-- 1. Ir a SQL Editor
-- 2. Ejecutar este script
-- 3. Revisar resultados
-- ============================================

-- Paso 1: Listar bundles con sus image_path
SELECT 
  id,
  name,
  image_path,
  CASE 
    WHEN image_path IS NULL THEN '⚠️ Sin imagen'
    WHEN image_path NOT LIKE 'bundles/%' THEN '❌ Formato inválido'
    WHEN image_path LIKE '%supabase.co%' THEN '❌ Tiene URL en lugar de filePath'
    ELSE '✓ Formato correcto'
  END as estado_formato
FROM bundles
ORDER BY created_at DESC;

-- Paso 2: Bundles que necesitan corrección (image_path = NULL)
-- Ejecutar SOLO si estás seguro de que las imágenes no existen
/*
UPDATE bundles
SET image_path = NULL
WHERE image_path IS NOT NULL 
  AND NOT EXISTS (
    -- Aquí deberías verificar contra el storage real
    -- Esto es solo un ejemplo de estructura
    SELECT 1 FROM storage.objects 
    WHERE bucket_id = 'bundle-images' 
      AND name = replace(bundles.image_path, 'bundles/', '')
  );
*/

-- Paso 3: Verificar si el bucket existe y tiene archivos
SELECT 
  bucket_id,
  COUNT(*) as cantidad_archivos
FROM storage.objects
WHERE bucket_id = 'bundle-images'
GROUP BY bucket_id;

-- Paso 4: Listar archivos reales en el bucket
SELECT 
  name as filename,
  'bundles/' || name as full_path,
  metadata->>'size' as file_size,
  created_at
FROM storage.objects
WHERE bucket_id = 'bundle-images'
ORDER BY created_at DESC;

-- Paso 5: Detectar inconsistencias (requiere verificar archivo por archivo)
-- Este query muestra bundles cuyo filePath podría no existir
SELECT 
  b.id,
  b.name,
  b.image_path,
  CASE 
    WHEN o.name IS NOT NULL THEN '✓ Archivo existe'
    ELSE '❌ ARCHIVO FALTANTE'
  END as estado_archivo
FROM bundles b
LEFT JOIN storage.objects o 
  ON o.bucket_id = 'bundle-images' 
  AND o.name = replace(b.image_path, 'bundles/', '')
WHERE b.image_path IS NOT NULL
  AND b.image_path LIKE 'bundles/%'
ORDER BY 
  CASE WHEN o.name IS NULL THEN 0 ELSE 1 END,
  b.created_at DESC;

-- ============================================
-- RESULTADO ESPERADO:
-- - Lista de bundles con archivos faltantes
-- - Bundles válidos que sí tienen archivos
-- ============================================

-- Paso 6: Corrección automática (OPCIONAL - USAR CON PRECAUCIÓN)
/*
-- Backup primero
CREATE TABLE bundles_backup_before_cleanup AS 
SELECT * FROM bundles;

-- Setear a NULL las imágenes que no existen
UPDATE bundles
SET image_path = NULL
FROM storage.objects o
WHERE bundles.image_path IS NOT NULL
  AND bundles.image_path LIKE 'bundles/%'
  AND o.bucket_id = 'bundle-images'
  AND o.name = replace(bundles.image_path, 'bundles/', '')
  AND o.name IS NULL;  -- Solo si NO existe el archivo
*/

-- ============================================
-- NOTA: Para una auditoría completa, se recomienda
-- usar el script de Node.js que verifica archivo por archivo
-- ============================================
