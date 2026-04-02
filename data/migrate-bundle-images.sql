-- =====================================================
-- MIGRACIÓN: Corregir paths inválidos en bundle_images
-- =====================================================

-- Verificar paths inválidos antes de corregir
SELECT 
  id,
  bundle_id,
  image_path,
  CASE 
    WHEN image_path LIKE 'http%' THEN '✗ URL completa'
    WHEN image_path LIKE 'bundles/%' THEN '✓ Path correcto'
    ELSE '✗ Path inválido'
  END as status
FROM bundle_images
ORDER BY created_at DESC;

-- Corregir paths que no empiezan con 'bundles/'
-- pero solo si parecen ser nombres de archivo (no URLs completas)
UPDATE bundle_images
SET image_path = CONCAT('bundles/', bundle_id, '/', image_path)
WHERE image_path NOT LIKE 'bundles/%'
  AND image_path NOT LIKE 'http%';

-- Verificar después de corregir
SELECT 
  id,
  bundle_id,
  image_path,
  CASE 
    WHEN image_path LIKE 'bundles/%' THEN '✓ Corregido'
    ELSE '✗ Sin corregir'
  END as status
FROM bundle_images
ORDER BY created_at DESC;

-- Eliminar registros con URLs completas inválidas (si las hay)
-- Descomentar solo si es necesario
-- DELETE FROM bundle_images WHERE image_path LIKE 'http%';

-- Actualizar bundles.image_path si tiene paths inválidos
UPDATE bundles
SET image_path = CONCAT('bundles/', id, '/', image_path)
WHERE image_path IS NOT NULL
  AND image_path != ''
  AND image_path NOT LIKE 'bundles/%'
  AND image_path NOT LIKE 'http%';
