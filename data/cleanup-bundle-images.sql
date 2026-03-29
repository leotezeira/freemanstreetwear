-- ============================================
-- LIMPIEZA: Eliminar tabla bundle_images
-- ============================================
-- Las imágenes de bundles usarán el campo image_path
-- directamente en la tabla bundles (igual que products)
-- ============================================

-- 1. Eliminar tabla bundle_images (si existe)
DROP TABLE IF EXISTS bundle_images CASCADE;

-- 2. Verificar que la columna image_path existe en bundles
-- (ya debería existir)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bundles' 
  AND column_name = 'image_path';

-- 3. Listo! Ahora bundles funciona igual que products:
--    - image_path guarda el path relativo: "bundles/{uuid}.png"
--    - Al leer, se genera signed URL
--    - No requiere tabla separada
-- ============================================
