-- ============================================
-- CREACIÓN DE TABLA bundle_images
-- ============================================
-- Esta tabla permite múltiples imágenes por bundle
-- similar al sistema de productos
-- ============================================

-- Crear tabla bundle_images
CREATE TABLE IF NOT EXISTS bundle_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_bundle_sort_order UNIQUE (bundle_id, sort_order)
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_bundle_images_bundle_id ON bundle_images(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_images_is_primary ON bundle_images(is_primary);
CREATE INDEX IF NOT EXISTS idx_bundle_images_sort_order ON bundle_images(bundle_id, sort_order);

-- Comentario
COMMENT ON TABLE bundle_images IS 'Imágenes múltiples para bundles (similar a product_images)';
COMMENT ON COLUMN bundle_images.image_path IS 'Path relativo en Supabase Storage: bundles/{bundleId}/{uuid}.webp';
COMMENT ON COLUMN bundle_images.is_primary IS 'Indica si es la imagen principal del bundle';
COMMENT ON COLUMN bundle_images.sort_order IS 'Orden de las imágenes (0 = primera)';

-- ============================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE bundle_images ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden ver imágenes de bundles"
ON bundle_images FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar imágenes de bundles"
ON bundle_images FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar imágenes de bundles"
ON bundle_images FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar imágenes de bundles"
ON bundle_images FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- MIGRACIÓN DE DATOS EXISTENTES
-- ============================================
-- Migrar la imagen actual de bundles a bundle_images

INSERT INTO bundle_images (bundle_id, image_path, sort_order, is_primary)
SELECT 
  id as bundle_id,
  image_path,
  0 as sort_order,
  true as is_primary
FROM bundles
WHERE image_path IS NOT NULL AND image_path != ''
ON CONFLICT DO NOTHING;

-- Nota: Después de ejecutar esto, podés eliminar la columna image_path de bundles
-- ALTER TABLE bundles DROP COLUMN image_path;
