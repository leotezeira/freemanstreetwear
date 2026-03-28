-- ============================================
-- MIGRACIÓN: BUNDLES A NIVEL DE PRODUCTOS
-- ============================================
-- Esta migración actualiza el sistema de bundles para trabajar
-- a nivel de productos en lugar de variantes específicas.
-- ============================================

-- 1. Agregar columnas min_items y max_items a bundles
ALTER TABLE bundles 
ADD COLUMN IF NOT EXISTS min_items INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_items INTEGER DEFAULT 1;

-- 2. Eliminar columna variant_id de bundle_items (si existe)
-- Primero verificamos si la columna existe
DO $$ 
BEGIN 
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bundle_items' AND column_name = 'variant_id'
  ) THEN
    ALTER TABLE bundle_items DROP COLUMN variant_id;
  END IF;
END $$;

-- 3. Actualizar bundles existentes con valores por defecto
-- min_items = max_items = cantidad de items en el bundle
UPDATE bundles b
SET 
  min_items = (SELECT COUNT(*) FROM bundle_items WHERE bundle_id = b.id),
  max_items = (SELECT COUNT(*) FROM bundle_items WHERE bundle_id = b.id)
WHERE min_items IS NULL OR max_items IS NULL;

-- 4. Asegurar que las columnas no sean nulas
ALTER TABLE bundles 
ALTER COLUMN min_items SET NOT NULL,
ALTER COLUMN max_items SET NOT NULL;

-- 5. Agregar constraint para validar min_items <= max_items
ALTER TABLE bundles DROP CONSTRAINT IF EXISTS check_min_max_items;
ALTER TABLE bundles ADD CONSTRAINT check_min_max_items CHECK (min_items <= max_items);

-- ============================================
-- ÍNDICES PARA MEJORAR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_bundle_items_product_id ON bundle_items(product_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle_id ON bundle_items(bundle_id);

-- ============================================
-- COMENTARIOS EN LAS COLUMNAS
-- ============================================

COMMENT ON COLUMN bundles.min_items IS 'Cantidad mínima de productos que debe elegir el cliente';
COMMENT ON COLUMN bundles.max_items IS 'Cantidad máxima de productos que puede elegir el cliente';
COMMENT ON COLUMN bundle_items.quantity IS 'Cantidad de este producto que viene en el bundle';
